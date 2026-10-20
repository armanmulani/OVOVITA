export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ovovita Farm-to-Table API Engine',
    version: '1.1.0',
    description:
      'Enterprise API for artisanal fresh egg ordering, atomic inventory locking, Pay-on-Delivery (POD), doorstep zero-crack verification, and depot shift drawer reconciliation.',
    contact: {
      name: 'Ovovita Engineering Core',
      url: 'http://localhost:5174',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      CustomerOtpRequest: {
        type: 'object',
        required: ['phoneNumber'],
        properties: {
          phoneNumber: { type: 'string', example: '9876543210' },
        },
      },
      CustomerOtpVerify: {
        type: 'object',
        required: ['phoneNumber', 'otpCode'],
        properties: {
          phoneNumber: { type: 'string', example: '9876543210' },
          otpCode: { type: 'string', example: '123456' },
        },
      },
      StaffLogin: {
        type: 'object',
        required: ['phoneNumber', 'pin', 'role'],
        properties: {
          phoneNumber: { type: 'string', example: '9876500001' },
          pin: { type: 'string', example: '1234' },
          role: {
            type: 'string',
            enum: ['SHOPKEEPER', 'DELIVERY_EXECUTIVE', 'SYSTEM_ADMIN'],
            example: 'SHOPKEEPER',
          },
        },
      },
      CreateOrder: {
        type: 'object',
        required: ['deliveryAddress', 'deliverySlot', 'scheduledDeliveryDate', 'paymentMethod', 'items'],
        properties: {
          deliveryAddress: {
            type: 'object',
            properties: {
              recipientName: { type: 'string', example: 'Rahul Sharma' },
              phoneNumber: { type: 'string', example: '9876543210' },
              flatPlotNumber: { type: 'string', example: 'Flat 402' },
              apartmentName: { type: 'string', example: 'Silver Oak Heights' },
              streetName: { type: 'string', example: '5th Main, Koramangala' },
              pincode: { type: 'string', example: '560034' },
              city: { type: 'string', example: 'Bengaluru' },
            },
          },
          deliverySlot: {
            type: 'string',
            enum: ['MORNING_RUSH', 'EVENING_DROP'],
            example: 'MORNING_RUSH',
          },
          scheduledDeliveryDate: { type: 'string', example: '2026-10-15' },
          paymentMethod: {
            type: 'string',
            enum: ['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY'],
            example: 'UPI_ON_DELIVERY',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                unit: { type: 'string', enum: ['SINGLE', 'DOZEN', 'TRAY_30'], example: 'TRAY_30' },
                quantity: { type: 'integer', example: 1 },
              },
            },
          },
        },
      },
      DoorstepDamageAdjust: {
        type: 'object',
        required: ['orderId', 'brokenEggsCount', 'resolutionType'],
        properties: {
          orderId: { type: 'string' },
          brokenEggsCount: { type: 'integer', example: 1 },
          resolutionType: {
            type: 'string',
            enum: ['BUFFER_REPLACED', 'PRICE_DISCOUNTED'],
            example: 'BUFFER_REPLACED',
          },
          note: { type: 'string', example: '1 egg with hairline crack replaced from buffer crate' },
        },
      },
      DoorstepPaymentCollect: {
        type: 'object',
        required: ['orderId', 'paymentMethod', 'amountCollected', 'inspectionPassed'],
        properties: {
          orderId: { type: 'string' },
          paymentMethod: {
            type: 'string',
            enum: ['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY'],
            example: 'UPI_ON_DELIVERY',
          },
          amountCollected: { type: 'number', example: 195.0 },
          upiTransactionRef: { type: 'string', example: 'UPI_9876543210' },
          inspectionPassed: { type: 'boolean', example: true },
        },
      },
      ShiftReconciliationClose: {
        type: 'object',
        required: ['depotId', 'deliveryPersonId', 'shiftDate', 'physicalCashDeposited'],
        properties: {
          depotId: { type: 'string' },
          deliveryPersonId: { type: 'string' },
          shiftDate: { type: 'string', example: '2026-10-15' },
          physicalCashDeposited: { type: 'number', example: 0.0 },
          managerNotes: { type: 'string', example: 'Shift drawer balanced and verified' },
        },
      },
    },
  },
  paths: {
    '/auth/customer/otp-request': {
      post: {
        summary: 'Request Customer Login OTP',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerOtpRequest' } } },
        },
        responses: { 200: { description: 'OTP sent' } },
      },
    },
    '/auth/customer/otp-verify': {
      post: {
        summary: 'Verify Customer OTP & Issue JWT',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerOtpVerify' } } },
        },
        responses: { 200: { description: 'JWT Token and User Profile' } },
      },
    },
    '/auth/staff/login': {
      post: {
        summary: 'Staff PIN Login (Shopkeeper / Driver / Admin)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StaffLogin' } } },
        },
        responses: { 200: { description: 'Staff JWT Session' } },
      },
    },
    '/products': {
      get: {
        summary: 'Get Active Fresh Egg Catalog with Live Unit Pricing',
        tags: ['Catalog & Products'],
        responses: { 200: { description: 'List of Products with Unit Prices' } },
      },
    },
    '/products/price': {
      patch: {
        summary: 'Update Dynamic Live Prices (Admin / Depot)',
        tags: ['Catalog & Products'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Updated pricing tiers' } },
      },
    },
    '/products/batch-inward': {
      post: {
        summary: 'Inward Fresh Farm Egg Batch into Depot',
        tags: ['Catalog & Products'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Batch inward recorded' } },
      },
    },
    '/orders': {
      post: {
        summary: 'Place Pay-on-Delivery Order with Atomic Stock Lock',
        tags: ['Orders & Checkout'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrder' } } },
        },
        responses: { 201: { description: 'Order created with shock-proof pulp packaging' } },
      },
    },
    '/orders/{id}/tracking': {
      get: {
        summary: 'Live Order Tracker & Rider Details',
        tags: ['Orders & Checkout'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order timeline, live GPS, and driver contact' } },
      },
    },
    '/orders/{id}/upi-qr': {
      get: {
        summary: 'Generate Dynamic Bharat UPI QR String for Doorstep Collection',
        tags: ['Orders & Checkout'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'NPCI Bharat UPI Deep Link URI' } },
      },
    },
    '/orders/adjust-broken': {
      post: {
        summary: 'Zero-Crack Doorstep Inspection: Buffer Swap or Price Markdown',
        tags: ['Orders & Checkout'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DoorstepDamageAdjust' } } },
        },
        responses: { 200: { description: 'Adjustment logged and bill updated' } },
      },
    },
    '/orders/collect-payment': {
      post: {
        summary: 'Collect Payment at Doorstep & Mark Order Delivered',
        tags: ['Orders & Checkout'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DoorstepPaymentCollect' } } },
        },
        responses: { 200: { description: 'Order marked delivered and paid' } },
      },
    },
    '/depots': {
      get: {
        summary: 'List All Distribution Depot Hubs',
        tags: ['Depot Operations'],
        responses: { 200: { description: 'Array of active distribution hubs' } },
      },
    },
    '/depots/coverage': {
      get: {
        summary: 'Check Delivery Coverage and Real-Time ETA by Pincode or GPS Coordinates',
        tags: ['Depot Operations'],
        parameters: [
          { name: 'pincode', in: 'query', schema: { type: 'string', example: '560034' } },
          { name: 'lng', in: 'query', schema: { type: 'number', example: 77.6255 } },
          { name: 'lat', in: 'query', schema: { type: 'number', example: 12.9342 } },
        ],
        responses: { 200: { description: 'Coverage status, assigned hub, and dynamic ETA' } },
      },
    },
    '/depots/dashboard': {
      get: {
        summary: 'Depot Hub Dashboard (Packing Queue, Fleet, KPIs)',
        tags: ['Depot Operations'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics and queues' } },
      },
    },
    '/depots/assign-rider': {
      post: {
        summary: 'Assign Order to Delivery Executive for Dispatch',
        tags: ['Depot Operations'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Order marked Out for Delivery' } },
      },
    },
    '/depots/shift/reconciliation-close': {
      post: {
        summary: 'Close Shift Cash Drawer with Variance Check',
        tags: ['Depot Operations'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ShiftReconciliationClose' } } },
        },
        responses: { 200: { description: 'Shift drawer reconciliation receipt' } },
      },
    },
    '/webhooks/whatsapp': {
      get: {
        summary: 'Meta Webhook Handshake Verification',
        tags: ['Meta WhatsApp Cloud API'],
        responses: { 200: { description: 'Challenge code returned' } },
      },
      post: {
        summary: 'Inbound WhatsApp Customer Queries & Status Receipts',
        tags: ['Meta WhatsApp Cloud API'],
        responses: { 200: { description: 'Event received' } },
      },
    },
  },
};
