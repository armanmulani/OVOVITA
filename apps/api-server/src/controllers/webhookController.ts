import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';

export class WebhookController {
  /**
   * Meta Webhook Verification Handshake
   * Required when setting up WhatsApp Business Cloud API in Meta Developer Console
   */
  static verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'ovovita_webhook_secret_2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Meta Webhook] ✅ Verification challenge accepted by Meta!');
      return res.status(200).send(challenge);
    }

    console.warn('[Meta Webhook] ❌ Verification failed: token mismatch');
    return res.sendStatus(403);
  }

  /**
   * Handle Inbound Customer Messages & Delivery Status Receipts
   */
  static async handleInboundMessage(req: Request, res: Response) {
    const body = req.body;

    // Meta sends empty body for some validation events
    if (!body || body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const fromPhone = message.from; // Customer WhatsApp number e.g. "919876543210"
      const text = message.text?.body?.trim() || '';

      console.log(`[WhatsApp Inbound] 💬 Message from ${fromPhone}: "${text}"`);

      // Intelligent Bot Routing
      const sanitizedPhone = fromPhone.replace(/^91/, '');
      const reply = await WebhookController.generateBotReply(sanitizedPhone, text);

      console.log(`[WhatsApp Bot Reply] 🤖 Response to ${fromPhone}:\n${reply}`);
    }

    // Always respond 200 OK to Meta webhooks within 5 seconds to avoid retries
    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  }

  /**
   * Generate contextual customer reply
   */
  private static async generateBotReply(phoneNumber: string, incomingText: string): Promise<string> {
    const lower = incomingText.toLowerCase();

    // 1. Order Tracking query
    if (lower.includes('track') || lower.includes('status') || lower.includes('egg-') || lower.includes('order')) {
      const activeOrder = await Order.findOne({
        customerPhone: phoneNumber,
        status: { $in: ['PLACED', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY'] },
      }).sort({ createdAt: -1 });

      if (activeOrder) {
        return (
          `🥚 *Ovovita Fresh Farm Delivery Update*\n\n` +
          `Order: *#${activeOrder.orderNumber}*\n` +
          `Status: *${activeOrder.status.replace(/_/g, ' ')}*\n` +
          `Rider: *${activeOrder.assignedDeliveryPersonName || 'Ramesh Kumar'}* (${activeOrder.vehiclePlateNumber || 'KA-01-EQ-9872'})\n` +
          `ETA: *${activeOrder.estimatedDeliveryTime || '15 mins'}*\n` +
          `Pay on Delivery Due: *₹${activeOrder.finalPayableAmount}*\n\n` +
          `✨ *Zero-Crack Guarantee:* Inspect your molded pulp tray at the doorstep. Pay via physical cash or scan the driver's dynamic UPI QR!`
        );
      }

      return (
        `🥚 Hello from *Ovovita Fresh Farms*!\n` +
        `We could not find an active in-transit order for this number. Need fresh eggs for tomorrow's morning harvest? Browse our daily catalog at http://localhost:5174`
      );
    }

    // 2. Freshness & Candling enquiry
    if (lower.includes('fresh') || lower.includes('candling') || lower.includes('crack')) {
      return (
        `🌿 *Ovovita Zero-Crack Freshness Standard*\n` +
        `• Laid at sunrise today on local Karnataka pasture farms\n` +
        `• 100% candling quality test passed\n` +
        `• Delivered in shock-absorbing molded pulp trays\n` +
        `• Doorstep unboxing inspection: replace cracked eggs or discount bill instantly!`
      );
    }

    // 3. Default Greeting
    return (
      `🥚 Welcome to *Ovovita Farm-to-Table Eggs*!\n\n` +
      `Commands you can send:\n` +
      `• Reply *TRACK* to check your live morning egg delivery\n` +
      `• Reply *FRESH* to learn about our candling quality process\n` +
      `• Order online: http://localhost:5174`
    );
  }
}
