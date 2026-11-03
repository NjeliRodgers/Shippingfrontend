import { request } from './client';
import { AlertRule, AnalyticsSummary, BackupRecord, NotificationLog } from '../types/logistics';

export const NotificationsApi = {
  list: () => request<NotificationLog[]>('/notifications'),
  dispatch: (data: { trackingNumber?: string; recipient: string; channel: string; subject?: string; message: string }) =>
    request<NotificationLog>('/notifications/dispatch', { method: 'POST', body: data }),
};

export const AlertRulesApi = {
  list: () => request<AlertRule[]>('/alert-rules'),
  create: (data: { name: string; metric: string; threshold: string | number; notifyChannels: string[] }) =>
    request<AlertRule>('/alert-rules', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{ name: string; threshold: string | number; active: boolean; notifyChannels: string[] }>) =>
    request<AlertRule>(`/alert-rules/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => request<{ message: string }>(`/alert-rules/${id}`, { method: 'DELETE' }),
};

export const BackupsApi = {
  list: () => request<BackupRecord[]>('/backups'),
  trigger: () => request<BackupRecord>('/backups/trigger', { method: 'POST' }),
  verify: (id: string) =>
    request<{ ok: boolean; reason?: string; backup: BackupRecord }>(`/backups/${id}/verify`, { method: 'POST' }),
};

export const AnalyticsApi = {
  summary: (months = 6) => request<AnalyticsSummary>('/analytics/summary', { query: { months } }),
  emailReport: (recipient: string) =>
    request<NotificationLog>('/analytics/email-report', { method: 'POST', body: { recipient } }),
};
