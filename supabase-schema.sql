-- ============================================
-- PJ Poultry System - Database Schema (ฉบับเต็ม)
-- ============================================
-- สร้างจากโครงสร้างฐานข้อมูลจริง (19 พ.ย. 2569) รวมกับไฟล์ใน supabase/migrations/ ทั้งหมด
--
-- ใช้เมื่อไหร่: ตั้งระบบใหม่ทั้งหมดบน Supabase project ใหม่ที่ยังว่าง
--   → เปิด SQL Editor วางไฟล์นี้ทั้งไฟล์แล้วกด Run ครั้งเดียว ไม่ต้องรันไฟล์ใน migrations ซ้ำ
-- ฐานข้อมูลที่ใช้งานอยู่แล้ว: ไม่ต้องรันไฟล์นี้ ให้รันเฉพาะไฟล์ใหม่ใน supabase/migrations/
--
-- หลักความปลอดภัย: หน้าเว็บไม่ต่อฐานข้อมูลตรง ทุกอย่างผ่าน API ฝั่งเซิร์ฟเวอร์ (service role)
-- ทุกตารางจึงเปิด RLS โดยไม่มี policy และถอนสิทธิ์ anon/authenticated ออกทั้งหมด
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Functions
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================
-- 1. users (ผู้ใช้งาน: แอดมิน / พนักงาน)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- scrypt hash (รหัสแบบข้อความธรรมดาจะถูก hash ให้อัตโนมัติตอน login ครั้งแรก)
  full_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('admin', 'worker')),
  house_number INTEGER CHECK ((house_number BETWEEN 1 AND 7) OR house_number IS NULL),
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER NOT NULL DEFAULT 0,  -- นับรหัสผิดติดกัน
  locked_until TIMESTAMPTZ,                     -- ล็อกชั่วคราวถึงเวลานี้
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_house ON users (house_number);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. batches (รุ่นไก่)
-- ============================================
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_name VARCHAR NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  initial_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  scheduled_end_date DATE,               -- ตั้งเวลาปิดรุ่นอัตโนมัติ
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_active ON batches (is_active) WHERE is_active = true;
-- เปิดใช้งานได้ทีละรุ่นเดียว
CREATE UNIQUE INDEX batches_only_one_active ON batches (is_active) WHERE is_active = true;

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. daily_records (บันทึกรายวันของแต่ละเล้า)
-- ============================================
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  house_number INTEGER NOT NULL CHECK (house_number BETWEEN 1 AND 7),
  record_date DATE NOT NULL,

  -- ช่วงเช้า
  morning_dead INTEGER DEFAULT 0,
  morning_culled INTEGER DEFAULT 0,
  morning_temp_outside NUMERIC,
  morning_temp_inside NUMERIC,
  morning_humidity NUMERIC,
  morning_water_meter NUMERIC,
  morning_recorded_by UUID REFERENCES users(id),
  morning_recorded_at TIMESTAMPTZ,

  -- ช่วงบ่าย
  afternoon_dead INTEGER DEFAULT 0,
  afternoon_culled INTEGER DEFAULT 0,
  afternoon_recorded_by UUID REFERENCES users(id),
  afternoon_recorded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (batch_id, house_number, record_date)
);

CREATE INDEX idx_daily_records_batch ON daily_records (batch_id);
CREATE INDEX idx_daily_records_house ON daily_records (house_number);
CREATE INDEX idx_daily_records_date ON daily_records (record_date);

CREATE TRIGGER update_daily_records_updated_at BEFORE UPDATE ON daily_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. activity_logs (ประวัติการทำรายการ)
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  description TEXT,
  record_date DATE,
  house_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_date ON activity_logs (created_at);
CREATE INDEX idx_activity_logs_record_date ON activity_logs (record_date);

-- ============================================
-- 5. batch_house_counts (ข้อมูลเล้าในแต่ละรุ่น: จำนวนไก่, สายพันธุ์, น้ำหนักรายสัปดาห์)
-- ============================================
CREATE TABLE batch_house_counts (
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  house_number SMALLINT NOT NULL CHECK (house_number BETWEEN 1 AND 7),
  initial_count INTEGER NOT NULL CHECK (initial_count > 0),
  arrival_date DATE,
  capture_date DATE,
  chicken_sex TEXT CHECK (chicken_sex IS NULL OR chicken_sex IN ('male', 'female', 'mix')),
  breed TEXT,
  initial_weight NUMERIC CHECK (initial_weight IS NULL OR initial_weight > 0),
  weekly_weight_1 NUMERIC,
  weekly_weight_2 NUMERIC,
  weekly_weight_3 NUMERIC,
  weekly_weight_4 NUMERIC,
  weekly_weight_5 NUMERIC,
  weekly_weight_6 NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (batch_id, house_number),
  CONSTRAINT batch_house_counts_capture_after_arrival_check
    CHECK (capture_date IS NULL OR arrival_date IS NULL OR capture_date >= arrival_date),
  CONSTRAINT batch_house_counts_weekly_weights_check CHECK (
    (weekly_weight_1 IS NULL OR weekly_weight_1 > 0) AND
    (weekly_weight_2 IS NULL OR weekly_weight_2 > 0) AND
    (weekly_weight_3 IS NULL OR weekly_weight_3 > 0) AND
    (weekly_weight_4 IS NULL OR weekly_weight_4 > 0) AND
    (weekly_weight_5 IS NULL OR weekly_weight_5 > 0) AND
    (weekly_weight_6 IS NULL OR weekly_weight_6 > 0)
  )
);

