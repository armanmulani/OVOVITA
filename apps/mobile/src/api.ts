const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:4000/api/v1';

class MobileApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'MobileApiError';
  }
}

export const mobileApi = {
  getToken: () => localStorage.getItem('ovovita_mobile_token'),
  setToken: (t: string) => localStorage.setItem('ovovita_mobile_token', t),
  clearToken: () => localStorage.removeItem('ovovita_mobile_token'),

  async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new MobileApiError(data.error?.message || 'Request failed', data.error?.code);
    }
    return data;
  },

  // Auth - Phone OTP (Better Auth)
  requestOtp: (phoneNumber: string) =>
    mobileApi.request('/auth/customer/otp-request', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  verifyOtp: (phoneNumber: string, otpCode: string) =>
    mobileApi.request('/auth/customer/otp-verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otpCode }),
    }),

  // Auth - Email OTP (Free Gmail SMTP)
  requestEmailOtp: (email: string) =>
    mobileApi.request('/auth/customer/email-otp-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyEmailOtp: (email: string, otpCode: string) =>
    mobileApi.request('/auth/customer/email-otp-verify', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    }),

  googleLogin: (idToken: string) =>
    mobileApi.request('/auth/customer/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  staffLogin: (phoneNumber: string, pin: string, role: string) =>
    mobileApi.request('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, pin, role }),
    }),

  getProfile: () => mobileApi.request('/auth/profile'),

  // Addresses
  addAddress: (addressData: any) =>
    mobileApi.request('/auth/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    }),

  updateAddress: (addressId: string, addressData: any) =>
    mobileApi.request(`/auth/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    }),

  deleteAddress: (addressId: string) =>
    mobileApi.request(`/auth/addresses/${addressId}`, {
      method: 'DELETE',
    }),

  // Catalog
  getCatalog: (type?: string) =>
    mobileApi.request(`/products${type && type !== 'ALL' ? `?type=${type}` : ''}`),

  // Orders
  createOrder: (payload: any) =>
    mobileApi.request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyOrders: () => mobileApi.request('/orders/my-orders'),

  trackOrder: (orderId: string) => mobileApi.request(`/orders/${orderId}/tracking`),

  getUpiQr: (orderId: string) => mobileApi.request(`/orders/${orderId}/upi-qr`),

  adjustBrokenEggs: (data: {
    orderId: string;
    brokenEggsCount: number;
    resolutionType: 'BUFFER_REPLACED' | 'PRICE_DISCOUNTED';
    note?: string;
  }) =>
    mobileApi.request('/orders/adjust-broken', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  collectPayment: (data: {
    orderId: string;
    paymentMethod: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
    amountCollected: number;
    upiTransactionRef?: string;
    inspectionPassed: boolean;
  }) =>
    mobileApi.request('/orders/collect-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Driver Run Sheet
  getDriverRunSheet: () => mobileApi.request('/depots/driver/run-sheet'),

  // Depots & Coverage
  getDepots: () => mobileApi.request('/depots'),
  checkCoverage: (pincode: string, lng?: number, lat?: number) =>
    mobileApi.request(
      `/depots/coverage?pincode=${pincode}${lng ? `&lng=${lng}` : ''}${lat ? `&lat=${lat}` : ''}`
    ),
};
