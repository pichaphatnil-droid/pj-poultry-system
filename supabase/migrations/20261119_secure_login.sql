-- ============================================
-- ระบบ login แบบปลอดภัย (รันครั้งเดียวใน Supabase > SQL Editor)
-- รหัสผ่านเดิมของพนักงานยังใช้ได้ตามเดิม ระบบจะ hash ให้เองตอนที่แต่ละคน login ครั้งแรก
-- ============================================

-- 1) คอลัมน์สำหรับล็อกบัญชีชั่วคราวเมื่อใส่รหัสผิดหลายครั้ง
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 2) ปิดไม่ให้หน้าเว็บ (anon key) อ่านรหัสผ่าน หรือแก้ไขตาราง users ได้
--    การ login / เพิ่มผู้ใช้ / ตั้ง PIN ใหม่ ทำผ่าน API ฝั่งเซิร์ฟเวอร์ด้วย service role key เท่านั้น
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;

CREATE POLICY "Public can read basic user info"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON users FROM anon, authenticated;
GRANT SELECT (id, username, full_name, role, house_number, is_active, created_at, updated_at)
  ON users TO anon, authenticated;

-- ตรวจสอบหลังรัน: คำสั่งนี้ควร error ว่า permission denied (แปลว่าปิดสำเร็จ)
--   SET ROLE anon; SELECT password_hash FROM users; RESET ROLE;
