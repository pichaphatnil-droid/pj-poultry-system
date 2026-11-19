-- ============================================
-- ตารางตั้งค่าฟาร์ม (แท็บ "ตั้งค่า" ของแอดมิน)
-- เก็บเป็นแถวเดียว (id = 1) ค่าเป็น JSON: เป้าการสูญเสีย, พื้นที่เล้า, น้ำหนักมาตรฐาน, ขั้นโบนัส
-- ถ้ายังไม่มีแถว ระบบใช้ค่าเริ่มต้นในโค้ด (app/admin/shared.ts)
-- ============================================

CREATE TABLE IF NOT EXISTS farm_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON farm_settings FROM anon, authenticated;
