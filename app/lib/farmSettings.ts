// ============================================
// ค่าตั้งค่าฟาร์ม — ใช้ร่วมกันทั้งหน้าแอดมินและฝั่งเซิร์ฟเวอร์ (ไม่มีโค้ดเฉพาะเบราว์เซอร์)
// ============================================

export type ChickenSex = "male" | "female" | "mix";

const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

// ============================================
// ค่าตั้งค่าฟาร์ม (แก้ได้ในแท็บ "ตั้งค่า" ของแอดมิน เก็บในตาราง farm_settings)
// ค่าด้านล่างคือค่าเริ่มต้น ใช้เมื่อยังไม่เคยบันทึกการตั้งค่า
// ============================================
export interface BonusTier {
  minMultiple: number; // น้ำหนัก Wk1 ÷ น้ำหนักแรกเข้า ตั้งแต่กี่เท่า
  amount: number; // ได้โบนัสกี่บาท
}

export interface AlertSettings {
  enabled: boolean; // เปิด/ปิดการแจ้งเตือนทั้งหมด
  morningEnabled: boolean;
  morningTime: string; // "HH:MM" เวลาไทย — ถึงเวลานี้แล้วเล้าไหนยังไม่บันทึกช่วงเช้า จะแจ้งเตือน
  afternoonEnabled: boolean;
  afternoonTime: string;
  mentionAll: boolean; // แท็ก @All เมื่อส่งเข้ากลุ่ม LINE
}

export interface FarmSettings {
  weeklyTargetLoss: number[]; // เป้าการสูญเสีย (%) Wk1–Wk6
  houseAreas: Record<number, number>; // พื้นที่เล้า (ตร.ม.) เล้า 1–7
  weightStandards: Record<ChickenSex, number[]>; // น้ำหนักมาตรฐาน (กรัม) Wk1–Wk6
  bonusTiers: BonusTier[]; // โบนัสสัปดาห์ที่ 1
  alerts: AlertSettings; // แจ้งเตือนเล้าที่ยังไม่บันทึก
}

export const CHICKEN_SEX_LABELS: Record<ChickenSex, string> = {
  male: "ผู้ (Male)",
  female: "เมีย (Female)",
  mix: "คละ (Mix)",
};

export const DEFAULT_FARM_SETTINGS: FarmSettings = {
  weeklyTargetLoss: [0.6, 0.4, 0.3, 0.3, 0.4, 0.5],
  houseAreas: { 1: 3000, 2: 3000, 3: 3000, 4: 3000, 5: 3000, 6: 3000, 7: 2500 },
  weightStandards: {
    male: [203, 520, 1011, 1646, 2367, 3118],
    female: [204, 505, 945, 1488, 2084, 2684],
    mix: [204, 512, 978, 1567, 2226, 2901],
  },
  bonusTiers: [
    { minMultiple: 5, amount: 2200 },
    { minMultiple: 4.8, amount: 1600 },
    { minMultiple: 4.5, amount: 1000 },
  ],
  alerts: {
    enabled: true,
    morningEnabled: true,
    morningTime: "10:00",
    afternoonEnabled: true,
    afternoonTime: "17:00",
    mentionAll: true,
  },
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizeAlerts = (raw: unknown): AlertSettings => {
  const d = DEFAULT_FARM_SETTINGS.alerts;
  const a = (raw && typeof raw === "object" ? raw : {}) as Partial<AlertSettings>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const time = (v: unknown, fallback: string) =>
    typeof v === "string" && TIME.test(v) ? v : fallback;
  return {
    enabled: bool(a.enabled, d.enabled),
    morningEnabled: bool(a.morningEnabled, d.morningEnabled),
    morningTime: time(a.morningTime, d.morningTime),
    afternoonEnabled: bool(a.afternoonEnabled, d.afternoonEnabled),
    afternoonTime: time(a.afternoonTime, d.afternoonTime),
    mentionAll: bool(a.mentionAll, d.mentionAll),
  };
};

// รวมค่าที่บันทึกไว้กับค่าเริ่มต้น (ค่าไหนหายหรือผิดรูปแบบ ใช้ค่าเริ่มต้นแทน)
export const normalizeFarmSettings = (raw: unknown): FarmSettings => {
  const d = DEFAULT_FARM_SETTINGS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<FarmSettings>;
  const sixNumbers = (value: unknown, fallback: number[]) =>
    Array.isArray(value) && value.length === 6 && value.every(isNum) ? value : fallback;

  return {
    weeklyTargetLoss: sixNumbers(r.weeklyTargetLoss, d.weeklyTargetLoss),
    houseAreas: Object.fromEntries(
      HOUSE_NUMBERS.map((h) => {
        const v = (r.houseAreas as Record<number, unknown> | undefined)?.[h];
        return [h, isNum(v) && v > 0 ? v : d.houseAreas[h]];
      }),
    ),
    weightStandards: {
      male: sixNumbers(r.weightStandards?.male, d.weightStandards.male),
      female: sixNumbers(r.weightStandards?.female, d.weightStandards.female),
      mix: sixNumbers(r.weightStandards?.mix, d.weightStandards.mix),
    },
    bonusTiers:
      Array.isArray(r.bonusTiers) &&
      r.bonusTiers.every((t) => t && isNum(t.minMultiple) && isNum(t.amount))
        ? [...r.bonusTiers].sort((a, b) => b.minMultiple - a.minMultiple)
        : d.bonusTiers,
    alerts: normalizeAlerts(r.alerts),
  };
};

// แปลงค่าตั้งค่าให้อยู่ในรูปแบบที่โค้ดคำนวณเดิมใช้อยู่
export const buildFarmConstants = (settings: FarmSettings) => ({
  WEEKLY_TARGET_LOSS: settings.weeklyTargetLoss,
  HOUSE_AREAS: settings.houseAreas,
  WEIGHT_STANDARDS: {
    male: { label: CHICKEN_SEX_LABELS.male, weights: settings.weightStandards.male },
    female: { label: CHICKEN_SEX_LABELS.female, weights: settings.weightStandards.female },
    mix: { label: CHICKEN_SEX_LABELS.mix, weights: settings.weightStandards.mix },
  } as Record<ChickenSex, { label: string; weights: readonly number[] }>,
  BONUS_TIERS: settings.bonusTiers,
});

// โบนัสสัปดาห์ที่ 1 ตามเกณฑ์ (ขั้นสูงสุดที่ถึงก่อน)
export const calculateBonus = (multiple: number | null, tiers: BonusTier[]) => {
  if (multiple == null) return 0;
  const tier = [...tiers]
    .sort((a, b) => b.minMultiple - a.minMultiple)
    .find((t) => multiple >= t.minMultiple);
  return tier ? tier.amount : 0;
};


// เวลาปัจจุบันตามเวลาไทย (ใช้ได้ทั้งเบราว์เซอร์และเซิร์ฟเวอร์)
export const bangkokClock = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
