"use client";

import { useAdmin } from "../AdminContext";
import { bangkokClock, timeToMinutes } from "../shared";
import type { DailyRecord } from "../../types";

// การ์ดสรุป "วันนี้" รายเล้า — ดูแวบเดียวรู้ว่าเล้าไหนบันทึกแล้ว ตายวันนี้กี่ตัว สูญเสียสะสมเกินเป้าไหม
// แสดงเฉพาะรุ่นที่กำลังเลี้ยงอยู่ (รุ่นที่ปิดแล้วดูจากตารางด้านล่างแทน)

const n = (v: number | null | undefined) => Number(v) || 0;
const lossOf = (r: DailyRecord) =>
  n(r.morning_dead) + n(r.morning_culled) + n(r.afternoon_dead) + n(r.afternoon_culled);

const daysBetween = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T00:00:00+07:00`).getTime() - new Date(`${from}T00:00:00+07:00`).getTime()) /
      86_400_000,
  );

type Status = "done" | "waiting" | "late";

const STATUS_STYLE: Record<Status, string> = {
  done: "bg-green-100 text-green-800",
  waiting: "bg-gray-100 text-gray-500",
  late: "bg-amber-100 text-amber-800",
};
const STATUS_ICON: Record<Status, string> = { done: "✅", waiting: "⏳", late: "⚠️" };

export default function TodayOverview() {
  const {
    viewingBatch,
    records,
    houseInitialCounts,
    housePerformanceData,
    farmSettings,
    WEEKLY_TARGET_LOSS,
  } = useAdmin();

  if (!viewingBatch || !viewingBatch.is_active) return null;

  const houses = Object.keys(houseInitialCounts)
    .map(Number)
    .filter((h) => houseInitialCounts[h] > 0)
    .sort((a, b) => a - b);
  if (houses.length === 0) return null;

  const clock = bangkokClock();
  const today = clock.date;
  const { alerts } = farmSettings;

  const periodStatus = (recorded: boolean, enabled: boolean, time: string): Status => {
    if (recorded) return "done";
    if (alerts.enabled && enabled && clock.minutes >= timeToMinutes(time)) return "late";
    return "waiting";
  };

  const cards = houses.map((house) => {
    const profile = housePerformanceData[house];
    const initial = houseInitialCounts[house];
    const arrival = profile?.arrival_date || viewingBatch.start_date;
    const age = daysBetween(arrival, today);
    const captured = !!profile?.capture_date && profile.capture_date <= today;
    const notArrived = age < 0;

    const houseRecords = records.filter((r) => r.house_number === house);
    const todayRecord = houseRecords.find((r) => r.record_date === today);
    const totalLoss = houseRecords.reduce((sum, r) => sum + lossOf(r), 0);
    const lossPct = initial ? (totalLoss / initial) * 100 : 0;

    // เป้าสะสม = รวมเป้าแต่ละสัปดาห์ถึงสัปดาห์ปัจจุบัน (Wk1 = DOC 0–7, Wk2 = DOC 8–14, …)
    const week = Math.min(6, Math.max(1, age <= 7 ? 1 : Math.ceil(age / 7)));
    const target = WEEKLY_TARGET_LOSS.slice(0, week).reduce((a, b) => a + b, 0);

    return {
      house,
      age,
      captured,
      notArrived,
      todayLoss: todayRecord ? lossOf(todayRecord) : null,
      remaining: initial - totalLoss,
      lossPct,
      target,
      overTarget: lossPct > target,
      morning: periodStatus(!!todayRecord?.morning_recorded_at, alerts.morningEnabled, alerts.morningTime),
      afternoon: periodStatus(
        !!todayRecord?.afternoon_recorded_at,
        alerts.afternoonEnabled,
        alerts.afternoonTime,
      ),
    };
  });

  const active = cards.filter((c) => !c.captured && !c.notArrived);
  const doneCount = active.filter((c) => c.morning === "done").length;
  const todayLossTotal = active.reduce((sum, c) => sum + (c.todayLoss ?? 0), 0);

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800">
          วันนี้ · รุ่น {viewingBatch.batch_name}
        </h2>
        <p className="text-sm text-gray-500">
          บันทึกช่วงเช้าแล้ว {doneCount}/{active.length} เล้า · สูญเสียวันนี้รวม{" "}
          <b className="text-gray-800">{todayLossTotal.toLocaleString()}</b> ตัว
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => {
          const inactive = c.captured || c.notArrived;
          return (
            <div
              key={c.house}
              className={`rounded-xl border bg-white p-3 shadow-sm ${
                inactive
                  ? "border-gray-200 opacity-60"
                  : c.overTarget
                    ? "border-red-300"
                    : c.morning === "late" || c.afternoon === "late"
                      ? "border-amber-300"
                      : "border-gray-200"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-800">เล้า {c.house}</span>
                {!inactive && <span className="text-xs text-gray-500">อายุ {c.age} วัน</span>}
              </div>

              {inactive ? (
                <p className="mt-3 text-sm text-gray-500">
                  {c.captured ? "จับไก่แล้ว" : "ไก่ยังไม่เข้า"}
                </p>
              ) : (
                <>
                  <div className="mt-2 flex gap-1.5 text-xs font-semibold">
                    <span className={`rounded-md px-1.5 py-0.5 ${STATUS_STYLE[c.morning]}`}>
                      เช้า {STATUS_ICON[c.morning]}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 ${STATUS_STYLE[c.afternoon]}`}>
                      บ่าย {STATUS_ICON[c.afternoon]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    สูญเสียวันนี้{" "}
                    <b className="text-gray-900">
                      {c.todayLoss === null ? "—" : `${c.todayLoss} ตัว`}
                    </b>
                  </p>
                  <p className="text-sm text-gray-600">
                    สะสม{" "}
                    <b className={c.overTarget ? "text-red-600" : "text-gray-900"}>
                      {c.lossPct.toFixed(2)}%
                    </b>
                    {c.overTarget && <span className="text-red-600"> 🔴</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    เป้า {c.target.toFixed(1)}% · คงเหลือ {c.remaining.toLocaleString()} ตัว
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