-- ============================================
-- 6. batch_house_weight_sessions (บันทึกการชั่งน้ำหนักแต่ละสัปดาห์)
-- ============================================
CREATE TABLE batch_house_weight_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  house_number SMALLINT NOT NULL CHECK (house_number BETWEEN 1 AND 7),
  week_number SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 6),
  sample_date DATE,
  birds_per_weighing INTEGER NOT NULL DEFAULT 50 CHECK (birds_per_weighing > 0),
  basket_weight_kg NUMERIC NOT NULL DEFAULT 0 CHECK (basket_weight_kg >= 0),
  deduction_per_bird_g NUMERIC NOT NULL DEFAULT 10 CHECK (deduction_per_bird_g >= 0),
  feed_kg NUMERIC CHECK (feed_kg IS NULL OR feed_kg > 0),
  measurements JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 9 จุด × 2 รอบ
  total_weight_kg NUMERIC NOT NULL CHECK (total_weight_kg > 0),
  total_birds INTEGER NOT NULL CHECK (total_birds > 0),
  raw_average_g NUMERIC NOT NULL CHECK (raw_average_g > 0),
  adjusted_average_g NUMERIC NOT NULL CHECK (adjusted_average_g > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (batch_id, house_number, week_number)
);

CREATE INDEX batch_house_weight_sessions_batch_idx
  ON batch_house_weight_sessions (batch_id, house_number, week_number);

-- ============================================
-- 7. house_pins (รหัสประจำเล้า สำหรับพนักงานเข้าระบบ)
-- ============================================
CREATE TABLE house_pins (
  house_number INTEGER PRIMARY KEY CHECK (house_number BETWEEN 1 AND 7),
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. farm_settings (ค่าตั้งค่าฟาร์ม: เป้าการสูญเสีย, พื้นที่เล้า, น้ำหนักมาตรฐาน, โบนัส)
-- ============================================
CREATE TABLE farm_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Views
-- ============================================
CREATE OR REPLACE VIEW daily_summary AS
SELECT
  batch_id,
  house_number,
  record_date,
  COALESCE(morning_dead, 0) + COALESCE(afternoon_dead, 0) AS total_dead,
  COALESCE(morning_culled, 0) + COALESCE(afternoon_culled, 0) AS total_culled,
  COALESCE(morning_dead, 0) + COALESCE(afternoon_dead, 0) +
    COALESCE(morning_culled, 0) + COALESCE(afternoon_culled, 0) AS total_loss,
  morning_temp_outside,
  morning_temp_inside,
  morning_humidity,
  morning_water_meter
FROM daily_records dr;

CREATE OR REPLACE VIEW cumulative_loss AS
SELECT
  batch_id,
  house_number,
  record_date,
  SUM(COALESCE(morning_dead, 0) + COALESCE(afternoon_dead, 0) +
      COALESCE(morning_culled, 0) + COALESCE(afternoon_culled, 0))
    OVER (PARTITION BY batch_id, house_number ORDER BY record_date) AS cumulative_total
FROM daily_records
ORDER BY batch_id, house_number, record_date;

-- ============================================
-- ปิดรุ่นอัตโนมัติเมื่อถึงวันที่ตั้งไว้ (หน้าแอดมินเรียกผ่านเซิร์ฟเวอร์ตอนโหลดข้อมูล)
-- ============================================
CREATE OR REPLACE FUNCTION public.close_scheduled_batches()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  update public.batches
  set
    is_active = false,
    end_date = coalesce(end_date, scheduled_end_date),
    scheduled_end_date = null,
    closed_at = now()
  where is_active = true
    and scheduled_end_date is not null
    and scheduled_end_date <= (now() at time zone 'Asia/Bangkok')::date;
$function$;

-- ============================================
-- ความปลอดภัย: เปิด RLS ทุกตาราง (ไม่มี policy) และถอนสิทธิ์กุญแจสาธารณะ
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_house_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_house_weight_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON users, batches, daily_records, activity_logs, batch_house_counts,
  batch_house_weight_sessions, house_pins, farm_settings
  FROM anon, authenticated;
REVOKE ALL ON daily_summary, cumulative_loss FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION close_scheduled_batches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_scheduled_batches() TO service_role;

-- ============================================
-- บัญชีแอดมินเริ่มต้น
-- ============================================
-- รหัสด้านล่างเป็นข้อความธรรมดาชั่วคราว ระบบจะเข้ารหัสให้เองตอน login ครั้งแรก
-- ⚠️ login แล้วให้ไปที่แท็บ "จัดการผู้ใช้" > ตั้ง PIN ใหม่ ให้บัญชีแอดมินทันที
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'change-me-now', 'ผู้ดูแลระบบ', 'admin');

-- พนักงานและรหัสประจำเล้า เพิ่มได้จากหน้าแอดมิน (แท็บ "จัดการผู้ใช้")
