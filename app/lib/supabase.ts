import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signIn = async (username: string, password: string) => {
  try {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', cleanUsername)
      .eq('password_hash', cleanPassword)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data));
    }

    return { user: data, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signOut = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

export const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};
