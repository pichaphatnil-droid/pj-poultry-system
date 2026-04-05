-- ============================================
-- PJ Poultry System - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users Table (ผู้ใช้งาน)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'worker')),
  house_number INTEGER CHECK (house_number BETWEEN 1 AND 7 OR house_number IS NULL),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_house ON users(house_number);

-- ============================================
-- 2. Batches Table (รุ่นไก่)
-- ============================================
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  initial_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active batch
CREATE INDEX idx_batches_active ON batches(is_active) WHERE is_active = true;

-- ============================================
-- 3. Daily Records Table (บันทึกรายวัน)
-- ============================================
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  house_number INTEGER NOT NULL CHECK (house_number BETWEEN 1 AND 7),
  record_date DATE NOT NULL,
  
  -- Morning data
  morning_dead INTEGER DEFAULT 0,
  morning_culled INTEGER DEFAULT 0,
  morning_temp_outside DECIMAL(5,2),
  morning_temp_inside DECIMAL(5,2),
  morning_humidity DECIMAL(5,2),
  morning_water_meter DECIMAL(10,2),
  morning_recorded_by UUID REFERENCES users(id),
  morning_recorded_at TIMESTAMP WITH TIME ZONE,
  
  -- Afternoon data
  afternoon_dead INTEGER DEFAULT 0,
  afternoon_culled INTEGER DEFAULT 0,
  afternoon_recorded_by UUID REFERENCES users(id),
  afternoon_recorded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one record per house per day per batch
  UNIQUE(batch_id, house_number, record_date)
);

-- Indexes for faster queries
CREATE INDEX idx_daily_records_batch ON daily_records(batch_id);
CREATE INDEX idx_daily_records_house ON daily_records(house_number);
CREATE INDEX idx_daily_records_date ON daily_records(record_date);

-- ============================================
-- 4. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- Batches policies
CREATE POLICY "All authenticated users can view batches"
  ON batches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage batches"
  ON batches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- Daily records policies
CREATE POLICY "All authenticated users can view records"
  ON daily_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can insert/update their house records"
  ON daily_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND (role = 'admin' OR house_number = daily_records.house_number)
    )
  );

CREATE POLICY "Workers can update their house records"
  ON daily_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND (role = 'admin' OR house_number = daily_records.house_number)
    )
  );

CREATE POLICY "Admins can delete records"
  ON daily_records FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- ============================================
-- 5. Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_records_updated_at BEFORE UPDATE ON daily_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Initial Data (ตัวอย่าง)
-- ============================================

-- Insert default admin (password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'ผู้ดูแลระบบ', 'admin');

-- Insert sample workers (password: worker123)
INSERT INTO users (username, password_hash, full_name, role, house_number) VALUES
('worker1', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 1', 'worker', 1),
('worker2', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 2', 'worker', 2),
('worker3', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 3', 'worker', 3),
('worker4', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 4', 'worker', 4),
('worker5', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 5', 'worker', 5),
('worker6', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 6', 'worker', 6),
('worker7', '$2a$10$YourHashedPasswordHere', 'พนักงานเล้า 7', 'worker', 7);

-- ============================================
-- 7. Views for Analytics
-- ============================================

-- View: Daily summary per house
CREATE OR REPLACE VIEW daily_summary AS
SELECT 
  dr.batch_id,
  dr.house_number,
  dr.record_date,
  COALESCE(dr.morning_dead, 0) + COALESCE(dr.afternoon_dead, 0) as total_dead,
  COALESCE(dr.morning_culled, 0) + COALESCE(dr.afternoon_culled, 0) as total_culled,
  COALESCE(dr.morning_dead, 0) + COALESCE(dr.afternoon_dead, 0) + 
  COALESCE(dr.morning_culled, 0) + COALESCE(dr.afternoon_culled, 0) as total_loss,
  dr.morning_temp_outside,
  dr.morning_temp_inside,
  dr.morning_humidity,
  dr.morning_water_meter
FROM daily_records dr;

-- View: Cumulative loss per house per batch
CREATE OR REPLACE VIEW cumulative_loss AS
SELECT 
  batch_id,
  house_number,
  record_date,
  SUM(COALESCE(morning_dead, 0) + COALESCE(afternoon_dead, 0) + 
      COALESCE(morning_culled, 0) + COALESCE(afternoon_culled, 0)) 
    OVER (PARTITION BY batch_id, house_number ORDER BY record_date) as cumulative_total
FROM daily_records
ORDER BY batch_id, house_number, record_date;
