import { Order, IOrderDoc } from '../models/Order';
import { InventoryService } from './InventoryService';

/**
 * How long a PLACED order may sit before the sweep cancels it.
 *
 * A PLACED order is a customer's intent that has not been confirmed yet. The
 * owner confirms orders in the admin portal, so an order nobody looked at
 * should not sit in the day's plan indefinitely.
 */
export const PLACED_ORDER_TTL_MS = 2 * 60 * 60 * 1000;

/** The roles that may act on any order in the shop. */
const STAFF_ROLES = ['SHOPKEEPER', 'SYSTEM_ADMIN', 'DELIVERY_EXECUTIVE'];

/**
 * The states from which stock was locked and must therefore be released back
 * to inventory when the order is cancelled.
 *
 * PLACED never locked stock, and DELIVERED means the eggs are gone, so
 * neither releases anything.
 */
const STOCK_HELD_STATES = ['CONFIRMED', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'];

export interface CancellationOutcome {
  order: IOrderDoc;
  /** True when eggs were returned to inventory by this cancellation. */
  stockReleased: boolean;
  /** True when the driver physically holds the eggs and must return them. */
  requiresEggReturn: boolean;
  /** True when the customer paid and money must be given back by hand. */
  refundOwed: boolean;
  refundAmount?: number;
  note: string;
}

/**
 * Raised when an order cannot move to the requested state — it was already
 * cancelled, or it is not in a state that allows the transition.
 */
export class OrderConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'OrderConflictError';
  }
}

export class OrderService {
  /**
   * Decides whether the caller may act on the given order.
   *
   * A customer may only act on their own order. Staff may act on any order
   * in the shop. The assigned driver counts as staff for their own order.
   */
  static canActOnOrder(
    order: IOrderDoc,
    actor: { id?: string; role?: string }
  ): boolean {
    const isOwner = String(order.customerId) === String(actor.id);
    if (isOwner) return true;
    return STAFF_ROLES.includes(actor.role || '');
  }

