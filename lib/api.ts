// API helper functions
const API_BASE = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || 'Error en la solicitud' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return { error: 'Error de conexión' };
    }
  }

  // Visits API
  async getVisits(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    return this.request(`/visits?${params}`);
  }

  async getVisit(id: string) {
    return this.request(`/visits/${id}`);
  }

  async createVisit(visitData: Record<string, unknown>) {
    return this.request('/visits', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  }

  async updateVisit(id: string, updateData: Record<string, unknown>) {
    return this.request(`/visits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Auth API
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Users API
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: Record<string, unknown>) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Record<string, unknown>) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // VPN API
  async getVpnCertificates() {
    return this.request('/vpn/certificates');
  }

  async getVpnCertificate(id: string) {
    return this.request(`/vpn/certificates/${id}`);
  }

  async createVpnCertificate(certificateData: {
    targetUserId?: string;
    certificateName: string;
    deviceName: string;
    location?: string;
    validityDays?: number;
    notes?: string;
  }) {
    return this.request('/vpn/certificates', {
      method: 'POST',
      body: JSON.stringify(certificateData),
    });
  }

  async revokeVpnCertificate(id: string) {
    return this.request(`/vpn/certificates/${id}`, {
      method: 'DELETE',
    });
  }

  async getVpnConnections(certificateId?: string, limit?: number) {
    const params = new URLSearchParams();
    if (certificateId) params.append('certificateId', certificateId);
    if (limit) params.append('limit', limit.toString());
    
    return this.request(`/vpn/connections?${params}`);
  }
}

export const apiClient = new ApiClient();
