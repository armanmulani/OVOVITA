import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

// Meta Cloud API Webhook Handshake & Inbound Message
router.get('/whatsapp', WebhookController.verifyWebhook);
router.post('/whatsapp', WebhookController.handleInboundMessage);

export default router;
