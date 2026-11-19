"use client";

import { useState } from "react";
import {
  CHICKEN_SEX_LABELS,
  DEFAULT_FARM_SETTINGS,
  HOUSE_NUMBERS,
  type ChickenSex,
  type FarmSettings,
} from "../shared";
import { useAdmin } from "../AdminContext";

const WEEKS = [1, 2, 3, 4, 5, 6];
const SEXES = Object.keys(CHICKEN_SEX_LABELS) as ChickenSex[];

// ฟอร์มเก็บเป็นข้อความ เพื่อให้พิมพ์/ลบตัวเลขได้อิสระ แล้วค่อยแปลงตอนบันทึก
type Form = {
  weeklyTargetLoss: string[];
  houseAreas: Record<number, string>;
  weightStandards: Record<ChickenSex, string[]>;
  bonusTiers: { minMultiple: string; amount: string }[];
};

const toForm = (s: FarmSettings): Form => ({
  weeklyTargetLoss: s.weeklyTargetLoss.map(String),
  houseAreas: Object.fromEntries(HOUSE_NUMBERS.map((h) => [h, String(s.houseAreas[h])])),
  weightStandards: {
    male: s.weightStandards.male.map(String),
    female: s.weightStandards.female.map(String),
    mix: s.weightStandards.mix.map(String),
  },
  bonusTiers: s.bonusTiers.map((t) => ({
    minMultiple: String(t.minMultiple),
    amount: String(t.amount),
  })),
});

const num = (value: string) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export default function SettingsTab() {
  const { farmSettings, savingFarmSettings, handleSaveFarmSettings } = useAdmin();
  const [form, setForm] = useState<Form>(() => toForm(farmSettings));
  const [error, setError] = useState("");

  const handleSave = async () => {
    const next: FarmSettings = {
      weeklyTargetLoss: form.weeklyTargetLoss.map(num),
      houseAreas: Object.fromEntries(HOUSE_NUMBERS.map((h) => [h, num(form.houseAreas[h])])),
      weightStandards: {
        male: form.weightStandards.male.map(num),
        female: form.weightStandards.female.map(num),
        mix: form.weightStandards.mix.map(num),
      },
      bonusTiers: form.bonusTiers
        .filter((t) => t.minMultiple.trim() || t.amount.trim())
        .map((t) => ({ minMultiple: num(t.minMultiple), amount: num(t.amount) })),
    };

    const all = [
      ...next.weeklyTargetLoss,
      ...Object.values(next.houseAreas),
      ...next.weightStandards.male,
      ...next.weightStandards.female,
      ...next.weightStandards.mix,
      ...next.bonusTiers.flatMap((t) => [t.minMultiple, t.amount]),
    ];
    if (all.some((n) => !Number.isFinite(n) || n < 0)) {
      setError("กรุณากรอกตัวเลขให้ครบทุกช่อง และห้ามติดลบ");
      return;
    }
    setError("");
    await handleSaveFarmSettings(next);
  };

  const setLoss = (i: number, v: string) =>
    setForm((f) => ({ ...f, weeklyTargetLoss: f.weeklyTargetLoss.map((x, j) => (j === i ? v : x)) }));
  const setArea = (h: number, v: string) =>
    setForm((f) => ({ ...f, houseAreas: { ...f.houseAreas, [h]: v } }));
  const setStandard = (sex: ChickenSex, i: number, v: string) =>
    setForm((f) => ({
      ...f,
      weightStandards: {
        ...f.weightStandards,
        [sex]: f.weightStandards[sex].map((x, j) => (j === i ? v : x)),
      },
    }));
  const setTier = (i: number, key: "minMultiple" | "amount", v: string) =>
    setForm((f) => ({
      ...f,
      bonusTiers: f.bonusTiers.map((t, j) => (j === i ? { ...t, [key]: v } : t)),
    }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">ตั้งค่าฟาร์ม</h2>
        <p className="text-sm text-gray-500 mt-1">
          ค่าที่ใช้คำนวณในตารางสรุป ประสิทธิภาพรายสัปดาห์ และการคำนวณน้ำหนัก
          แก้แล้วกด &quot;บันทึก&quot; ระบบจะคำนวณใหม่ทันที (ไม่กระทบข้อมูลที่บันทึกไว้)
        </p>
      </div>

      {/* เป้าการสูญเสีย */}
      <section className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">เป้าการสูญเสียรายสัปดาห์ (%)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {WEEKS.map((w, i) => (
            <label key={w} className="text-sm text-gray-600">
              Wk{w}
              <input
                value={form.weeklyTargetLoss[i]}
                onChange={(e) => setLoss(i, e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      {/* พื้นที่เล้า */}
      <section className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">พื้นที่เล้า (ตร.ม.)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          {HOUSE_NUMBERS.map((h) => (
            <label key={h} className="text-sm text-gray-600">
              เล้า {h}
              <input
                value={form.houseAreas[h]}
                onChange={(e) => setArea(h, e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      {/* น้ำหนักมาตรฐาน */}
      <section className="bg-white rounded-lg shadow-sm p-5 overflow-x-auto">
        <h3 className="font-semibold text-gray-800 mb-3">น้ำหนักมาตรฐาน (กรัม)</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left font-medium pr-3 py-1">เพศ</th>
              {WEEKS.map((w) => (
                <th key={w} className="font-medium px-1 py-1">
                  Wk{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEXES.map((sex) => (
              <tr key={sex}>
                <td className="pr-3 py-1 whitespace-nowrap text-gray-700">
                  {CHICKEN_SEX_LABELS[sex]}
                </td>
                {WEEKS.map((w, i) => (
                  <td key={w} className="px-1 py-1 min-w-[80px]">
                    <input
                      value={form.weightStandards[sex][i]}
                      onChange={(e) => setStandard(sex, i, e.target.value)}
                      inputMode="decimal"
                      className={inputClass}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* โบนัส */}
      <section className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="font-semibold text-gray-800">โบนัสสัปดาห์ที่ 1</h3>
        <p className="text-sm text-gray-500 mb-3">
          ถ้า น้ำหนัก Wk1 ÷ น้ำหนักแรกเข้า ถึงเกณฑ์ ได้โบนัสตามขั้นสูงสุดที่ถึง
        </p>
        <div className="space-y-2">
          {form.bonusTiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">ตั้งแต่</span>
              <input
                value={t.minMultiple}
                onChange={(e) => setTier(i, "minMultiple", e.target.value)}
                inputMode="decimal"
                className={`${inputClass} w-24`}
              />
              <span className="text-gray-600">เท่า ได้</span>
              <input
                value={t.amount}
                onChange={(e) => setTier(i, "amount", e.target.value)}
                inputMode="numeric"
                className={`${inputClass} w-28`}
              />
              <span className="text-gray-600">บาท</span>
              <button
                onClick={() =>
                  setForm((f) => ({ ...f, bonusTiers: f.bonusTiers.filter((_, j) => j !== i) }))
                }
                className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                ลบ
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setForm((f) => ({
                ...f,
                bonusTiers: [...f.bonusTiers, { minMultiple: "", amount: "" }],
              }))
            }
            className="mt-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            + เพิ่มขั้นโบนัส
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={savingFarmSettings}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {savingFarmSettings ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button
          onClick={() => {
            if (window.confirm("คืนค่าเริ่มต้นทั้งหมด? (ยังไม่บันทึกจนกว่าจะกดบันทึก)")) {
              setForm(toForm(DEFAULT_FARM_SETTINGS));
            }
          }}
          className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
        >
          คืนค่าเริ่มต้น
        </button>
      </div>
    </div>
  );
}
