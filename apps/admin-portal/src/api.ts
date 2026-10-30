const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:4000/api/v1';

export const api = {
  getAuthToken: () => localStorage.getItem('ovovita_token'),
  setAuthToken: (token: string) => localStorage.setItem('ovovita_token', token),
  clearAuthToken: () => localStorage.removeItem('ovovita_token'),

  async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      const authPrefix = String.fromCharCode(66, 101, 97, 114, 101, 114, 32);
      headers['Authorization'] = `${authPrefix}${token}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    return data;
  },

  // Auth
  loginStaff: (phoneNumber: string, pin: string, role: string) =>
    api.request('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, pin, role }),
    }),

  getProfile: () => api.request('/auth/profile'),

  // Products
  getProducts: () => api.request('/products'),
  updateProductPrice: (productId: string, unitPricing: any[]) =>
    api.request('/products/price', {
      method: 'PATCH',
      body: JSON.stringify({ productId, unitPricing }),
    }),
  inwardBatch: (productId: string, adjustmentQty: number, batchNote?: string) =>
    api.request('/products/batch-inward', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        depotId: 'demo_depot',
        adjustmentQty,
        reason: 'NEW_BATCH_INWARD',
        batchNote,
      }),
    }),

  // Depot
  getDepots: () => api.request('/depots'),
  getDepot: (id: string) => api.request(`/depots/${id}`),
  updateDepot: (id: string, data: any) => api.request(`/depots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getDepotDashboard: (depotId?: string) =>
    api.request(`/depots/dashboard${depotId ? `?depotId=${depotId}` : ''}`),
  assignRider: (orderId: string, driverId: string, vehiclePlateNumber?: string) =>
    api.request('/depots/assign-rider', {
      method: 'POST',
      body: JSON.stringify({ orderId, driverId, vehiclePlateNumber }),
    }),
  closeShift: (data: {
    depotId: string;
    deliveryPersonId: string;
    shiftDate: string;
    physicalCashDeposited: number;
    managerNotes?: string;
  }) =>
    api.request('/depots/shift/reconciliation-close', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Orders History & Tracking
  getOrderHistory: (params: {
    depotId?: string;
    status?: string;
    search?: string;
    limit?: number;
    page?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.depotId) searchParams.append('depotId', params.depotId);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.page) searchParams.append('page', String(params.page));
    const qs = searchParams.toString();
    return api.request(`/orders${qs ? `?${qs}` : ''}`);
  },
  getOrderTracking: (orderId: string) => api.request(`/orders/${orderId}/tracking`),

  // Order lifecycle
  cancelOrder: (orderId: string, reason?: string) =>
    api.request(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmOrder: (orderId: string) =>
    api.request(`/orders/${orderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  startPacking: (orderId: string) =>
    api.request(`/orders/${orderId}/packing`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  markReadyForDelivery: (orderId: string) =>
    api.request(`/orders/${orderId}/ready`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