  /**
   * Claims an order for cancellation.
   *
   * The claim is a single conditional update: it flips the order to
   * CANCELLED only if it is still in a cancellable state. That write is what
   * makes a double-cancel impossible — the second request finds no document
   * to claim and is rejected, so the eggs are never released twice.
   */
  private static async claimForCancellation(
    order: IOrderDoc,
    actor: { id?: string; role?: string }
  ): Promise<{ claimed: IOrderDoc | null; previousStatus: string }> {
    const previousStatus = order.status;

    const claimed = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: { $in: [...STOCK_HELD_STATES, 'PLACED', 'DELIVERED'] },
      },
      { $set: { status: 'CANCELLED' } },
      { new: true }
    );

    return { claimed, previousStatus };
  }

  /**
   * Cancels an order according to the shop's cancellation policy.
   *
   * PLACED             → no stock was locked, nothing to release.
   * CONFIRMED/PACKING  → stock is released; a packing note records that the
   *                       packed eggs went back on the shelf.
   * READY_FOR_DELIVERY → stock is released; the driver still holds the eggs.
   * OUT_FOR_DELIVERY   → stock is released AND the driver is told to return
   *                       the eggs, because they are physically in the van.
   * DELIVERED          → the eggs are gone, so no stock is released. Instead
   *                       a refund is recorded for the owner to action by hand.
   */
  static async cancelOrder(
    order: IOrderDoc,
    actor: { id?: string; role?: string; name?: string },
    reason?: string
  ): Promise<CancellationOutcome> {
    const { claimed, previousStatus } = await OrderService.claimForCancellation(order, actor);

    if (!claimed) {
      throw new OrderConflictError(
        `Order is already ${order.status} and cannot be cancelled again`
      );
    }

    const releasedStock = STOCK_HELD_STATES.includes(previousStatus);
    const requiresEggReturn =
      previousStatus === 'OUT_FOR_DELIVERY' || previousStatus === 'READY_FOR_DELIVERY';
    const refundOwed = previousStatus === 'DELIVERED';

    let note = reason || `Cancelled from ${previousStatus}`;
    let refundAmount: number | undefined;

    try {
      if (releasedStock) {
        await InventoryService.restoreStock(
          claimed.items.map((i) => ({
            productId: String(i.productId),
            totalEggsCount: i.totalEggsCount,
          }))
        );

        if (previousStatus === 'PACKING') {
          note = `${note} — packed eggs returned to the shelf (owner decides restock vs waste)`;
        } else if (requiresEggReturn) {
          note = `${note} — driver holds these eggs and must return them to the shop`;
        }
      }

      if (refundOwed) {
        refundAmount = claimed.podCollectedAmount ?? claimed.finalPayableAmount;
        note = `${note} — refund of ₹${refundAmount} is owed to the customer (manual, offline)`;
      }
    } catch (error) {
      // The stock release failed. Undo the claim so the order is never left
      // cancelled while its eggs are still missing from inventory.
      await Order.updateOne(
        { _id: claimed._id, status: 'CANCELLED' },
        { $set: { status: previousStatus } }
      );
      throw error;
    }

    const update: Record<string, any> = { cancellationNote: note };

    if (requiresEggReturn) {
      update.requiresEggReturn = true;
      update.eggsToReturnCount = claimed.items.reduce(
        (sum, i) => sum + i.totalEggsCount,
        0
      );
    }

    if (refundOwed) {
      update.refundOwed = true;
      update.refundAmount = refundAmount;
      update.refundStatus = 'PENDING';
      update.refundRequestedAt = new Date();
      // The actor id is a string in the JWT; the field is a User reference,
      // so only set it when it is a real id (the auto-sweep has none).
      if (actor.id) {
        update.refundRequestedBy = actor.id;
      }
      if (claimed.upiTransactionRef) {
        update.refundUpiTransactionRef = claimed.upiTransactionRef;
      }
    }

    const updated = await Order.findByIdAndUpdate(
      claimed._id,
      {
        $set: update,
        $push: {
          statusTimeline: {
            status: 'CANCELLED',
            timestamp: new Date(),
            updatedByUserId: actor.id,
            note,
          },
        },
      },
      { new: true }
    );

    return {
      order: updated || claimed,
      stockReleased: releasedStock,
      requiresEggReturn,
      refundOwed,
      refundAmount,
      note,
    };
  }

  /**
   * Confirms a PLACED order, which is the point at which its stock is locked.
   *
   * The decrement is atomic and guarded, so if another order consumed the
   * eggs in the meantime the confirmation fails and the order stays PLACED.
   */
  static async confirmOrder(
    order: IOrderDoc,
    actor: { id?: string; role?: string }
  ): Promise<IOrderDoc> {
    const confirmed = await Order.findOneAndUpdate(
      { _id: order._id, status: 'PLACED' },
      {
        $set: { status: 'CONFIRMED' },
        $push: {
          statusTimeline: {
            status: 'CONFIRMED',
            timestamp: new Date(),
            updatedByUserId: actor.id,
            note: 'Order confirmed by the shop; stock locked.',
          },
        },
      },
      { new: true }
    );

    if (!confirmed) {
      throw new OrderConflictError(
        `Order is ${order.status} and cannot be confirmed`
      );
    }

    try {
      await InventoryService.atomicDecrementStock(
        confirmed.items.map((i) => ({
          productId: String(i.productId),
          totalEggsCount: i.totalEggsCount,
          productName: i.productName,
        }))
      );
    } catch (error) {
      // The stock was not available after all. Put the order back so the
      // owner sees it as still awaiting confirmation, and the 2-hour sweep
      // can cancel it cleanly.
      await Order.updateOne(
        { _id: confirmed._id, status: 'CONFIRMED' },
        {
          $set: { status: 'PLACED' },
          $pop: { statusTimeline: 1 },
        }
      );
      throw error;
    }

    return confirmed;
  }

  /**
   * Moves an order along the shop's packing workflow.
   *
   * CONFIRMED         → PACKING           (the shopkeeper started packing)
   * PACKING           → READY_FOR_DELIVERY (packing finished, ready for a driver)
   */
  static async transitionPacking(
    order: IOrderDoc,
    target: 'PACKING' | 'READY_FOR_DELIVERY',
    actor: { id?: string; role?: string }
  ): Promise<IOrderDoc> {
    const from = target === 'PACKING' ? 'CONFIRMED' : 'PACKING';

    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: from },
      {
        $set: { status: target },
        $push: {
          statusTimeline: {
            status: target,
            timestamp: new Date(),
            updatedByUserId: actor.id,
            note:
              target === 'PACKING'
                ? 'Shopkeeper started packing the eggs into molded pulp trays.'
                : 'Packing complete; order is ready for delivery.',
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new OrderConflictError(
        `Order is ${order.status} and cannot move to ${target}`
      );
    }

    return updated;
  }

  /**
   * Cancels PLACED orders that have been waiting for confirmation for longer
   * than the TTL.
   *
   * PLACED orders do not hold stock, so the sweep only has to mark them
   * cancelled — but it goes through the same claim path so a concurrent
   * manual cancellation cannot double-apply.
   */
  static async sweepStalePlacedOrders(
    ttlMs: number = PLACED_ORDER_TTL_MS
  ): Promise<{ cancelledCount: number; orderIds: string[] }> {
    const cutoff = new Date(Date.now() - ttlMs);

    const stale = await Order.find({
      status: 'PLACED',
      createdAt: { $lt: cutoff },
    });

    const orderIds: string[] = [];
    for (const order of stale) {
      try {
        const outcome = await OrderService.cancelOrder(
          order,
          { id: undefined, role: 'SYSTEM' },
          'Automatically cancelled: not confirmed within the 2-hour window'
        );
        orderIds.push(String(outcome.order._id));
      } catch {
        // Another request cancelled it first — nothing to do.
      }
    }

    if (orderIds.length > 0) {
      console.log(
        `[Order Sweep] Auto-cancelled ${orderIds.length} stale PLACED order(s) older than ${Math.round(
          ttlMs / 60000
        )} minutes.`
      );
    }

    return { cancelledCount: orderIds.length, orderIds };
  }
}

/**
 * Starts the periodic sweep of stale PLACED orders.
 *
 * Uses a plain `setInterval` so it needs no external service and no new
 * dependency. The timer is `unref`'d so it never keeps the process alive on
 * its own.
 */
export const startPlacedOrderSweep = (
  intervalMs: number = 5 * 60 * 1000,
  ttlMs: number = PLACED_ORDER_TTL_MS
) => {
  const timer = setInterval(() => {
    OrderService.sweepStalePlacedOrders(ttlMs).catch((error) => {
      console.error('[Order Sweep] Failed:', error?.message || error);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') timer.unref();
  console.log(
    `[Order Sweep] Watching for PLACED orders older than ${Math.round(
      ttlMs / 60000
    )} minutes (checking every ${Math.round(intervalMs / 60000)} minute(s)).`
  );

  return timer;
};
