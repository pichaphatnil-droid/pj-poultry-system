-- ============================================
-- แจ้งเตือนเล้าที่ยังไม่บันทึกข้อมูล (ส่ง LINE)
-- ============================================

-- ผู้รับแจ้งเตือน: บันทึกอัตโนมัติเมื่อมีคนเพิ่มเพื่อน LINE OA หรือเชิญเข้ากลุ่ม
-- ต้องให้แอดมินกดเปิดใช้งานก่อน ถึงจะได้รับแจ้งเตือน (enabled = true)
CREATE TABLE IF NOT EXISTS line_recipients (
  id TEXT PRIMARY KEY,                       -- LINE userId / groupId / roomId
  kind TEXT NOT NULL CHECK (kind IN ('user', 'group', 'room')),
  name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ประวัติการเช็ก (วันละ 1 แถวต่อช่วง กันส่งซ้ำ)
CREATE TABLE IF NOT EXISTS alert_log (
  alert_date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon')),
  missing_houses INTEGER[] NOT NULL DEFAULT '{}',
  sent_to INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (alert_date, period)
);

ALTER TABLE line_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON line_recipients, alert_log FROM anon, authenticated;
