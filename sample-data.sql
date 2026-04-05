-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================
-- คำแนะนำ: รันไฟล์นี้หลังจากรัน supabase-schema.sql เรียบร้อยแล้ว
-- เพื่อสร้างข้อมูลตัวอย่างสำหรับทดสอบระบบ

-- ============================================
-- 1. สร้างรุ่นทดสอบ
-- ============================================

-- หมายเหตุ: แทนที่วันที่ด้วยวันที่ปัจจุบันหรือวันที่ต้องการ
INSERT INTO batches (batch_name, start_date, initial_count, is_active) 
VALUES ('รุ่นทดสอบ 2024-01', '2024-01-01', 50000, true);

-- ดึง batch_id ที่เพิ่งสร้าง (สำหรับใช้ในคำสั่งถัดไป)
-- วิธีดู: SELECT id FROM batches WHERE batch_name = 'รุ่นทดสอบ 2024-01';
-- คัดลอก UUID มาแทนที่ 'YOUR_BATCH_ID' ด้านล่าง

-- ============================================
-- 2. สร้างข้อมูลบันทึกรายวัน (ตัวอย่าง 7 วันแรก)
-- ============================================

-- วันที่ 1
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
-- แทนที่ 'YOUR_BATCH_ID' ด้วย UUID จริง
('YOUR_BATCH_ID', 1, '2024-01-01', 5, 2, 28.5, 30.2, 65.0, 3, 1),
('YOUR_BATCH_ID', 2, '2024-01-01', 4, 1, 28.3, 29.8, 64.5, 2, 0),
('YOUR_BATCH_ID', 3, '2024-01-01', 6, 3, 28.7, 30.5, 66.0, 4, 2),
('YOUR_BATCH_ID', 4, '2024-01-01', 3, 1, 28.2, 29.5, 63.5, 2, 1),
('YOUR_BATCH_ID', 5, '2024-01-01', 5, 2, 28.6, 30.0, 65.5, 3, 0),
('YOUR_BATCH_ID', 6, '2024-01-01', 4, 2, 28.4, 29.9, 64.8, 2, 1),
('YOUR_BATCH_ID', 7, '2024-01-01', 7, 3, 28.8, 30.3, 66.2, 5, 2);

-- วันที่ 2
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-02', 4, 1, 27.5, 29.2, 62.0, 2, 1),
('YOUR_BATCH_ID', 2, '2024-01-02', 5, 2, 27.3, 28.8, 61.5, 3, 0),
('YOUR_BATCH_ID', 3, '2024-01-02', 5, 2, 27.7, 29.5, 63.0, 3, 1),
('YOUR_BATCH_ID', 4, '2024-01-02', 3, 1, 27.2, 28.5, 60.5, 2, 0),
('YOUR_BATCH_ID', 5, '2024-01-02', 6, 2, 27.6, 29.0, 62.5, 4, 1),
('YOUR_BATCH_ID', 6, '2024-01-02', 4, 1, 27.4, 28.9, 61.8, 2, 0),
('YOUR_BATCH_ID', 7, '2024-01-02', 6, 3, 27.8, 29.3, 63.2, 4, 2);

-- วันที่ 3
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-03', 3, 1, 29.5, 31.2, 67.0, 2, 0),
('YOUR_BATCH_ID', 2, '2024-01-03', 4, 2, 29.3, 30.8, 66.5, 2, 1),
('YOUR_BATCH_ID', 3, '2024-01-03', 5, 2, 29.7, 31.5, 68.0, 3, 1),
('YOUR_BATCH_ID', 4, '2024-01-03', 2, 1, 29.2, 30.5, 65.5, 1, 0),
('YOUR_BATCH_ID', 5, '2024-01-03', 4, 1, 29.6, 31.0, 67.5, 3, 1),
('YOUR_BATCH_ID', 6, '2024-01-03', 3, 1, 29.4, 30.9, 66.8, 2, 0),
('YOUR_BATCH_ID', 7, '2024-01-03', 6, 2, 29.8, 31.3, 68.2, 4, 1);

-- วันที่ 4
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-04', 4, 2, 28.0, 29.7, 64.0, 3, 1),
('YOUR_BATCH_ID', 2, '2024-01-04', 3, 1, 27.8, 29.3, 63.5, 2, 0),
('YOUR_BATCH_ID', 3, '2024-01-04', 5, 2, 28.2, 30.0, 65.0, 3, 2),
('YOUR_BATCH_ID', 4, '2024-01-04', 3, 1, 27.7, 29.0, 62.5, 2, 0),
('YOUR_BATCH_ID', 5, '2024-01-04', 5, 2, 28.1, 29.5, 64.5, 3, 1),
('YOUR_BATCH_ID', 6, '2024-01-04', 4, 1, 27.9, 29.4, 63.8, 2, 1),
('YOUR_BATCH_ID', 7, '2024-01-04', 6, 3, 28.3, 29.8, 65.2, 4, 2);

