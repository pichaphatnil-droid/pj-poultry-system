"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChickenSex, WEEKLY_WEIGHT_FIELDS, calculateBonus } from "../shared";
import ExportMenu from "../components/ExportMenu";
import { useAdmin } from "../AdminContext";

export default function WeeklyTab() {
  const {
    WEEKLY_TARGET_LOSS,
    WEIGHT_STANDARDS,
    BONUS_TIERS,
    weeklyWeightInputs,
    setWeeklyWeightInputs,
    editingWeeklyWeights,
    setEditingWeeklyWeights,
    savingWeeklyWeights,
    weeklyPerformanceExportRef,
    exportingWeeklyPerformance,
    handleSaveWeeklyWeights,
    handleCancelWeeklyWeightEdit,
    handleExportWeeklyPerformanceImage,
    viewingBatch: maybeViewingBatch,
    weeklyHousePerformance,
    totalHouseArea,
    performanceInitialTotal,
    performanceLossTotal,
    overallLossPercentage,
    overallLiveability,
    overallDensity,
    weeklyAverageWeights,
    BatchSelector,
  } = useAdmin();
  const viewingBatch = maybeViewingBatch!;

  return (
    <div ref={weeklyPerformanceExportRef} className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-5 text-white shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-100">
                    Weekly Performance
                  </p>
                  <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                    ประสิทธิภาพรายสัปดาห์ รุ่น {viewingBatch.batch_name}
                  </h2>
                  <p className="mt-2 text-sm text-purple-100">
                    นับตามอายุไก่: Wk1 = DOC 0–7, Wk2 = DOC 8–14
                    และต่อเนื่องครั้งละ 7 วัน
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <BatchSelector />
                  <ExportMenu
                    tone="onColor"
                    options={[
                      {
                        icon: "🖼️",
                        label: "รูปทั้งหน้า (PNG)",
                        onClick: handleExportWeeklyPerformanceImage,
                        busy: exportingWeeklyPerformance,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-blue-600">จำนวนไก่ลงรวม</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">
                  {performanceInitialTotal.toLocaleString()}
                  <span className="ml-1 text-base font-semibold">ตัว</span>
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-cyan-700">ความหนาแน่นรวม</p>
                <p className="mt-2 text-3xl font-bold text-cyan-900">
                  {overallDensity == null ? "-" : overallDensity.toFixed(2)}
                  <span className="ml-1 text-base font-semibold">ตัว/ตร.ม.</span>
                </p>
                <p className="mt-1 text-xs text-cyan-600">
                  พื้นที่รวม {totalHouseArea.toLocaleString()} ตร.ม.
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-orange-600">สูญเสียสะสมรวม</p>
                <p className="mt-2 text-3xl font-bold text-orange-900">
                  {overallLossPercentage == null
                    ? "-"
                    : `${overallLossPercentage.toFixed(2)}%`}
                </p>
                <p className="mt-1 text-xs text-orange-600">
                  {performanceLossTotal.toLocaleString()} ตัว
                </p>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-green-600">Liveability รวม</p>
                <p className="mt-2 text-3xl font-bold text-green-900">
                  {overallLiveability == null
                    ? "-"
                    : `${overallLiveability.toFixed(2)}%`}
                </p>
                <p className="mt-1 text-xs text-green-600">
                  เหลือประมาณ {(performanceInitialTotal - performanceLossTotal).toLocaleString()} ตัว
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4 md:p-5">
                <h3 className="text-xl font-bold text-gray-900">
                  ข้อมูลประจำเล้า
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  วันที่จับไก่สามารถกลับมาใส่ภายหลังได้จากเมนูจัดการรุ่น
                </p>
              </div>
              <div className="overflow-x-auto" data-weekly-export-expand>
                <table className="min-w-[1360px] w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-center font-bold">เล้า</th>
                      <th className="px-4 py-3 text-center font-bold">วันที่ไก่เข้า</th>
                      <th className="px-4 py-3 text-right font-bold">จำนวนไก่ลง</th>
                      <th className="px-4 py-3 text-right font-bold">พื้นที่เล้า</th>
                      <th className="px-4 py-3 text-right font-bold">ความหนาแน่น</th>
                      <th className="px-4 py-3 text-center font-bold">เพศ</th>
                      <th className="px-4 py-3 text-left font-bold">พันธุ์</th>
                      <th className="px-4 py-3 text-right font-bold">น้ำหนักแรกเข้า</th>
                      <th className="px-4 py-3 text-center font-bold">วันที่จับไก่</th>
                      <th className="px-4 py-3 text-center font-bold">อายุจับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weeklyHousePerformance.map((item) => (
                      <tr key={item.house} className="hover:bg-purple-50/40">
                        <td className="px-4 py-3 text-center font-bold text-purple-700">
                          {item.house}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.profile?.arrival_date
                            ? format(
                                new Date(`${item.profile.arrival_date}T00:00:00`),
                                "dd/MM/yyyy",
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {item.profile?.initial_count?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.areaSquareMeters.toLocaleString()} ตร.ม.
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-cyan-700">
                          {item.density == null
                            ? "-"
                            : `${item.density.toFixed(2)} ตัว/ตร.ม.`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.profile?.chicken_sex
                            ? WEIGHT_STANDARDS[item.profile.chicken_sex].label
                            : "-"}
                        </td>
                        <td className="px-4 py-3">{item.profile?.breed || "-"}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {item.profile?.initial_weight != null
                            ? `${item.profile.initial_weight.toLocaleString()} กรัม`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.profile?.capture_date
                            ? format(
                                new Date(`${item.profile.capture_date}T00:00:00`),
                                "dd/MM/yyyy",
                              )
                            : "ยังไม่ระบุ"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {item.captureAge == null ? "-" : `${item.captureAge} วัน`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4 md:p-5">
                <h3 className="text-xl font-bold text-gray-900">
                  มาตรฐานน้ำหนัก AA รายสัปดาห์
                </h3>
                <p className="mt-1 text-sm text-gray-500">หน่วย: กรัม/ตัว · 6 สัปดาห์</p>
              </div>
              <div className="overflow-x-auto" data-weekly-export-expand>
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-blue-50 text-blue-900">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">เพศ</th>
                      {WEEKLY_TARGET_LOSS.map((_, index) => (
                        <th key={index} className="px-4 py-3 text-center font-bold">
                          Wk{index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(Object.keys(WEIGHT_STANDARDS) as ChickenSex[]).map((sex) => (
                      <tr key={sex}>
                        <td className="px-4 py-3 font-bold text-gray-800">
                          {WEIGHT_STANDARDS[sex].label}
                        </td>
                        {WEIGHT_STANDARDS[sex].weights.map((weight, index) => (
                          <td key={index} className="px-4 py-3 text-center font-semibold">
                            {weight.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-orange-50 text-orange-900">
                      <td className="px-4 py-3 font-bold">เป้าหมายสูญเสียไม่เกิน</td>
                      {WEEKLY_TARGET_LOSS.map((target, index) => (
                        <td key={index} className="px-4 py-3 text-center font-bold">
                          {target.toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    น้ำหนักจริงรายสัปดาห์เทียบมาตรฐาน
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Wk1 สีเขียว = ได้โบนัสตั้งแต่{" "}
                    {Math.min(...BONUS_TIERS.map((t) => t.minMultiple)).toFixed(2)} เท่า · Wk2–Wk6 สีเขียว = ถึงมาตรฐาน · ค่า X = น้ำหนักจริง ÷ น้ำหนักแรกเข้า
                  </p>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  data-html2canvas-ignore="true"
                >
                  {editingWeeklyWeights ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelWeeklyWeightEdit}
                        disabled={savingWeeklyWeights}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveWeeklyWeights}
                        disabled={savingWeeklyWeights}
                        className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingWeeklyWeights
                          ? "กำลังบันทึก..."
                          : "บันทึกน้ำหนักรายสัปดาห์"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingWeeklyWeights(true)}
                      className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700"
                    >
                      ✏️ แก้ไขน้ำหนัก
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto" data-weekly-export-expand>
                <table className="min-w-[1220px] w-full text-sm">
                  <thead className="bg-purple-50 text-purple-900">
                    <tr>
                      <th className="px-4 py-3 text-center font-bold">เล้า</th>
                      <th className="px-4 py-3 text-center font-bold">เพศ</th>
                      {WEEKLY_WEIGHT_FIELDS.map((_, index) => (
                        <th key={index} className="px-4 py-3 text-center font-bold">
                          Wk{index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weeklyHousePerformance.map((item) => (
                      <tr key={item.house} className="align-top hover:bg-purple-50/30">
                        <td className="px-4 py-4 text-center text-lg font-bold text-purple-700">
                          {item.house}
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-semibold text-gray-600">
                          {item.profile?.chicken_sex
                            ? WEIGHT_STANDARDS[item.profile.chicken_sex].label
                            : "-"}
                        </td>
                        {WEEKLY_WEIGHT_FIELDS.map((_, index) => {
                          const rawValue = weeklyWeightInputs[item.house]?.[index] || "";
                          const actualWeight = Number.parseFloat(rawValue);
                          const standardWeight = item.profile?.chicken_sex
                            ? WEIGHT_STANDARDS[item.profile.chicken_sex].weights[index]
                            : null;
                          const difference =
                            Number.isFinite(actualWeight) && standardWeight != null
                              ? actualWeight - standardWeight
                              : null;
                          const initialWeight = item.profile?.initial_weight;
                          const growthMultiple =
                            Number.isFinite(actualWeight) &&
                            initialWeight != null &&
                            initialWeight > 0
                              ? actualWeight / initialWeight
                              : null;
                          const roundedGrowthMultiple =
                            growthMultiple == null
                              ? null
                              : Math.round(
                                  (growthMultiple + Number.EPSILON) * 100,
                                ) / 100;
                          const isBonusWeek = index === 0;
                          const bonusAmount = !isBonusWeek
                            ? 0
                            : calculateBonus(roundedGrowthMultiple, BONUS_TIERS);

                          return (
                            <td key={index} className="px-3 py-3 text-center">
                              {editingWeeklyWeights &&
                              !exportingWeeklyPerformance ? (
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={rawValue}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setWeeklyWeightInputs((current) => ({
                                      ...current,
                                      [item.house]: current[item.house].map(
                                        (value, weightIndex) =>
                                          weightIndex === index
                                            ? nextValue
                                            : value,
                                      ),
                                    }));
                                  }}
                                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                  placeholder="กรัม"
                                />
                              ) : (
                                <div className="flex h-10 items-center justify-center text-base font-bold text-gray-900">
                                  {Number.isFinite(actualWeight)
                                    ? actualWeight.toFixed(2)
                                    : "-"}
                                </div>
                              )}
                              <p className="mt-1 text-[10px] text-gray-500">
                                {standardWeight == null
                                  ? "ยังไม่ระบุเพศ"
                                  : `มาตรฐาน ${standardWeight.toLocaleString()} กรัม`}
                              </p>
                              <p
                                className={`min-h-4 text-[11px] font-semibold ${
                                  roundedGrowthMultiple == null
                                    ? "text-transparent"
                                    : isBonusWeek
                                      ? bonusAmount > 0
                                        ? "text-green-700"
                                        : "text-red-600"
                                      : difference != null && difference >= 0
                                      ? "text-green-700"
                                      : "text-red-600"
                                }`}
                              >
                                {roundedGrowthMultiple == null
                                  ? "-"
                                  : `${difference == null ? "" : `${difference >= 0 ? "+" : ""}${difference.toFixed(2)} กรัม · `}${roundedGrowthMultiple.toFixed(2)} เท่า${isBonusWeek ? ` · ${bonusAmount > 0 ? `โบนัส ${bonusAmount.toLocaleString()} บาท` : "ไม่ได้โบนัส"}` : ""}`}
                              </p>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-gray-900 text-white">
                      <td colSpan={2} className="px-4 py-4 font-bold">
                        ค่าเฉลี่ยรวมทุกเล้า (ไม่ถ่วงตามจำนวนไก่)
                      </td>
                      {weeklyAverageWeights.map((weight, index) => (
                        <td key={index} className="px-4 py-4 text-center font-bold">
                          {weight == null ? "-" : `${weight.toFixed(2)} กรัม`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4 md:p-5">
                <h3 className="text-xl font-bold text-gray-900">
                  เปอร์เซ็นต์สูญเสียรายสัปดาห์แยกตามเล้า
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  คำนวณจาก (ตาย + คัดในสัปดาห์) ÷ จำนวนไก่ลงเริ่มต้น × 100
                </p>
              </div>
              <div className="overflow-x-auto" data-weekly-export-expand>
                <table className="min-w-[1020px] w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-center font-bold">เล้า</th>
                      {WEEKLY_TARGET_LOSS.map((target, index) => (
                        <th key={index} className="px-4 py-3 text-center font-bold">
                          Wk{index + 1}
                          <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
                            เป้า ≤ {target.toFixed(1)}%
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weeklyHousePerformance.map((item) => (
                      <tr key={item.house}>
                        <td className="px-4 py-4 text-center text-lg font-bold text-purple-700">
                          {item.house}
                        </td>
                        {item.weeks.map((week) => {
                          const passed =
                            week.percentage != null &&
                            week.percentage <= week.target;
                          const failed =
                            week.percentage != null &&
                            week.percentage > week.target;

                          return (
                            <td key={week.week} className="px-3 py-3 text-center">
                              <div
                                className={`rounded-xl border p-3 ${
                                  passed
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : failed
                                      ? "border-red-200 bg-red-50 text-red-800"
                                      : "border-gray-200 bg-gray-50 text-gray-400"
                                }`}
                                title={
                                  week.startDate && week.endDate
                                    ? `${week.startDate} ถึง ${week.endDate}`
                                    : undefined
                                }
                              >
                                <p className="text-lg font-bold">
                                  {week.percentage == null
                                    ? "-"
                                    : `${week.percentage.toFixed(2)}%`}
                                </p>
                                <p className="mt-1 text-[11px]">
                                  {week.percentage == null
                                    ? "ยังไม่ถึงสัปดาห์"
                                    : `${week.total.toLocaleString()} ตัว · ${passed ? "ผ่าน" : "เกินเป้า"}`}
                                </p>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4 md:p-5">
                <h3 className="text-xl font-bold text-gray-900">
                  สรุปประสิทธิภาพสะสมทั้งรุ่น
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Liveability = 100 − เปอร์เซ็นต์สูญเสียสะสม
                </p>
              </div>
              <div className="overflow-x-auto" data-weekly-export-expand>
                <table className="min-w-[1040px] w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-center font-bold">เล้า</th>
                      <th className="px-4 py-3 text-right font-bold">พื้นที่</th>
                      <th className="px-4 py-3 text-right font-bold">ไก่ลง</th>
                      <th className="px-4 py-3 text-right font-bold">ความหนาแน่น</th>
                      <th className="px-4 py-3 text-right font-bold">สูญเสียสะสม</th>
                      <th className="px-4 py-3 text-right font-bold">%สูญเสีย</th>
                      <th className="px-4 py-3 text-right font-bold">ไก่คงเหลือ</th>
                      <th className="px-4 py-3 text-right font-bold">%Liveability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weeklyHousePerformance.map((item) => (
                      <tr key={item.house} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center text-lg font-bold text-purple-700">
                          {item.house}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.areaSquareMeters.toLocaleString()} ตร.ม.
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {item.profile?.initial_count?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-cyan-700">
                          {item.density == null ? "-" : item.density.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-700">
                          {item.cumulativeTotal.toLocaleString()} ตัว
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-700">
                          {item.cumulativeLossPercentage == null
                            ? "-"
                            : `${item.cumulativeLossPercentage.toFixed(2)}%`}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {item.remainingChickens.toLocaleString()} ตัว
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {item.liveability == null
                            ? "-"
                            : `${item.liveability.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-900 text-white">
                      <td className="px-4 py-4 text-center font-bold">รวม</td>
                      <td className="px-4 py-4 text-right font-bold">
                        {totalHouseArea.toLocaleString()} ตร.ม.
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {performanceInitialTotal.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {overallDensity == null ? "-" : overallDensity.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {performanceLossTotal.toLocaleString()} ตัว
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {overallLossPercentage == null
                          ? "-"
                          : `${overallLossPercentage.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {Math.max(0, performanceInitialTotal - performanceLossTotal).toLocaleString()} ตัว
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-green-300">
                        {overallLiveability == null
                          ? "-"
                          : `${overallLiveability.toFixed(2)}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  );
}
