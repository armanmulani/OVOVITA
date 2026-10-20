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
      headers['Authorization'] = `Bearer ${token}`;
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
};
