// app/lib/dateUtils.ts
// ============================================
// Helper functions สำหรับจัดการเวลาไทย (GMT+7)
// ============================================

/**
 * รับวันที่ปัจจุบันในไทย (GMT+7) แบบ YYYY-MM-DD
 */
export const getTodayThailand = (): string => {
  const now = new Date();
  // แปลงเป็นเวลาไทย (UTC+7)
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  
  const year = thailandTime.getFullYear();
  const month = String(thailandTime.getMonth() + 1).padStart(2, '0');
  const day = String(thailandTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * รับ Timestamp ปัจจุบันในไทย (GMT+7) แบบ ISO
 */
export const getNowThailand = (): string => {
  const now = new Date();
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return thailandTime.toISOString();
};

/**
 * แปลง Date เป็นรูปแบบไทย
 */
export const formatThaiDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Bangkok'
  });
};

/**
 * แปลง DateTime เป็นรูปแบบไทย
 */
export const formatThaiDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
  });
};

/**
 * เช็คว่าวันที่เป็นวันนี้ (ไทย) หรือไม่
 */
export const isToday = (date: string): boolean => {
  return date === getTodayThailand();
};

/**
 * คำนวณจำนวนวันตั้งแต่วันที่เริ่มต้น (ไทย)
 */
export const daysSince = (startDate: string): number => {
  const start = new Date(startDate + 'T00:00:00+07:00');
  const today = new Date(getTodayThailand() + 'T00:00:00+07:00');
  const diffTime = Math.abs(today.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};