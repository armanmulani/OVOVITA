import { BetterAuthVerification } from '../models/betterAuthModels';

/**
 * The fixed OTP accepted when demo mode is explicitly enabled.
 *
 * This is the code documented in the README, so a client demo (or an
 * automated test) can sign in without a live SMS provider. It is only ever
 * honoured when `ALLOW_DEMO_OTP=true` — see `config.allowDemoOtp`.
 */
export const DEMO_OTP_CODE = '123456';

/** How many wrong attempts a verification row tolerates before it is dropped. */
const MAX_ATTEMPTS = 5;

/**
 * The stored verification value has the shape `<code>:<attempts>`, matching
 * Better Auth's own convention. See `verifyPhoneNumberOTP` in
 * `better-auth/dist/plugins/phone-number/routes.mjs`.
 */
const parseStoredCode = (value: string): string => String(value).split(':')[0];

/**
 * Builds a Better Auth `verifyOTP` hook that accepts BOTH the real
 * SMS-delivered code and — only in explicit demo mode — the fixed demo code.
 *
 * Better Auth replaces its own verification logic entirely when a `verifyOTP`
 * hook is registered, so this hook reimplements the parts that matter:
 *
 *  - the code must match the code Better Auth generated for this phone number
 *    (or the demo code, when demo mode is on);
 *  - the verification row must exist and must not have expired — a code is
 *    never valid without an outstanding request for that number;
 *  - wrong attempts are counted atomically against the row, and the row is
 *    deleted once the attempt budget is exhausted, so a wrong code cannot be
 *    brute-forced;
 *  - a successful verification consumes (atomically deletes) the row, so an
 *    OTP is strictly single-use even under concurrent submissions.
 *
 * Returning `false` here makes Better Auth raise `INVALID_OTP`, which the
 * auth controller surfaces to the client.
 */
export const createOtpVerifier = (allowDemoOtp: boolean) => {
  return async ({ phoneNumber, code }: { phoneNumber: string; code: string }): Promise<boolean> => {
    const existing = await BetterAuthVerification.findOne({ identifier: phoneNumber }).sort({
      createdAt: -1,
    });

    // No outstanding request for this number: there is nothing to verify
    // against, so the code is invalid. This also means the demo code cannot
    // be used to skip the "request an OTP" step.
    if (!existing) return false;

    if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
      await BetterAuthVerification.deleteOne({ _id: existing._id });
      return false;
    }

    const storedCode = parseStoredCode(existing.value);
    const matches = storedCode === code || (allowDemoOtp && code === DEMO_OTP_CODE);

    if (matches) {
      // Atomically consume the row. If another request consumed it first,
      // `findOneAndDelete` returns null and this attempt is rejected, so a
      // single OTP can never authorise two sessions.
      const consumed = await BetterAuthVerification.findOneAndDelete({ _id: existing._id });
      return Boolean(consumed);
    }

    // Wrong code: count the attempt atomically. The filter refuses to
    // increment once the budget is spent, and the row is then destroyed so
    // the same code cannot keep being retried against a fresh counter.
    //
    // Rows written before the `attempts` field existed have no value for it,
    // so the filter also matches a missing field — otherwise a legacy row
    // would fail the `$lt` comparison and be deleted on the first wrong guess
    // instead of being counted.
    const updated = await BetterAuthVerification.findOneAndUpdate(
      {
        _id: existing._id,
        $or: [{ attempts: { $lt: MAX_ATTEMPTS } }, { attempts: { $exists: false } }],
      },
      { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      await BetterAuthVerification.deleteOne({ _id: existing._id });
    }

    return false;
  };
};
