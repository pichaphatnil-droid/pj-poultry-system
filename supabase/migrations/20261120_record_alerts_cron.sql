-- ============================================
-- ตั้งเวลาให้ Supabase เรียกเว็บทุก 15 นาที เพื่อเช็กเล้าที่ยังไม่บันทึก
-- (Vercel แพ็กเกจฟรีตั้งเวลาได้วันละครั้งเท่านั้น จึงใช้ตัวตั้งเวลาของ Supabase แทน)
--
-- ก่อนรัน แก้ 2 จุดด้านล่าง:
--   1) https://YOUR-SITE.vercel.app  → ที่อยู่เว็บจริงของคุณ
--   2) YOUR_CRON_SECRET              → ค่าเดียวกับ CRON_SECRET ใน Vercel
-- เวลาแจ้งเตือนจริงตั้งในหน้าเว็บ (ตั้งค่า > การแจ้งเตือน) ไม่ต้องแก้ไฟล์นี้
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ลบของเดิม (ถ้าเคยรันแล้ว) แล้วตั้งใหม่
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pj-record-alerts';

SELECT cron.schedule(
  'pj-record-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-SITE.vercel.app/api/cron/record-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ปิดการตั้งเวลา (ถ้าไม่ต้องการแล้ว):
--   SELECT cron.unschedule('pj-record-alerts');
