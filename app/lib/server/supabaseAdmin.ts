// Supabase client ที่ใช้ service role key — ห้าม import ในไฟล์ฝั่ง client เด็ดขาด
import { createClient } from "@supabase/supabase-js";

export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// คอลัมน์ที่ส่งกลับไปหน้าเว็บได้ (ไม่มี password_hash)
export const SAFE_USER_COLUMNS =
  "id, username, full_name, role, house_number, is_active, created_at, updated_at";
