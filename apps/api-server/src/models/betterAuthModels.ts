import mongoose, { Schema, Model } from 'mongoose';

/**
 * Better Auth core table schemas.
 *
 * Better Auth ships adapters for Prisma, Drizzle, Kysely and the raw MongoDB
 * driver, but no Mongoose adapter. This project already runs Mongoose as its
 * primary ODM, so we define the core Better Auth tables as Mongoose models and
 * expose them through a custom adapter (see `config/better-auth-adapter.ts`).
 *
 * Field names here are the *physical* column names in MongoDB. Better Auth
 * maps its logical `id` field onto `_id` through the adapter's
 * `mapKeysTransformInput` / `mapKeysTransformOutput` config, exactly like the
 * official MongoDB adapter does.
 *
 * `_id` is declared explicitly as a String on every schema because Better Auth
 * identifiers are opaque strings (32-char random IDs by default) rather than
 * MongoDB ObjectIds.
 */

export interface BetterAuthUserFields {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthSessionFields {
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
}

export interface BetterAuthAccountFields {
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthVerificationFields {
  identifier: string;
  value: string;
  expiresAt: Date;
  /**
   * Number of failed verification attempts recorded against this row.
   *
   * Better Auth's own verifier encodes the counter inside `value` as
   * `<code>:<attempts>`, which requires a read-modify-write and is therefore
   * racy under concurrent submissions. Ovovita's custom verifier increments
   * this field with a single atomic `$inc` instead, and drops the row once
   * the attempt budget is spent.
   */
  attempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthRateLimitFields {
  key: string;
  count: number;
  lastRequest: number;
}

/**
 * `strict: false` is deliberate: Better Auth can be extended with
 * `user.additionalFields` and plugin schemas, and the adapter must be able to
 * persist fields this file does not know about at compile time.
 */
const baseOptions = { strict: false as const, timestamps: false as const };

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: null },
    phoneNumber: { type: String, default: null, unique: true, sparse: true, index: true },
    phoneNumberVerified: { type: Boolean, default: false },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseOptions
);

const SessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    userId: { type: String, required: true, index: true },
  },
  baseOptions
);

const AccountSchema = new Schema(
  {
    _id: { type: String, required: true },
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    idToken: { type: String, default: null },
    accessTokenExpiresAt: { type: Date, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    scope: { type: String, default: null },
    password: { type: String, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseOptions
);

const VerificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    identifier: { type: String, required: true, index: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseOptions
);

const RateLimitSchema = new Schema(
  {
    _id: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true },
    lastRequest: { type: Number, required: true },
  },
  baseOptions
);

/**
 * Reuse an already-compiled model when the file is re-imported (ts-node watch
 * mode) to avoid the `OverwriteModelError` mongoose throws on duplicate model
 * registration.
 */
const model = (name: string, schema: Schema): Model<any> =>
  (mongoose.models[name] as Model<any>) || mongoose.model(name, schema);

export const BetterAuthUser = model('BetterAuthUser', UserSchema);
export const BetterAuthSession = model('BetterAuthSession', SessionSchema);
export const BetterAuthAccount = model('BetterAuthAccount', AccountSchema);
export const BetterAuthVerification = model('BetterAuthVerification', VerificationSchema);
export const BetterAuthRateLimit = model('BetterAuthRateLimit', RateLimitSchema);

/**
 * Maps a Better Auth logical model name onto its Mongoose model.
 *
 * Better Auth resolves the physical collection name from
 * `options.<model>.modelName` and then applies `usePlural`. Because the
 * adapter always passes the already-resolved name, we match on both the
 * singular and plural forms to stay resilient to that transformation.
 */
export const betterAuthModels = {
  user: BetterAuthUser,
  session: BetterAuthSession,
  account: BetterAuthAccount,
  verification: BetterAuthVerification,
  rateLimit: BetterAuthRateLimit,
} as const;

export type BetterAuthModelName = keyof typeof betterAuthModels;

export const resolveBetterAuthModel = (name: string): Model<any> => {
  const key = (Object.keys(betterAuthModels) as BetterAuthModelName[]).find(
    (candidate) =>
      candidate.toLowerCase() === name.toLowerCase() ||
      `${candidate.toLowerCase()}s` === name.toLowerCase()
  );
  if (!key) {
    throw new Error(
      `[Better Auth Mongoose Adapter] Unknown model "${name}". ` +
        `Known models: ${Object.keys(betterAuthModels).join(', ')}.`
    );
  }
  return betterAuthModels[key] as Model<any>;
};
