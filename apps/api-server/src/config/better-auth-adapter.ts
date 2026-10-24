import { createAdapterFactory } from 'better-auth/adapters';
import type { Where } from 'better-auth/adapters';
import { resolveBetterAuthModel } from '../models/betterAuthModels';

/**
 * A Mongoose adapter for Better Auth.
 *
 * Better Auth ships adapters for Prisma, Drizzle, Kysely and the raw MongoDB
 * driver, but there is no Mongoose adapter. Ovovita runs Mongoose as its
 * primary ODM, so this adapter lets Better Auth reuse the same connection
 * pool, schemas and models as the rest of the API server.
 *
 * The implementation follows the contract of the official MongoDB adapter:
 *
 * - `id` <-> `_id` mapping is handled by Better Auth's adapter factory via
 *   `mapKeysTransformInput` / `mapKeysTransformOutput` (see better-auth.ts).
 * - Every `where` clause arrives already normalised by the factory: the
 *   logical field name has been resolved to the physical column name and the
 *   operator coerced to the Better Auth operator set.
 * - `create` receives the fully transformed document, so it can be passed
 *   straight to `Model.create()`.
 */

/** Escapes a string so it can be safely embedded in a RegExp. */
const escapeRegExp = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeRegExpForRegexpQuery = (value: unknown): string =>
  escapeRegExp(String(value ?? ''));

/**
 * Builds a MongoDB filter from Better Auth's normalised `where` clauses.
 *
 * Supports the full operator set exposed by `whereOperators`:
 * eq, ne, lt, lte, gt, gte, in, not_in, contains, starts_with, ends_with.
 */
const buildWhereFilter = (where?: Where[]): Record<string, any> => {
  if (!where || where.length === 0) return {};

  const andConditions: Record<string, any>[] = [];
  const orConditions: Record<string, any>[] = [];

  for (const clause of where) {
    const { field, value, operator = 'eq', connector = 'AND', mode = 'sensitive' } = clause;
    const insensitive = mode === 'insensitive';
    let condition: Record<string, any>;

    switch (operator) {
      case 'eq':
        condition = insensitive && typeof value === 'string'
          ? { [field]: { $regex: `^${escapeRegExpForRegexpQuery(value)}$`, $options: 'i' } }
          : { [field]: value };
        break;
      case 'ne':
        condition = insensitive && typeof value === 'string'
          ? { [field]: { $not: { $regex: `^${escapeRegExpForRegexpQuery(value)}$`, $options: 'i' } } }
          : { [field]: { $ne: value } };
        break;
      case 'lt':
        condition = { [field]: { $lt: value } };
        break;
      case 'lte':
        condition = { [field]: { $lte: value } };
        break;
      case 'gt':
        condition = { [field]: { $gt: value } };
        break;
      case 'gte':
        condition = { [field]: { $gte: value } };
        break;
      case 'in':
        condition = { [field]: { $in: Array.isArray(value) ? value : [value] } };
        break;
      case 'not_in':
        condition = { [field]: { $nin: Array.isArray(value) ? value : [value] } };
        break;
      case 'contains':
        condition = { [field]: { $regex: `.*${escapeRegExpForRegexpQuery(value)}.*`, ...(insensitive ? { $options: 'i' } : {}) } };
        break;
      case 'starts_with':
        condition = { [field]: { $regex: `^${escapeRegExpForRegexpQuery(value)}`, ...(insensitive ? { $options: 'i' } : {}) } };
        break;
      case 'ends_with':
        condition = { [field]: { $regex: `${escapeRegExpForRegexpQuery(value)}$`, ...(insensitive ? { $options: 'i' } : {}) } };
        break;
      default:
        throw new Error(`[Better Auth Mongoose Adapter] Unsupported operator: ${operator}`);
    }

    if (connector === 'OR') {
      orConditions.push(condition);
    } else {
      andConditions.push(condition);
    }
  }

  const filter: Record<string, any> = {};
  if (andConditions.length) filter.$and = andConditions;
  if (orConditions.length) filter.$or = orConditions;
  return filter;
};

/**
 * Mongoose writes `undefined` values as `null` for most path types, but
 * Better Auth distinguishes "field not set" from "field explicitly null".
 * Stripping `undefined` keys before a write keeps the document clean.
 */
