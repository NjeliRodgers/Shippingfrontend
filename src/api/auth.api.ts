import { request } from './client';
import { User } from '../types/logistics';

export interface AuthResponse { token: string; user: User }

export const AuthApi = {
  register: (data: { name: string; email: string; password: string; company?: string; phone?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request<{ user: User }>('/auth/me'),
  updateMe: (data: { name?: string; company?: string; phone?: string }) =>
    request<{ user: User }>('/auth/me', { method: 'PATCH', body: data }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),
  createApiKey: () => request<{ apiKey: string; prefix: string }>('/auth/api-key', { method: 'POST' }),
};

export const UsersApi = {
  list: () => request<User[]>('/users'),
  create: (data: { name: string; email: string; password: string; role: string; company?: string }) =>
    request<User>('/users', { method: 'POST', body: data }),
  update: (id: string, data: { name?: string; role?: string; isActive?: boolean }) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: data }),
};
