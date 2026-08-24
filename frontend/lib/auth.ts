import Cookies from 'js-cookie';
import { api } from './api';

export interface UserSession {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  name?: string;
}

export function setSessionToken(token: string) {
  Cookies.set('token', token, { expires: 7, sameSite: 'lax' });
}

export function clearSession() {
  Cookies.remove('token');
}

export function getSession(): UserSession | null {
  const token = Cookies.get('token');
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson) as UserSession;
  } catch (err) {
    console.error('Failed to parse session token:', err);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('token');
}

export function hasRole(allowedRoles: ('CUSTOMER' | 'ORGANISER' | 'ADMIN')[]): boolean {
  const session = getSession();
  if (!session) return false;
  return allowedRoles.includes(session.role);
}
