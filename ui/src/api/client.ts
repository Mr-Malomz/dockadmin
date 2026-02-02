import type { ApiResponse } from '../types/api';

const API_BASE = 'http://localhost:3000/api';

// token management
export function getToken(): string | null {
    return localStorage.getItem('session_token');
}

export function setToken(token: string): void {
    localStorage.setItem('session_token', token);
}

export function clearToken(): void {
    localStorage.removeItem('session_token');
}

// base request with token injection
export async function request<T>(
    url: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });

    return res.json();
}

// request methods
export const api = {
    get: <T>(url: string) => request<T>(url, { method: 'GET' }),

    post: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
