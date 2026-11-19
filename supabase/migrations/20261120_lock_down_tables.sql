-- ============================================
-- ปิดไม่ให้เข้าถึงฐานข้อมูลด้วยกุญแจสาธารณะ (anon / publishable key) อีกต่อไป
-- ทุกการอ่าน/เขียนต้องผ่าน API ฝั่งเซิร์ฟเวอร์ของเว็บ ซึ่งตรวจการ login แล้ว
--
-- ⚠️ รันไฟล์นี้ "หลังจาก" deploy โค้ดเวอร์ชันใหม่ขึ้น Vercel เสร็จแล้วเท่านั้น
--    (ถ้ารันก่อน เว็บเวอร์ชันเก่าจะโหลดข้อมูลไม่ได้)
-- ============================================

-- 1) ลบ policy เดิมที่เปิดให้ทุกคนทำได้ทุกอย่าง (qual = true)
DROP POLICY IF EXISTS "Admins can delete records" ON daily_records;
DROP POLICY IF EXISTS "All authenticated users can view records" ON daily_records;
DROP POLICY IF EXISTS "Workers can insert records" ON daily_records;
DROP POLICY IF EXISTS "Workers can update records" ON daily_records;
DROP POLICY IF EXISTS "Workers can insert/update their house records" ON daily_records;
DROP POLICY IF EXISTS "Workers can update their house records" ON daily_records;
DROP POLICY IF EXISTS "Admins can manage batches" ON batches;
DROP POLICY IF EXISTS "All authenticated users can view batches" ON batches;
DROP POLICY IF EXISTS "All authenticated users can view logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;

-- 2) เปิด RLS ทุกตาราง (ไม่มี policy = กุญแจสาธารณะเข้าไม่ได้เลย, service role ของเซิร์ฟเวอร์ยังใช้ได้)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_house_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_house_weight_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_pins ENABLE ROW LEVEL SECURITY;

-- 3) ถอนสิทธิ์ทั้งหมดของกุญแจสาธารณะ (กันไว้อีกชั้น)
REVOKE ALL ON users, batches, daily_records, activity_logs,
  batch_house_counts, batch_house_weight_sessions, house_pins
  FROM anon, authenticated;

-- view ทำงานด้วยสิทธิ์เจ้าของ (ข้าม RLS) จึงต้องถอนสิทธิ์แยก
REVOKE ALL ON daily_summary, cumulative_loss FROM anon, authenticated;

-- function ปิดรุ่นอัตโนมัติ ให้เรียกได้จากเซิร์ฟเวอร์เท่านั้น
REVOKE EXECUTE ON FUNCTION close_scheduled_batches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_scheduled_batches() TO service_role;

-- ตรวจสอบหลังรัน: คำสั่งนี้ควร error ว่า permission denied
--   SET ROLE anon; SELECT * FROM daily_records LIMIT 1; RESET ROLE;