const stripUndefined = (data: Record<string, any>): Record<string, any> => {
  const output: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) output[key] = value;
  }
  return output;
};

/**
 * Mongoose documents serialise to `{ _id, ...fields }`. Better Auth expects
 * the logical `id` key to be present on the returned object, but the factory
 * handles the `_id` -> `id` remap through `mapKeysTransformOutput`, so the raw
 * document is returned as-is.
 */
const toPlain = (doc: any): any => {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    const obj = doc.toObject({ depopulate: true });
    // Preserve `_id` as a string so Better Auth can map it back to `id`.
    if (obj._id && typeof obj._id !== 'string') obj._id = String(obj._id);
    return obj;
  }
  return doc;
};

export interface MongooseAdapterOptions {
  /**
   * Enables MongoDB transactions. Requires a replica set, so it stays off by
   * default to support standalone local MongoDB instances.
   */
  transaction?: boolean;
}

export const mongooseAdapter = (options: MongooseAdapterOptions = {}) =>
  createAdapterFactory({
    config: {
      adapterId: 'mongoose-adapter',
      adapterName: 'Mongoose Adapter',
      supportsBooleans: true,
      supportsDates: true,
      supportsJSON: true,
      supportsArrays: true,
      supportsNumericIds: false,
      supportsUUIDs: false,
      // Better Auth maps `id` onto MongoDB's `_id`; the Mongoose schemas
      // declare `_id` as a string so the mapping stays explicit.
      mapKeysTransformInput: { id: '_id' },
      mapKeysTransformOutput: { _id: 'id' },
      // Transactions are opt-in: a standalone MongoDB (the local dev default)
      // cannot run them.
      transaction: false,
    },
    adapter: () => ({
      async create({ model, data }: any) {
        const M = resolveBetterAuthModel(model);
        const payload = stripUndefined(data);
        const created = await M.create(payload);
        return toPlain(created);
      },

      async update({ model, where, update }: any) {
        const M = resolveBetterAuthModel(model);
        const filter = buildWhereFilter(where);
        const payload = stripUndefined(update);
        const updated = await M.findOneAndUpdate(filter, { $set: payload }, { new: true });
        return updated ? toPlain(updated) : null;
      },

      async updateMany({ model, where, update }: any) {
        const M = resolveBetterAuthModel(model);
        const filter = buildWhereFilter(where);
        const payload = stripUndefined(update);
        const result = await M.updateMany(filter, { $set: payload });
        return result.modifiedCount ?? 0;
      },

      async findOne({ model, where }: any) {
        const M = resolveBetterAuthModel(model);
        const filter = buildWhereFilter(where);
        const found = await M.findOne(filter);
        return found ? toPlain(found) : null;
      },

      async findMany({ model, where, limit, sortBy, offset }: any) {
        const M = resolveBetterAuthModel(model);
        const filter = buildWhereFilter(where);
        let query = M.find(filter);
        if (sortBy?.field) {
          query = query.sort({ [sortBy.field]: sortBy.direction === 'desc' ? -1 : 1 });
        }
        if (typeof offset === 'number' && offset > 0) query = query.skip(offset);
        if (typeof limit === 'number' && limit > 0) query = query.limit(limit);
        const docs = await query.exec();
        return docs.map(toPlain);
      },

      async delete({ model, where }: any) {
        const M = resolveBetterAuthModel(model);
        await M.deleteOne(buildWhereFilter(where));
      },

      async deleteMany({ model, where }: any) {
        const M = resolveBetterAuthModel(model);
        const result = await M.deleteMany(buildWhereFilter(where));
        return result.deletedCount ?? 0;
      },

      /**
       * Native atomic single-row delete. Used by Better Auth to consume a
       * one-time token / OTP in a single round trip, which is race-safe.
       */
      async consumeOne({ model, where }: any) {
        const M = resolveBetterAuthModel(model);
        const consumed = await M.findOneAndDelete(buildWhereFilter(where));
        return consumed ? toPlain(consumed) : null;
      },

      async count({ model, where }: any) {
        const M = resolveBetterAuthModel(model);
        return M.countDocuments(buildWhereFilter(where));
      },
    }),
  });
