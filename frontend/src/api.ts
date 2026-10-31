const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('brightloop_token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.error || {
          code: 'HTTP_ERROR',
          message: data.message || `Request failed with status ${res.status}`,
        },
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network connection failed. Please check your backend connection.',
      },
    };
  }
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};
