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
import type { ChickenSex } from "../lib/farmSettings";
export type {
  AlertSettings,
  BonusTier,
  ChickenSex,
  FarmSettings,
} from "../lib/farmSettings";
export {
  CHICKEN_SEX_LABELS,
  DEFAULT_FARM_SETTINGS,
  bangkokClock,
  buildFarmConstants,
  calculateBonus,
  normalizeFarmSettings,
  timeToMinutes,
} from "../lib/farmSettings";

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
