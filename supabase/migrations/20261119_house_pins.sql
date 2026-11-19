-- ============================================
-- รหัสประจำเล้า (รันครั้งเดียวใน Supabase > SQL Editor)
-- พนักงานกดเลือกเล้า แล้วใส่รหัสของเล้านั้น ระบบจะเข้าเป็นพนักงานที่ประจำเล้านั้นอยู่
-- ถ้ายังไม่ได้ตั้งรหัสให้เล้าไหน ระบบจะใช้รหัสเดิมของพนักงานในเล้านั้นแทน
-- ============================================

CREATE TABLE IF NOT EXISTS house_pins (
  house_number INTEGER PRIMARY KEY CHECK (house_number BETWEEN 1 AND 7),
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ปิดไม่ให้หน้าเว็บ (anon key) อ่านหรือแก้ตารางนี้ได้ ใช้ผ่าน API ฝั่งเซิร์ฟเวอร์เท่านั้น
ALTER TABLE house_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON house_pins FROM anon, authenticated;
