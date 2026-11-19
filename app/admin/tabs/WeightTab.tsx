"use client";

import { th } from "date-fns/locale";
import { HOUSE_NUMBERS, WEEKLY_WEIGHT_FIELDS, WEIGHING_POSITIONS, WEIGHT_SUMMARY_CARD_CLASSES } from "../shared";
import { useAdmin } from "../AdminContext";

export default function WeightTab() {
  const {
    WEIGHT_STANDARDS,
    weightCalculatorHouse,
    setWeightCalculatorHouse,
    weightCalculatorWeek,
    setWeightCalculatorWeek,
    weightCalculatorInput,
    setWeightCalculatorInput,
    savingWeightCalculator,
    growthTableExportRef,
    exportingGrowthTable,
    handleSaveWeightCalculator,
    handleExportGrowthTableImage,
    weightCalculatorSummary,
    growthPerformanceRows,
    growthWeeklyAverages,
    BatchSelector,
  } = useAdmin();

  return (
    <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-100">
                    Weight & Growth Calculator
                  </p>
                  <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                    คำนวณน้ำหนักไก่และแสดงประสิทธิภาพ
                  </h2>
                  <p className="mt-2 text-sm text-emerald-100">
                    รองรับสูงสุด 9 จุด จุดละ 2 ครั้ง · ไม่จำเป็นต้องกรอกครบทุกช่อง
                  </p>
                </div>
                <BatchSelector />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    เล้า
                  </label>
                  <select
                    value={weightCalculatorHouse}
                    onChange={(event) =>
                      setWeightCalculatorHouse(Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    {HOUSE_NUMBERS.map((house) => (
                      <option key={house} value={house}>
                        เล้า {house}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    สัปดาห์
                  </label>
                  <select
                    value={weightCalculatorWeek}
                    onChange={(event) =>
                      setWeightCalculatorWeek(Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    {WEEKLY_WEIGHT_FIELDS.map((_, index) => (
                      <option key={index} value={index + 1}>
                        Wk{index + 1} · อายุ {(index + 1) * 7} วัน
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    วันที่ชั่ง
                  </label>
                  <input
                    type="date"
                    value={weightCalculatorInput.sampleDate}
                    onChange={(event) =>
                      setWeightCalculatorInput((current) => ({
                        ...current,
                        sampleDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    จำนวนไก่ต่อครั้ง
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={weightCalculatorInput.birdsPerWeighing}
                    onChange={(event) =>
                      setWeightCalculatorInput((current) => ({
                        ...current,
                        birdsPerWeighing: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    จำนวนไก่ที่ชั่งรวม
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={weightCalculatorInput.totalBirdsOverride}
                    onChange={(event) =>
                      setWeightCalculatorInput((current) => ({
                        ...current,
                        totalBirdsOverride: event.target.value,
                      }))
                    }
                    placeholder="เช่น 900"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    เว้นว่างเพื่อให้ระบบนับตามจำนวนช่อง
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    น้ำหนักตะกร้า/ครั้ง (กก.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={weightCalculatorInput.basketWeightKg}
                    onChange={(event) =>
                      setWeightCalculatorInput((current) => ({
                        ...current,
                        basketWeightKg: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">
                    หักกระเพาะ/ตัว (กรัม)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={weightCalculatorInput.deductionPerBirdG}
                    onChange={(event) =>
                      setWeightCalculatorInput((current) => ({
                        ...current,
                        deductionPerBirdG: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  น้ำหนักจากจุดชั่ง 9 จุด
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  กรอกเฉพาะจุดที่ชั่งได้ หรือรวมน้ำหนักทุกครั้งไว้ช่องแรกแล้วใส่จำนวนไก่ที่ชั่งรวม เช่น 900 ตัว
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {WEIGHING_POSITIONS.map((position) => {
                  const values =
                    weightCalculatorInput.measurements[position.key];
                  const positionTotal = values.reduce(
                    (sum, value) => sum + (Number.parseFloat(value) || 0),
                    0,
                  );

                  return (
                    <div
                      key={position.key}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-emerald-600">
                            {position.zone}
                          </p>
                          <h4 className="text-lg font-bold text-gray-900">
                            {position.side}
                          </h4>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                          รวม {positionTotal.toFixed(2)} กก.
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[0, 1].map((roundIndex) => (
                          <div key={roundIndex}>
                            <label className="mb-1 block text-xs font-bold text-gray-500">
                              ครั้งที่ {roundIndex + 1}
                            </label>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              inputMode="decimal"
                              value={values[roundIndex]}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setWeightCalculatorInput((current) => ({
                                  ...current,
                                  measurements: {
                                    ...current.measurements,
                                    [position.key]: current.measurements[
                                      position.key
                                    ].map((value, index) =>
                                      index === roundIndex ? nextValue : value,
                                    ) as [string, string],
                                  },
                                }));
                              }}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-right font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                              placeholder="0.000"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  label: "กรอกแล้ว",
                  value: `${weightCalculatorSummary.completedReadings}/18 ค่า`,
                  color: "gray",
                },
                {
                  label: "น้ำหนักรวมก่อนหัก",
                  value: `${weightCalculatorSummary.grossWeightKg.toFixed(2)} กก.`,
                  color: "blue",
                },
                {
                  label: "หักตะกร้ารวม",
                  value: `${weightCalculatorSummary.basketTotalKg.toFixed(2)} กก.`,
                  color: "amber",
                },
                {
                  label: "น้ำหนักหลังหักตะกร้า",
                  value: `${weightCalculatorSummary.netWeightKg.toFixed(2)} กก.`,
                  color: "emerald",
                },
                {
                  label: "จำนวนที่ชั่ง",
                  value: `${weightCalculatorSummary.totalBirds.toLocaleString()} ตัว`,
                  color: "cyan",
                },
                {
                  label: "เฉลี่ยก่อนหักกระเพาะ",
                  value:
                    weightCalculatorSummary.rawAverageG == null
                      ? "-"
                      : `${weightCalculatorSummary.rawAverageG.toFixed(2)} กรัม`,
                  color: "amber",
                },
                {
                  label: "น้ำหนักเฉลี่ยสุทธิ",
                  value:
                    weightCalculatorSummary.adjustedAverageG == null
                      ? "-"
                      : `${weightCalculatorSummary.adjustedAverageG.toFixed(2)} กรัม`,
                  color: "emerald",
                },
                {
                  label: "ไก่คงเหลือ",
                  value: `${weightCalculatorSummary.remainingChickens.toLocaleString()} ตัว`,
                  color: "cyan",
                },
                {
                  label: "ADG",
                  value:
                    weightCalculatorSummary.actualAdg == null
                      ? "-"
                      : weightCalculatorSummary.actualAdg.toFixed(2),
                  color: "lime",
                },
                {
                  label: "ค่า X",
                  value:
                    weightCalculatorSummary.roundedGrowthMultiple == null
                      ? "-"
                      : `${weightCalculatorSummary.roundedGrowthMultiple.toFixed(2)} เท่า`,
                  color: "purple",
                },
                {
                  label: "โบนัส",
                  value:
                    weightCalculatorWeek !== 1
                      ? "เฉพาะ Wk1"
                      : weightCalculatorSummary.bonusAmount > 0
                      ? `${weightCalculatorSummary.bonusAmount.toLocaleString()} บาท`
                      : "ไม่ได้โบนัส",
                  color:
                    weightCalculatorWeek !== 1
                      ? "gray"
                      : weightCalculatorSummary.bonusAmount > 0
                        ? "green"
                        : "red",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-2xl border p-4 text-center shadow-sm ${WEIGHT_SUMMARY_CARD_CLASSES[card.color]}`}
                >
                  <p className="text-xs font-semibold text-gray-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
              <div>
                <p className="font-bold text-emerald-900">
                  มาตรฐาน Wk{weightCalculatorWeek}: {weightCalculatorSummary.standardWeight?.toLocaleString() || "-"} กรัม
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  {weightCalculatorSummary.differenceFromStandard == null
                    ? "กรอกน้ำหนักอย่างน้อย 1 ค่าเพื่อดูผลเปรียบเทียบ"
                    : `${weightCalculatorSummary.differenceFromStandard >= 0 ? "สูงกว่า" : "ต่ำกว่า"}มาตรฐาน ${Math.abs(weightCalculatorSummary.differenceFromStandard).toFixed(2)} กรัม · ADG มาตรฐาน ${weightCalculatorSummary.standardAdg?.toFixed(2) || "-"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveWeightCalculator}
                disabled={savingWeightCalculator}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingWeightCalculator
                  ? "กำลังบันทึก..."
                  : "บันทึกผลชั่งและอัปเดตน้ำหนักรายสัปดาห์"}
              </button>
            </div>

            <div
              ref={growthTableExportRef}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    ตารางแสดงการเจริญเติบโต
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    ADG = (น้ำหนักสัปดาห์ปัจจุบัน − น้ำหนักสัปดาห์ก่อน) ÷ 7
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportGrowthTableImage}
                  disabled={exportingGrowthTable}
                  data-html2canvas-ignore="true"
                  className="shrink-0 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingGrowthTable
                    ? "กำลัง Export..."
                    : "Export ตารางเป็น PNG"}
                </button>
              </div>
              <div className="overflow-x-auto" data-growth-export-scroll>
                <table className="min-w-[2300px] w-full text-xs">
                  <thead>
                    <tr className="bg-orange-50 text-orange-950">
                      <th rowSpan={2} className="border border-gray-300 px-3 py-3">H</th>
                      <th rowSpan={2} className="border border-gray-300 px-3 py-3">เพศ</th>
                      {WEEKLY_WEIGHT_FIELDS.map((_, index) => (
                        <th
                          key={index}
                          colSpan={4}
                          className="border border-gray-300 px-3 py-3 text-center text-sm font-bold"
                        >
                          {(index + 1) * 7} วัน · Wk{index + 1}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-100 text-gray-700">
                      {WEEKLY_WEIGHT_FIELDS.flatMap((_, index) => [
                        <th key={`${index}-actual`} className="border border-gray-300 px-3 py-2">น้ำหนักจริง</th>,
                        <th key={`${index}-std`} className="border border-gray-300 px-3 py-2">AA Std</th>,
                        <th key={`${index}-adg`} className="border border-gray-300 px-3 py-2">ADG</th>,
                        <th key={`${index}-std-adg`} className="border border-gray-300 px-3 py-2">Std ADG</th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody>
                    {growthPerformanceRows.map((row) => (
                      <tr key={row.house}>
                        <td className="border border-gray-300 bg-amber-100 px-3 py-3 text-center text-base font-bold">
                          {row.house}
                        </td>
                        <td className="border border-gray-300 px-3 py-3 text-center font-semibold">
                          {row.profile?.chicken_sex
                            ? WEIGHT_STANDARDS[row.profile.chicken_sex].label
                            : "-"}
                        </td>
                        {row.weeks.flatMap((week) => {
                          const weightPassed =
                            week.actualWeight != null &&
                            week.standardWeight != null &&
                            week.actualWeight >= week.standardWeight;
                          const adgPassed =
                            week.actualAdg != null &&
                            week.standardAdg != null &&
                            week.actualAdg >= week.standardAdg;

                          return [
                            <td key={`${week.week}-actual`} className={`border border-gray-300 px-3 py-3 text-center font-bold ${week.actualWeight == null ? "text-gray-400" : weightPassed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {week.actualWeight == null ? "-" : Number(week.actualWeight).toFixed(2)}
                            </td>,
                            <td key={`${week.week}-std`} className="border border-gray-300 bg-orange-50 px-3 py-3 text-center font-semibold">
                              {week.standardWeight?.toLocaleString() || "-"}
                            </td>,
                            <td key={`${week.week}-adg`} className={`border border-gray-300 px-3 py-3 text-center font-bold ${week.actualAdg == null ? "text-gray-400" : adgPassed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {week.actualAdg == null ? "-" : week.actualAdg.toFixed(2)}
                            </td>,
                            <td key={`${week.week}-std-adg`} className="border border-gray-300 bg-orange-50 px-3 py-3 text-center">
                              {week.standardAdg == null ? "-" : week.standardAdg.toFixed(2)}
                            </td>,
                          ];
                        })}
                      </tr>
                    ))}
                    <tr className="bg-gray-900 text-white">
                      <td colSpan={2} className="border border-gray-700 px-3 py-4 text-center font-bold">
                        เฉลี่ย
                      </td>
                      {growthWeeklyAverages.flatMap((average, index) => [
                        <td key={`${index}-actual`} className="border border-gray-700 px-3 py-4 text-center font-bold">
                          {average.actualWeight == null ? "-" : average.actualWeight.toFixed(2)}
                        </td>,
                        <td key={`${index}-std`} className="border border-gray-700 px-3 py-4 text-center font-bold">
                          {average.standardWeight == null ? "-" : average.standardWeight.toFixed(0)}
                        </td>,
                        <td key={`${index}-adg`} className="border border-gray-700 px-3 py-4 text-center font-bold">
                          {average.actualAdg == null ? "-" : average.actualAdg.toFixed(2)}
                        </td>,
                        <td key={`${index}-std-adg`} className="border border-gray-700 px-3 py-4 text-center font-bold">
                          {average.standardAdg == null ? "-" : average.standardAdg.toFixed(2)}
                        </td>,
                      ])}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  );
}
