export const API_URL: string = ((import.meta as any).env?.VITE_API_URL as string) || '/api';
export const APP_NAME: string = ((import.meta as any).env?.VITE_APP_NAME as string) || 'BlueCrest Cargo Lines';
export const TOKEN_KEY = 'shipping_auth_token';
const viteEnv = (k: string): string => (((import.meta as any).env?.[k] as string) || '').trim();
export const SUPPORT_EMAIL: string = viteEnv('VITE_SUPPORT_EMAIL');
export const SUPPORT_PHONE: string = viteEnv('VITE_SUPPORT_PHONE');
export const SUPPORT_ADDRESS: string = viteEnv('VITE_SUPPORT_ADDRESS');