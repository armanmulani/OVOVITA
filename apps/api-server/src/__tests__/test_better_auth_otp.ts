/**
 * Verification script for the Better Auth phone OTP flow.
 *
 * Exercises the exact code paths the HTTP controller uses:
 *   1. auth.api.sendPhoneNumberOTP -> stores the code, calls the sendOTP hook
 *   2. auth.api.verifyPhoneNumber  -> validates the code, creates the user
 *
 * Run with: npx ts-node apps/api-server/src/__tests__/test_better_auth_otp.ts
 */
import mongoose from 'mongoose';
import { auth, toE164 } from '../config/better-auth';
import { User } from '../models/User';
import { config } from '../config';

const PHONE_10 = '9876543210';
const E164 = toE164(PHONE_10);

let capturedCode: string | null = null;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    process.exitCode = 1;
  }
};

const run = async () => {
  console.log('===============================================');
  console.log('Better Auth Phone OTP Verification');
  console.log('===============================================');

  await mongoose.connect(config.mongoUri);
  console.log(`[db] Connected to ${config.mongoUri}`);

  // Intercept the sendOTP hook output by monkey-patching the console logger
  // is not possible, so instead we read the code straight from the
  // verification collection after the send call.
  const sendResult = await auth.api.sendPhoneNumberOTP({
    body: { phoneNumber: E164 },
    headers: new Headers(),
  });
  console.log('[send]', JSON.stringify(sendResult));
  assert(!!sendResult, 'sendPhoneNumberOTP returned a result');

  const verification = await mongoose.connection
    .collection('betterauthverifications')
    .find({ identifier: E164 })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  assert(!!verification, `verification row persisted for ${E164}`);
  console.log(`[db] verification value: ${verification?.value}`);

  // The plugin stores the code as `${code}:0` (the trailing counter is the
  // number of verification attempts left).
  const rawCode = String(verification?.value || '');
  capturedCode = rawCode.split(':')[0];
  assert(/^\d{6}$/.test(capturedCode), `captured a 6-digit OTP (${capturedCode})`);

  // A wrong code must be rejected.
  let wrongRejected = false;
  try {
    await auth.api.verifyPhoneNumber({
      body: { phoneNumber: E164, code: '000000' },
      headers: new Headers(),
    });
  } catch (err: any) {
    wrongRejected = true;
    console.log(`[verify] wrong code rejected: ${err?.body?.code || err?.message}`);
  }
  assert(wrongRejected, 'an incorrect OTP is rejected');

  // The real code must be accepted and must create the Better Auth user.
  const verifyResult: any = await auth.api.verifyPhoneNumber({
    body: { phoneNumber: E164, code: capturedCode },
    headers: new Headers(),
  });
  assert(verifyResult?.status === true, 'verifyPhoneNumber reports success');
  assert(!!verifyResult?.user?.id, `Better Auth user created (${verifyResult?.user?.id})`);
  assert(
    verifyResult?.user?.phoneNumberVerified === true,
    'user is marked as phone-verified'
  );
  assert(!!verifyResult?.token, 'a session token is returned');
  console.log(`[verify] user: ${verifyResult?.user?.name} <${verifyResult?.user?.email}>`);

  // The user must exist in the Better Auth user collection.
  const baUser = await mongoose.connection
    .collection('betterauthusers')
    .findOne({ phoneNumber: E164 });
  assert(!!baUser, 'Better Auth user document exists in MongoDB');

  // The session must have been persisted.
  const session = await mongoose.connection
    .collection('betterauthsessions')
    .findOne({ userId: verifyResult?.user?.id });
  assert(!!session, 'Better Auth session document persisted');

  // The plugin stores the OTP as `${code}:${attemptsLeft}`; confirm the
  // consumed row is gone after a successful verification.
  const afterVerify = await mongoose.connection
    .collection('betterauthverifications')
    .countDocuments({ identifier: E164 });
  assert(afterVerify === 0, 'the OTP row is consumed after successful verification');

  // Re-verifying the same code must now fail.
  let replayRejected = false;
  try {
    await auth.api.verifyPhoneNumber({
      body: { phoneNumber: E164, code: capturedCode },
      headers: new Headers(),
    });
  } catch {
    replayRejected = true;
  }
  assert(replayRejected, 'a replayed OTP is rejected');

  console.log('===============================================');
  console.log(process.exitCode ? 'RESULT: FAILURES PRESENT' : 'RESULT: ALL CHECKS PASSED');
  console.log('===============================================');
};

run()
  .catch((err) => {
    console.error('[verify] fatal:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
