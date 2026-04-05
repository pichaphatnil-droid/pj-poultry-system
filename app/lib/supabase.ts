import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signIn = async (username: string, password: string) => {
  try {
    // In production, you should use Supabase Auth with email
    // For now, we'll use a custom authentication
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // In production, verify password_hash properly
    // For now, storing user in localStorage
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
