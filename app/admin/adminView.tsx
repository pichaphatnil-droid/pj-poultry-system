"use client";

import { getTodayThailand } from "../lib/dateUtils";
import { differenceInDays } from "date-fns";
import { ChickenSex, HouseDetailInput, HOUSE_NUMBERS, WEEKLY_WEIGHT_FIELDS, bangkokClock, timeToMinutes } from "./shared";
import type { AdminState } from "./useAdminState";

// ค่าที่คำนวณจาก state เพื่อแสดงผล (เรียกหลังโหลดข้อมูลเสร็จ)
export function deriveAdminView(state: AdminState) {
  const {
    farmSettings,
    activeBatch,
    viewingBatch: viewedBatch,
    records: viewedRecords,
    users: allUsers,
    HOUSE_AREAS,
    WEIGHT_STANDARDS,
    allBatches,
    newBatchHouseCounts,
    setNewBatchHouseCounts,
    newBatchHouseDetails,
    setNewBatchHouseDetails,
    houseInitialCounts,
    housePerformanceData,
    editHouseCounts,
    setEditHouseCounts,
    editHouseDetails,
    setEditHouseDetails,
    selectedBatchId,
    selectedHouse,
    selectedDailyDate,
    recordsLoading,
    handleSelectViewBatch,
    calculateWeightCalculatorSummary,
    calculateDailySummary,
    calculateHouseTotals,
    prepareSelectedHouseData,
    prepareWeeklyHousePerformance,
  } = state;


  const dailySummary = calculateDailySummary();
  const todayDate = getTodayThailand();
  const calendarStartOffset = dailySummary.length
    ? new Date(`${dailySummary[0].date}T00:00:00`).getDay()
    : 0;
  const selectedDailySummary = dailySummary.find(
    (day) => day.date === selectedDailyDate,
  );
  const houseTotals = calculateHouseTotals(dailySummary);
  const grandTotalDead = Object.values(houseTotals).reduce(
    (sum: number, h: any) => sum + h.dead,
    0,
  );
  const grandTotalCulled = Object.values(houseTotals).reduce(
    (sum: number, h: any) => sum + h.culled,
    0,
  );
  const grandTotal = grandTotalDead + grandTotalCulled;
  const selectedHouseDailyData = selectedHouse
    ? prepareSelectedHouseData(selectedHouse)
    : [];
  const selectedHouseTotal = selectedHouse ? houseTotals[selectedHouse] : null;
  const selectedHouseInitialCount = selectedHouse
    ? houseInitialCounts[selectedHouse] || 0
    : 0;
  const selectedHouseLossPercentage =
    selectedHouseTotal && selectedHouseInitialCount
      ? (selectedHouseTotal.total / selectedHouseInitialCount) * 100
      : null;
  const selectedHouseAverageLoss = selectedHouseDailyData.length
    ? (selectedHouseDailyData.reduce((sum, day) => sum + day.total, 0) /
        selectedHouseDailyData.length).toFixed(1)
    : "0.0";
  const selectedHousePeriodTotals = selectedHouseDailyData.reduce(
    (totals, day) => ({
      morningDead: totals.morningDead + day.morningDead,
      afternoonDead: totals.afternoonDead + day.afternoonDead,
      morningCulled: totals.morningCulled + day.morningCulled,
      afternoonCulled: totals.afternoonCulled + day.afternoonCulled,
    }),
    {
      morningDead: 0,
      afternoonDead: 0,
      morningCulled: 0,
      afternoonCulled: 0,
    },
  );
  const selectedHousePeakDay = selectedHouseDailyData.reduce<any | null>(
    (peak, day) => (!peak || day.total > peak.total ? day : peak),
    null,
  );
  const weeklyHousePerformance = prepareWeeklyHousePerformance();
  const totalHouseArea = HOUSE_NUMBERS.reduce(
    (sum, house) => sum + HOUSE_AREAS[house],
    0,
  );
  const performanceInitialTotal = weeklyHousePerformance.reduce(
    (sum, item) => sum + (item.profile?.initial_count || 0),
    0,
  );
  const performanceLossTotal = weeklyHousePerformance.reduce(
    (sum, item) => sum + item.cumulativeTotal,
    0,
  );
  const overallLossPercentage = performanceInitialTotal
    ? (performanceLossTotal / performanceInitialTotal) * 100
    : null;
  const overallLiveability =
    overallLossPercentage == null ? null : Math.max(0, 100 - overallLossPercentage);
  const overallDensity = performanceInitialTotal
    ? performanceInitialTotal / totalHouseArea
    : null;
  const weeklyAverageWeights = WEEKLY_WEIGHT_FIELDS.map((_, index) => {
    const enteredWeights = weeklyHousePerformance
      .map((item) => item.weeklyWeights[index])
      .filter((weight): weight is number => weight != null)
      .map(Number)
      .filter(Number.isFinite);

    if (!enteredWeights.length) return null;

    return (
      enteredWeights.reduce((sum, weight) => sum + weight, 0) /
      enteredWeights.length
    );
  });
  const weightCalculatorSummary = calculateWeightCalculatorSummary();
  const growthPerformanceRows = HOUSE_NUMBERS.map((house) => {
    const profile = housePerformanceData[house];
    const standards = profile?.chicken_sex
      ? WEIGHT_STANDARDS[profile.chicken_sex].weights
      : [];
    const actualWeights = WEEKLY_WEIGHT_FIELDS.map(
      (field) => profile?.[field] ?? null,
    );
    const weeks = WEEKLY_WEIGHT_FIELDS.map((_, index) => {
      const actualWeight = actualWeights[index];
      const previousActualWeight =
        index === 0 ? profile?.initial_weight : actualWeights[index - 1];
      const standardWeight = standards[index] ?? null;
      const previousStandardWeight =
        index === 0 ? profile?.initial_weight : standards[index - 1] ?? null;
      const weightGainG =
        actualWeight != null && previousActualWeight != null
          ? Number(actualWeight) - Number(previousActualWeight)
          : null;

      return {
        week: index + 1,
        actualWeight,
        standardWeight,
        weightGainG,
        actualAdg:
          weightGainG != null
            ? weightGainG / 7
            : null,
        standardAdg:
          standardWeight != null && previousStandardWeight != null
            ? (standardWeight - previousStandardWeight) / 7
            : null,
      };
    });

    return { house, profile, weeks };
  });
  const growthWeeklyAverages = WEEKLY_WEIGHT_FIELDS.map((_, index) => {
    const actualWeights = growthPerformanceRows
      .map((row) => row.weeks[index].actualWeight)
      .filter((value): value is number => value != null)
      .map(Number)
      .filter(Number.isFinite);
    const actualAdgs = growthPerformanceRows
      .map((row) => row.weeks[index].actualAdg)
      .filter((value): value is number => value != null)
      .map(Number)
      .filter(Number.isFinite);
    const standardWeights = growthPerformanceRows
      .map((row) => row.weeks[index].standardWeight)
      .filter((value): value is number => value != null)
      .map(Number)
      .filter(Number.isFinite);
    const standardAdgs = growthPerformanceRows
      .map((row) => row.weeks[index].standardAdg)
      .filter((value): value is number => value != null)
      .map(Number)
      .filter(Number.isFinite);
    return {
      actualWeight: actualWeights.length
        ? actualWeights.reduce((sum, value) => sum + value, 0) /
          actualWeights.length
        : null,
      actualAdg: actualAdgs.length
        ? actualAdgs.reduce((sum, value) => sum + value, 0) / actualAdgs.length
        : null,
      standardWeight: standardWeights.length
        ? standardWeights.reduce((sum, value) => sum + value, 0) /
          standardWeights.length
        : null,
      standardAdg: standardAdgs.length
        ? standardAdgs.reduce((sum, value) => sum + value, 0) /
          standardAdgs.length
        : null,
    };
  });

  // ตัวเลือกรุ่นสำหรับ dropdown เรียงรุ่นที่ใช้งานอยู่ขึ้นก่อน ตามด้วยรุ่นที่ปิดแล้วเรียงจากใหม่ไปเก่า
  const batchOptions = [...allBatches].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return (
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  });

  const BatchSelector = () => (
    <select
      value={selectedBatchId || ""}
      onChange={(e) => handleSelectViewBatch(e.target.value)}
      disabled={recordsLoading}
      className="px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white font-semibold outline-none disabled:opacity-60 [&>option]:text-gray-900 [&>option]:bg-white"
    >
      {batchOptions.map((b) => (
        <option key={b.id} value={b.id}>
          {b.batch_name} {b.is_active ? "(กำลังใช้งาน)" : "(ปิดแล้ว)"}
        </option>
      ))}
    </select>
  );

  const renderHouseDetailCards = (mode: "new" | "edit") => {
    const counts = mode === "new" ? newBatchHouseCounts : editHouseCounts;
    const details =
      mode === "new" ? newBatchHouseDetails : editHouseDetails;
    const setCounts =
      mode === "new" ? setNewBatchHouseCounts : setEditHouseCounts;
    const setDetails =
      mode === "new" ? setNewBatchHouseDetails : setEditHouseDetails;

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {HOUSE_NUMBERS.map((house) => {
          const detail = details[house];
          const captureAge =
            detail.arrivalDate && detail.captureDate
              ? differenceInDays(
                  new Date(`${detail.captureDate}T00:00:00`),
                  new Date(`${detail.arrivalDate}T00:00:00`),
                )
              : null;

          const updateDetail = (patch: Partial<HouseDetailInput>) =>
            setDetails((current) => ({
              ...current,
              [house]: { ...current[house], ...patch },
            }));

          return (
            <div
              key={house}
              className={`rounded-xl border bg-white p-4 ${
                mode === "new" ? "border-blue-200" : "border-purple-200"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-lg font-bold text-gray-900">เล้า {house}</h5>
                {captureAge != null && captureAge >= 0 && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    อายุจับ {captureAge} วัน
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    จำนวนไก่ลง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={counts[house]}
                    onChange={(e) =>
                      setCounts((current) => ({
                        ...current,
                        [house]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    วันที่ไก่เข้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={detail.arrivalDate}
                    onChange={(e) => updateDetail({ arrivalDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    วันที่จับไก่
                  </label>
                  <input
                    type="date"
                    min={detail.arrivalDate || undefined}
                    value={detail.captureDate}
                    onChange={(e) => updateDetail({ captureDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    เพศ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={detail.chickenSex}
                    onChange={(e) =>
                      updateDetail({ chickenSex: e.target.value as ChickenSex | "" })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">เลือกเพศ</option>
                    <option value="male">ผู้</option>
                    <option value="female">เมีย</option>
                    <option value="mix">คละ</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    พันธุ์ไก่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={detail.breed}
                    onChange={(e) => updateDetail({ breed: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="เช่น AA/A"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    น้ำหนักแรกเข้า (กรัม) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={detail.initialWeight}
                    onChange={(e) => updateDetail({ initialWeight: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="เช่น 47.35"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // แจ้งเตือนในหน้าแอดมิน: เล้าที่ยังไม่บันทึกวันนี้ (เมื่อเลยเวลาที่ตั้งไว้)
  const recordAlerts = (() => {
    const alerts = farmSettings.alerts;
    if (!alerts.enabled || !activeBatch || viewedBatch?.id !== activeBatch.id) return [];
    const clock = bangkokClock();
    const today = clock.date;
    if (today < activeBatch.start_date) return [];

    const profiles = Object.values(housePerformanceData);
    let expected = profiles
      .filter(
        (p) =>
          p.initial_count > 0 &&
          (!p.arrival_date || p.arrival_date <= today) &&
          (!p.capture_date || p.capture_date > today),
      )
      .map((p) => Number(p.house_number));
    if (profiles.length === 0) {
      expected = [
        ...new Set(
          allUsers
            .filter((u) => u.role === "worker" && u.is_active && u.house_number)
            .map((u) => Number(u.house_number)),
        ),
      ];
    }

    const result: { period: "morning" | "afternoon"; label: string; houses: number[] }[] = [];
    const periods = [
      ["morning", "ช่วงเช้า", alerts.morningEnabled, alerts.morningTime, "morning_recorded_at"],
      ["afternoon", "ช่วงบ่าย", alerts.afternoonEnabled, alerts.afternoonTime, "afternoon_recorded_at"],
    ] as const;
    for (const [period, label, on, time, field] of periods) {
      if (!on || clock.minutes < timeToMinutes(time)) continue;
      const houses = expected
        .filter(
          (h) =>
            !viewedRecords.some(
              (r) => r.house_number === h && r.record_date === today && r[field],
            ),
        )
        .sort((a, b) => a - b);
      if (houses.length) result.push({ period, label, houses });
    }
    return result;
  })();

  return {
    recordAlerts,
    dailySummary,
    todayDate,
    calendarStartOffset,
    selectedDailySummary,
    houseTotals,
    grandTotalDead,
    grandTotalCulled,
    grandTotal,
    selectedHouseDailyData,
    selectedHouseTotal,
    selectedHouseInitialCount,
    selectedHouseLossPercentage,
    selectedHouseAverageLoss,
    selectedHousePeriodTotals,
    selectedHousePeakDay,
    weeklyHousePerformance,
    totalHouseArea,
    performanceInitialTotal,
    performanceLossTotal,
    overallLossPercentage,
    overallLiveability,
    overallDensity,
    weeklyAverageWeights,
    weightCalculatorSummary,
    growthPerformanceRows,
    growthWeeklyAverages,
    batchOptions,
    BatchSelector,
    renderHouseDetailCards,
  };
}

export type AdminView = ReturnType<typeof deriveAdminView>;