-- วันที่ 5
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-05', 3, 1, 28.5, 30.2, 65.0, 2, 1),
('YOUR_BATCH_ID', 2, '2024-01-05', 4, 2, 28.3, 29.8, 64.5, 2, 0),
('YOUR_BATCH_ID', 3, '2024-01-05', 4, 2, 28.7, 30.5, 66.0, 3, 1),
('YOUR_BATCH_ID', 4, '2024-01-05', 2, 1, 28.2, 29.5, 63.5, 1, 0),
('YOUR_BATCH_ID', 5, '2024-01-05', 5, 2, 28.6, 30.0, 65.5, 3, 1),
('YOUR_BATCH_ID', 6, '2024-01-05', 3, 1, 28.4, 29.9, 64.8, 2, 0),
('YOUR_BATCH_ID', 7, '2024-01-05', 5, 3, 28.8, 30.3, 66.2, 4, 2);

-- วันที่ 6
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-06', 4, 2, 27.5, 29.2, 62.0, 2, 1),
('YOUR_BATCH_ID', 2, '2024-01-06', 3, 1, 27.3, 28.8, 61.5, 2, 0),
('YOUR_BATCH_ID', 3, '2024-01-06', 5, 2, 27.7, 29.5, 63.0, 3, 1),
('YOUR_BATCH_ID', 4, '2024-01-06', 3, 1, 27.2, 28.5, 60.5, 2, 0),
('YOUR_BATCH_ID', 5, '2024-01-06', 4, 2, 27.6, 29.0, 62.5, 3, 1),
('YOUR_BATCH_ID', 6, '2024-01-06', 3, 1, 27.4, 28.9, 61.8, 2, 0),
('YOUR_BATCH_ID', 7, '2024-01-06', 6, 2, 27.8, 29.3, 63.2, 4, 1);

-- วันที่ 7
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, morning_temp_outside, morning_temp_inside, morning_humidity, afternoon_dead, afternoon_culled)
VALUES 
('YOUR_BATCH_ID', 1, '2024-01-07', 5, 2, 29.0, 30.7, 66.0, 3, 1),
('YOUR_BATCH_ID', 2, '2024-01-07', 4, 1, 28.8, 30.3, 65.5, 2, 1),
('YOUR_BATCH_ID', 3, '2024-01-07', 6, 3, 29.2, 31.0, 67.0, 4, 2),
('YOUR_BATCH_ID', 4, '2024-01-07', 3, 1, 28.7, 30.0, 64.5, 2, 0),
('YOUR_BATCH_ID', 5, '2024-01-07', 5, 2, 29.1, 30.5, 66.5, 3, 1),
('YOUR_BATCH_ID', 6, '2024-01-07', 4, 2, 28.9, 30.4, 65.8, 2, 1),
('YOUR_BATCH_ID', 7, '2024-01-07', 7, 3, 29.3, 30.8, 67.2, 5, 2);

-- ============================================
-- 3. ตรวจสอบข้อมูล
-- ============================================

-- ตรวจสอบว่ามีข้อมูลกี่ record
SELECT COUNT(*) as total_records FROM daily_records;

-- ดูสรุปข้อมูลแต่ละเล้า
SELECT 
  house_number,
  COUNT(*) as total_days,
  SUM(COALESCE(morning_dead, 0) + COALESCE(afternoon_dead, 0)) as total_dead,
  SUM(COALESCE(morning_culled, 0) + COALESCE(afternoon_culled, 0)) as total_culled
FROM daily_records
GROUP BY house_number
ORDER BY house_number;

-- ============================================
-- 4. ข้อมูลเพิ่มเติม (Optional)
-- ============================================

-- เพิ่มข้อมูลมิเตอร์น้ำ (ถ้าต้องการ)
UPDATE daily_records 
SET morning_water_meter = 1000.00 + (EXTRACT(DAY FROM record_date) * 50)
WHERE house_number = 1;

UPDATE daily_records 
SET morning_water_meter = 1100.00 + (EXTRACT(DAY FROM record_date) * 55)
WHERE house_number = 2;

UPDATE daily_records 
SET morning_water_meter = 1050.00 + (EXTRACT(DAY FROM record_date) * 52)
WHERE house_number = 3;

UPDATE daily_records 
SET morning_water_meter = 1200.00 + (EXTRACT(DAY FROM record_date) * 60)
WHERE house_number = 4;

UPDATE daily_records 
SET morning_water_meter = 1150.00 + (EXTRACT(DAY FROM record_date) * 57)
WHERE house_number = 5;

UPDATE daily_records 
SET morning_water_meter = 1080.00 + (EXTRACT(DAY FROM record_date) * 54)
WHERE house_number = 6;

UPDATE daily_records 
SET morning_water_meter = 1250.00 + (EXTRACT(DAY FROM record_date) * 62)
WHERE house_number = 7;

-- ============================================
-- DONE!
-- ============================================
-- ตอนนี้คุณสามารถ login เข้าระบบและดูข้อมูลตัวอย่างได้แล้ว
