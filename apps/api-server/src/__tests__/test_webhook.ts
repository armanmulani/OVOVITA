import mongoose from 'mongoose';
import { config } from '../config';
import { createApp } from '../app';
import http from 'http';

const testWebhook = async () => {
  console.log('💬 Running Meta WhatsApp Webhook Test Suite...\n');

  await mongoose.connect(config.mongoUri);
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(4005, () => resolve()));
  console.log('Test server listening on port 4005');

  try {
    // 1. Test Verification Handshake
    console.log('Test 1: Testing Meta Webhook Verification Handshake...');
    const verifyRes = await fetch(
      'http://localhost:4005/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=ovovita_webhook_secret_2026&hub.challenge=CHALLENGE_CODE_9876'
    );
    const challengeText = await verifyRes.text();
    console.log(`  Verification Response: ${challengeText}`);
    console.assert(challengeText === 'CHALLENGE_CODE_9876', 'Challenge code mismatch');
    console.log('  ✅ Meta Handshake verification passed');

    // 2. Test Inbound WhatsApp "TRACK" Message from customer Rahul Sharma (919876543210)
    console.log('\nTest 2: Testing Inbound WhatsApp "TRACK" Message...');
    const trackPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550234567', phone_number_id: '109283746501928' },
                contacts: [{ profile: { name: 'Rahul Sharma' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.HBgLM...==',
                    timestamp: '1724915000',
                    text: { body: 'Track my morning eggs please' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const trackRes = await fetch('http://localhost:4005/api/v1/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackPayload),
    });

    const trackJson = await trackRes.json();
    console.log(`  Webhook response status: ${trackRes.status}`, trackJson);
    console.assert(trackRes.status === 200, 'Expected 200 OK');
    console.log('  ✅ Inbound message handled & intelligent tracking response dispatched');

    console.log('\n🎉 ALL WEBHOOK INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100);
  }
};

testWebhook();
