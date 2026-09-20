/**
 * CaféPass API Client
 * Communicates with the backend API
 * Falls back to demo mode when backend is unavailable
 */

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

class ApiClient {
  private token: string | null = null;
  private isDemoMode = false;

  constructor() {
    this.token = localStorage.getItem('cafepass_token');
  }

  setToken(token: string | null) {
    this.token = token;

    if (token) {
      localStorage.setItem('cafepass_token', token);
    } else {
      localStorage.removeItem('cafepass_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);

          window.dispatchEvent(
            new CustomEvent('cafepass:unauthorized')
          );
        }

        if (response.status === 403) {
          return {
            error:
              data.error ||
              'Sizda bu bo‘limga kirish huquqi yo‘q',
            status: 403,
            ...data,
          };
        }

        return {
          error: data.error || 'Xatolik yuz berdi',
          status: response.status,
          ...data,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);

      if (import.meta.env.DEV) {
        this.isDemoMode = true;

        return {
          error: 'Server bilan bog‘lanishda xatolik',
          isDemoMode: true,
        };
      }

      return {
        error:
          'Server bilan bog‘lanishda xatolik. Iltimos, keyinroq urinib ko‘ring.',
      };
    }
  }

  // ============================================================
  // AUTH
  // ============================================================

  async sendOTP(phone: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(
    phone: string,
    code: string,
    name?: string
  ) {
    const result = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        code,
        name,
      }),
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  async logout() {
    await this.request('/auth/logout', {
      method: 'POST',
    });

    this.setToken(null);
  }

  async getMe() {
    return this.request('/me');
  }

  // ============================================================
  // CUSTOMER
  // ============================================================

  async getCustomerDashboard() {
    return this.request('/customer/dashboard');
  }

  async generateQR() {
    return this.request('/customer/qr', {
      method: 'POST',
    });
  }

  async getCustomerCafes() {
    return this.request('/customer/cafes');
  }

  async getCustomerCafeDetail(cafeId: string) {
    return this.request(`/customer/cafes/${cafeId}`);
  }

  async getCustomerRewards() {
    return this.request('/customer/rewards');
  }

  async getCustomerHistory(page = 1) {
    return this.request(`/customer/history?page=${page}`);
  }

  async toggleFavoriteCafe(cafeId: string) {
    return this.request(`/customer/favorite/${cafeId}`, {
      method: 'POST',
    });
  }

  async getLeaderboard() {
    return this.request('/customer/leaderboard');
  }

  async updateProfile(name: string) {
    return this.request('/customer/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  // ============================================================
  // OWNER
  // ============================================================

  async getOwnerDashboard() {
    return this.request('/owner/dashboard');
  }

  async getOwnerCustomers(page = 1) {
    return this.request(`/owner/customers?page=${page}`);
  }

  async getOwnerTransactions(page = 1) {
    return this.request(`/owner/transactions?page=${page}`);
  }

  async getOwnerRewards() {
    return this.request('/owner/rewards');
  }

  async createReward(data: any) {
    return this.request('/owner/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOwnerPromotions() {
    return this.request('/owner/promotions');
  }

  async createPromotion(data: any) {
    return this.request('/owner/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOwnerAnalytics() {
    return this.request('/owner/analytics');
  }

  async createBranch(data: any) {
    return this.request('/owner/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createEmployee(data: any) {
    return this.request('/owner/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOwnerEmployees() {
    return this.request('/owner/employees');
  }

  // ============================================================
  // EMPLOYEE
  // ============================================================

  async getEmployeeDashboard() {
    return this.request('/employee/dashboard');
  }

  async scanQR(token: string) {
    return this.request('/employee/scan', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async processPurchase(data: any) {
    return this.request('/employee/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async redeemReward(data: any) {
    return this.request('/employee/redeem-reward', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployeeRewards() {
    return this.request('/employee/rewards');
  }

  // ============================================================
  // ADMIN
  // ============================================================

  async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  async getAdminCafes(page = 1) {
    return this.request(`/admin/cafes?page=${page}`);
  }

  async createCafe(data: any) {
    return this.request('/admin/cafes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCafe(cafeId: string, data: any) {
    return this.request(`/admin/cafes/${cafeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAdminCustomers(page = 1) {
    return this.request(`/admin/customers?page=${page}`);
  }

  async getAdminAnalytics() {
    return this.request('/admin/analytics');
  }

  async getAuditLogs(page = 1) {
    return this.request(`/admin/audit-logs?page=${page}`);
  }

  isDemoModeEnabled(): boolean {
    return this.isDemoMode;
  }
}

export const api = new ApiClient();