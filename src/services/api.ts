/**
 * Base HTTP client for SEYO API
 */

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;
  message?: string;
  [key: string]: any;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure iPhone Safari / WebKit does not serve stale responses for real-time customer status
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache');
  }
  if (!headers.has('Pragma')) {
    headers.set('Pragma', 'no-cache');
  }

  const response = await fetch(endpoint, {
    cache: 'no-store',
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: `Server returned status ${response.status}`,
  }));

  if (!response.ok || data.success === false) {
    const error: any = new Error(data.message || 'An error occurred');
    error.code = data.code || 'UNKNOWN_ERROR';
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) => {
    const headers = new Headers(options?.headers || {});
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('seyo_staff_session') : null;
    if (token && !headers.has('x-staff-session')) {
      headers.set('x-staff-session', token);
      headers.set('Authorization', `Bearer ${token}`);
    }
    return request<T>(endpoint, { ...options, method: 'GET', headers });
  },
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const headers = new Headers(options?.headers || {});
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('seyo_staff_session') : null;
    if (token && !headers.has('x-staff-session')) {
      headers.set('x-staff-session', token);
      headers.set('Authorization', `Bearer ${token}`);
    }
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  },
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const headers = new Headers(options?.headers || {});
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('seyo_staff_session') : null;
    if (token && !headers.has('x-staff-session')) {
      headers.set('x-staff-session', token);
      headers.set('Authorization', `Bearer ${token}`);
    }
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  },
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const headers = new Headers(options?.headers || {});
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('seyo_staff_session') : null;
    if (token && !headers.has('x-staff-session')) {
      headers.set('x-staff-session', token);
      headers.set('Authorization', `Bearer ${token}`);
    }
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  },
  delete: <T = any>(endpoint: string, options?: RequestInit) => {
    const headers = new Headers(options?.headers || {});
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('seyo_staff_session') : null;
    if (token && !headers.has('x-staff-session')) {
      headers.set('x-staff-session', token);
      headers.set('Authorization', `Bearer ${token}`);
    }
    return request<T>(endpoint, { ...options, method: 'DELETE', headers });
  },
};
