import { createClient } from '@supabase/supabase-js';
import type { User } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_STORAGE_KEY = 'user';

const storeUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_STORAGE_KEY);
};

// Auth helpers — การตรวจรหัสผ่านทำที่เซิร์ฟเวอร์ (/api/login) เท่านั้น
export const signIn = async (username: string, password: string) => {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.user) {
      throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    storeUser(data.user);
    return { user: data.user as User, error: null };
  } catch (error: any) {
    return { user: null, error: error.message as string };
  }
};

export const signOut = async () => {
  storeUser(null);
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch {
    // ถึงเน็ตหลุดก็ล้างข้อมูลในเครื่องไปแล้ว
  }
};

// ข้อมูลผู้ใช้ที่เก็บไว้ในเครื่อง (ใช้แสดงผลเท่านั้น ไม่ใช่ตัวตัดสินสิทธิ์)
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// ถามเซิร์ฟเวอร์ว่ายัง login อยู่ไหม (และต่ออายุให้อัตโนมัติ)
export const refreshCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await fetch('/api/me', { cache: 'no-store' });
    if (res.status === 401) {
      storeUser(null);
      return null;
    }
    if (!res.ok) return getCurrentUser(); // เซิร์ฟเวอร์ขัดข้องชั่วคราว ใช้ข้อมูลเดิมไปก่อน
    const data = await res.json();
    storeUser(data.user);
    return data.user;
  } catch {
    return getCurrentUser(); // ออฟไลน์ ใช้ข้อมูลเดิมไปก่อน
  }
};
