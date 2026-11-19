"use client";

import { getTodayThailand } from "../lib/dateUtils";
import type { Batch } from "../types";


export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  record_date: string | null;
  house_number: number | null;
  created_at: string;
  users?: { full_name: string; house_number: number | null };
}

export interface AdminBatch extends Batch {
  scheduled_end_date?: string | null;
  closed_at?: string | null;
}

export interface BatchHouseCount {
  batch_id: string;
  house_number: number;
  initial_count: number;
  arrival_date: string | null;
  capture_date: string | null;
  chicken_sex: ChickenSex | null;
  breed: string | null;
  initial_weight: number | null;
  weekly_weight_1: number | null;
  weekly_weight_2: number | null;
  weekly_weight_3: number | null;
  weekly_weight_4: number | null;
  weekly_weight_5: number | null;
  weekly_weight_6: number | null;
}

export interface WeightMeasurementSession {
  batch_id: string;
  house_number: number;
  week_number: number;
  sample_date: string | null;
  birds_per_weighing: number;
  basket_weight_kg: number;
  deduction_per_bird_g: number;
  measurements: Array<[number | null, number | null]>;
  total_weight_kg: number;
  total_birds: number;
  raw_average_g: number;
  adjusted_average_g: number;
}

export interface WeightCalculatorInput {
  sampleDate: string;
  birdsPerWeighing: string;
  totalBirdsOverride: string;
  basketWeightKg: string;
  deductionPerBirdG: string;
  measurements: Record<string, [string, string]>;
}

export type HouseChartMetric = "dead" | "culled" | "total";
export type ChickenSex = "male" | "female" | "mix";

export interface HouseDetailInput {
  arrivalDate: string;
  captureDate: string;
  chickenSex: ChickenSex | "";
  breed: string;
  initialWeight: string;
}

export const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKLY_WEIGHT_FIELDS = [
  "weekly_weight_1",
  "weekly_weight_2",
  "weekly_weight_3",
  "weekly_weight_4",
  "weekly_weight_5",
  "weekly_weight_6",
] as const;
export const BATCH_HOUSE_SELECT =
  "batch_id, house_number, initial_count, arrival_date, capture_date, chicken_sex, breed, initial_weight, weekly_weight_1, weekly_weight_2, weekly_weight_3, weekly_weight_4, weekly_weight_5, weekly_weight_6";
export const WEIGHT_SESSION_SELECT =
  "batch_id, house_number, week_number, sample_date, birds_per_weighing, basket_weight_kg, deduction_per_bird_g, measurements, total_weight_kg, total_birds, raw_average_g, adjusted_average_g";
export const WEIGHING_POSITIONS = [
  { key: "front_left", zone: "หน้า", side: "ซ้าย" },
  { key: "front_center", zone: "หน้า", side: "กลาง" },
  { key: "front_right", zone: "หน้า", side: "ขวา" },
  { key: "middle_left", zone: "กลาง", side: "ซ้าย" },
  { key: "middle_center", zone: "กลาง", side: "กลาง" },
  { key: "middle_right", zone: "กลาง", side: "ขวา" },
  { key: "rear_left", zone: "ท้าย", side: "ซ้าย" },
  { key: "rear_center", zone: "ท้าย", side: "กลาง" },
  { key: "rear_right", zone: "ท้าย", side: "ขวา" },
] as const;
export const WEIGHT_SUMMARY_CARD_CLASSES: Record<string, string> = {
  gray: "bg-gray-50 border-gray-200",
  blue: "bg-blue-50 border-blue-100",
  cyan: "bg-cyan-50 border-cyan-100",
  amber: "bg-amber-50 border-amber-100",
  emerald: "bg-emerald-50 border-emerald-100",
  lime: "bg-lime-50 border-lime-100",
  purple: "bg-purple-50 border-purple-100",
  green: "bg-green-50 border-green-100",
  red: "bg-red-50 border-red-100",
};

// ============================================
// ค่าตั้งค่าฟาร์ม (แก้ได้ในแท็บ "ตั้งค่า" ของแอดมิน เก็บในตาราง farm_settings)
// ค่าด้านล่างคือค่าเริ่มต้น ใช้เมื่อยังไม่เคยบันทึกการตั้งค่า
// ============================================
export interface BonusTier {
  minMultiple: number; // น้ำหนัก Wk1 ÷ น้ำหนักแรกเข้า ตั้งแต่กี่เท่า
  amount: number; // ได้โบนัสกี่บาท
}

export interface FarmSettings {
  weeklyTargetLoss: number[]; // เป้าการสูญเสีย (%) Wk1–Wk6
  houseAreas: Record<number, number>; // พื้นที่เล้า (ตร.ม.) เล้า 1–7
  weightStandards: Record<ChickenSex, number[]>; // น้ำหนักมาตรฐาน (กรัม) Wk1–Wk6
  bonusTiers: BonusTier[]; // โบนัสสัปดาห์ที่ 1
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
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

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

export const createEmptyHouseCountInputs = (): Record<number, string> =>
  Object.fromEntries(HOUSE_NUMBERS.map((house) => [house, ""]));

export const createEmptyHouseDetailInputs = (): Record<number, HouseDetailInput> =>
  Object.fromEntries(
    HOUSE_NUMBERS.map((house) => [
      house,
      {
        arrivalDate: "",
        captureDate: "",
        chickenSex: "",
        breed: "",
        initialWeight: "",
      },
    ]),
  );

export const createEmptyWeeklyWeightInputs = (): Record<number, string[]> =>
  Object.fromEntries(
    HOUSE_NUMBERS.map((house) => [house, WEEKLY_WEIGHT_FIELDS.map(() => "")]),
  );

export const createWeeklyWeightInputs = (
  rows: BatchHouseCount[],
): Record<number, string[]> => {
  const inputs = createEmptyWeeklyWeightInputs();

  rows.forEach((row) => {
    inputs[row.house_number] = WEEKLY_WEIGHT_FIELDS.map((field) =>
      row[field] == null ? "" : String(row[field]),
    );
  });

  return inputs;
};

export const createEmptyWeightCalculatorInput = (): WeightCalculatorInput => ({
  sampleDate: getTodayThailand(),
  birdsPerWeighing: "50",
  totalBirdsOverride: "",
  basketWeightKg: "0",
  deductionPerBirdG: "10",
  measurements: Object.fromEntries(
    WEIGHING_POSITIONS.map((position) => [position.key, ["", ""]]),
  ),
});

export const createWeightCalculatorInput = (
  session?: WeightMeasurementSession,
): WeightCalculatorInput => {
  if (!session) return createEmptyWeightCalculatorInput();

  const completedReadingCount =
    session.measurements?.flat().filter((value) => value != null).length ?? 0;
  const automaticTotalBirds =
    completedReadingCount * (session.birds_per_weighing || 50);

  return {
    sampleDate: session.sample_date || getTodayThailand(),
    birdsPerWeighing: String(session.birds_per_weighing || 50),
    totalBirdsOverride:
      session.total_birds > 0 && session.total_birds !== automaticTotalBirds
        ? String(session.total_birds)
        : "",
    basketWeightKg: String(session.basket_weight_kg ?? 0),
    deductionPerBirdG: String(session.deduction_per_bird_g ?? 10),
    measurements: Object.fromEntries(
      WEIGHING_POSITIONS.map((position, index) => [
        position.key,
        [
          session.measurements?.[index]?.[0] == null
            ? ""
            : String(session.measurements[index][0]),
          session.measurements?.[index]?.[1] == null
            ? ""
            : String(session.measurements[index][1]),
        ],
      ]),
    ),
  };
};
