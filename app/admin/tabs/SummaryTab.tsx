"use client";

import React from "react";
import { getTodayThailand } from "../../lib/dateUtils";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { HouseChartMetric } from "../shared";
import ExportMenu from "../components/ExportMenu";
import { useAdmin } from "../AdminContext";

export default function SummaryTab() {
  const {
    records,
    houseInitialCounts,
    legacyTableZoom,
    setLegacyTableZoom,
    legacyTableExportRef,
    exportingLegacyTable,
    exportingLegacyExcel,
    selectedHouse,
    setSelectedHouse,
    setSelectedDailyDate,
    visibleHouseMetrics,
    recordsLoading,
    legacyHouseColors,
    loadData,
    handleViewHouseSummary,
    handleToggleHouseMetric,
    handleExportLegacyTableImage,
    handleExportLegacyTableExcel,
    viewingBatch: maybeViewingBatch,
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
    BatchSelector,
  } = useAdmin();
  const viewingBatch = maybeViewingBatch!;

  return (
    <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 md:p-6 text-white shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-1">
                    {viewingBatch.is_active
                      ? "ภาพรวมรุ่นปัจจุบัน"
                      : "ภาพรวมรุ่นย้อนหลัง (ปิดแล้ว)"}
                  </p>
                  <h2 className="font-bold text-2xl md:text-3xl">
                    สรุปไก่ตาย-ไก่คัด รุ่น {viewingBatch.batch_name}
                  </h2>
                  <p className="text-sm md:text-base text-blue-100 mt-2">
                    เริ่มวันที่:{" "}
                    {format(new Date(viewingBatch.start_date), "dd MMMM yyyy", {
                      locale: th,
                    })}
                    {viewingBatch.end_date && (
                      <>
                        {" "}
                        ถึงวันที่:{" "}
                        {format(new Date(viewingBatch.end_date), "dd MMMM yyyy", {
                          locale: th,
                        })}
                      </>
                    )}{" "}
                    (รวม{" "}
                    {differenceInDays(
                      viewingBatch.end_date
                        ? new Date(viewingBatch.end_date)
                        : new Date(getTodayThailand()),
                      new Date(viewingBatch.start_date),
                    ) + 1}{" "}
                    วัน)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <BatchSelector />
                  <button
                    onClick={loadData}
                    className="px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl font-semibold transition"
                  >
                    โหลดข้อมูลใหม่
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-200">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  จำนวนเริ่มต้น
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                  {viewingBatch.initial_count?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">ตัว</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-red-100">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  รวมตาย
                </p>
                <p className="text-2xl md:text-3xl font-bold text-red-600 mt-1">
                  {grandTotalDead.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">ตัว</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-orange-100">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  รวมคัด
                </p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-1">
                  {grandTotalCulled.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">ตัว</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-yellow-100">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  รวมตาย/คัด
                </p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-700 mt-1">
                  {grandTotal.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">ตัว</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-green-100 col-span-2 lg:col-span-1">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  คงเหลือโดยประมาณ
                </p>
                <p className="text-2xl md:text-3xl font-bold text-green-700 mt-1">
                  {Math.max(
                    (viewingBatch.initial_count || 0) - grandTotal,
                    0,
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  จำนวนเริ่มต้น - ตาย/คัด
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    สรุปแยกตามเล้า
                  </h3>
                </div>
                <p className="text-xs text-gray-400">
                  ข้อมูลอุณหภูมิ/น้ำ แสดงจากรายการล่าสุดของแต่ละเล้า
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map((house) => {
                  const total = houseTotals[house];
                  const initialCount = houseInitialCounts[house] || 0;
                  const lossPercentage = initialCount
                    ? (total.total / initialCount) * 100
                    : null;
                  const latestRecord = [...records]
                    .filter((r) => r.house_number === house)
                    .sort((a, b) =>
                      b.record_date.localeCompare(a.record_date),
                    )[0];

                  return (
                    <div
                      key={house}
                      className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                            {house}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">
                              เล้า {house}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {initialCount
                                ? `ไก่ลง ${initialCount.toLocaleString()} ตัว`
                                : "ยังไม่กำหนดจำนวนไก่ลง"}
                            </p>
                          </div>
                        </div>
                        <div
                          className="rounded-xl bg-purple-100 px-3 py-2 text-center text-purple-800"
                        >
                          <p className="text-[10px] font-semibold">สูญเสีย</p>
                          <p className="text-base font-bold">
                            {lossPercentage === null
                              ? "-"
                              : `${lossPercentage.toFixed(2)}%`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="rounded-xl bg-red-50 p-3 text-center">
                          <p className="text-xs text-red-500 font-semibold">
                            ตาย
                          </p>
                          <p className="text-xl font-bold text-red-700">
                            {total.dead}
                          </p>
                        </div>
                        <div className="rounded-xl bg-orange-50 p-3 text-center">
                          <p className="text-xs text-orange-500 font-semibold">
                            คัด
                          </p>
                          <p className="text-xl font-bold text-orange-700">
                            {total.culled}
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-100 p-3 text-center">
                          <p className="text-xs text-gray-500 font-semibold">
                            รวม
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            {total.total}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-400">อุณหภูมินอกเล้า</p>
                          <p className="font-bold text-gray-800">
                            {latestRecord?.morning_temp_outside ?? "-"} °C
                          </p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-400">อุณหภูมิในเล้า</p>
                          <p className="font-bold text-gray-800">
                            {latestRecord?.morning_temp_inside ?? "-"} °C
                          </p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-400">ความชื้น</p>
                          <p className="font-bold text-gray-800">
                            {latestRecord?.morning_humidity ?? "-"} %
                          </p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-400">มิเตอร์น้ำ</p>
                          <p className="font-bold text-gray-800">
                            {latestRecord?.morning_water_meter ?? "-"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewHouseSummary(house)}
                        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                      >
                        ดูข้อมูลเฉพาะเล้านี้
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedHouse && selectedHouseTotal && (
              <section
                id="selected-house-summary"
                className="scroll-mt-6 space-y-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm md:p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-600">
                      ข้อมูลเฉพาะเล้าในรุ่นนี้
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">
                      เล้า {selectedHouse} · รุ่น {viewingBatch.batch_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      แสดงเฉพาะข้อมูลของเล้า {selectedHouse} ตั้งแต่เริ่มรุ่นถึงวันที่ล่าสุด
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHouse(null)}
                    className="self-start rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                  >
                    ปิดข้อมูลเฉพาะเล้า
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">ไก่ลงเริ่มต้น</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {selectedHouseInitialCount
                        ? selectedHouseInitialCount.toLocaleString()
                        : "-"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">ตัว</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">ตายสะสม</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                      {selectedHouseTotal.dead.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">ตัว</p>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">คัดสะสม</p>
                    <p className="mt-1 text-2xl font-bold text-orange-600">
                      {selectedHouseTotal.culled.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">ตัว</p>
                  </div>
                  <div className="rounded-2xl border border-yellow-100 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">สูญเสียรวม</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700">
                      {selectedHouseTotal.total.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">ตาย + คัด</p>
                  </div>
                  <div className="rounded-2xl border border-purple-100 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">เปอร์เซ็นต์สูญเสีย</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">
                      {selectedHouseLossPercentage === null
                        ? "-"
                        : `${selectedHouseLossPercentage.toFixed(2)}%`}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">เทียบกับไก่ลงเริ่มต้น</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500">เฉลี่ยต่อวัน</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      {selectedHouseAverageLoss}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">ตัว/วัน</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-purple-100 bg-white p-4 lg:col-span-1">
                    <p className="text-xs font-semibold text-gray-500">วันที่สูญเสียสูงสุด</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">
                      {selectedHousePeakDay?.total || 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {selectedHousePeakDay && selectedHousePeakDay.total > 0
                        ? `${selectedHousePeakDay.dateDisplay} · วันที่ ${selectedHousePeakDay.day} ของรุ่น`
                        : "ยังไม่มีการสูญเสีย"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-gray-900">
                      ยอดสะสมแยกเช้า–บ่าย
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      แยกจำนวนตายและคัดของเล้า {selectedHouse} ตามช่วงเวลาที่บันทึก
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      {
                        label: "ตายเช้า",
                        value: selectedHousePeriodTotals.morningDead,
                        className: "border-red-100 bg-red-50 text-red-700",
                      },
                      {
                        label: "คัดเช้า",
                        value: selectedHousePeriodTotals.morningCulled,
                        className: "border-orange-100 bg-orange-50 text-orange-700",
                      },
                      {
                        label: "ตายบ่าย",
                        value: selectedHousePeriodTotals.afternoonDead,
                        className: "border-rose-100 bg-rose-50 text-rose-700",
                      },
                      {
                        label: "คัดบ่าย",
                        value: selectedHousePeriodTotals.afternoonCulled,
                        className: "border-amber-100 bg-amber-50 text-amber-700",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl border p-4 ${item.className}`}
                      >
                        <p className="text-xs font-bold opacity-80">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold">
                          {item.value.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs opacity-70">ตัวสะสม</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        แนวโน้มการสูญเสียรายวัน
                      </h4>
                      <p className="text-sm text-gray-500">
                        เลือกเปิด–ปิดเส้นข้อมูลของเล้า {selectedHouse} ได้ตามต้องการ
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        {
                          key: "dead" as HouseChartMetric,
                          label: "ตาย",
                          activeClass: "border-red-600 bg-red-600 text-white",
                        },
                        {
                          key: "culled" as HouseChartMetric,
                          label: "คัด",
                          activeClass: "border-orange-500 bg-orange-500 text-white",
                        },
                        {
                          key: "total" as HouseChartMetric,
                          label: "รวม",
                          activeClass: "border-blue-600 bg-blue-600 text-white",
                        },
                      ]).map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={visibleHouseMetrics[option.key]}
                          onClick={() => handleToggleHouseMetric(option.key)}
                          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                            visibleHouseMetrics[option.key]
                              ? option.activeClass
                              : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <span className="mr-1.5">
                            {visibleHouseMetrics[option.key] ? "✓" : "○"}
                          </span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={selectedHouseDailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateDisplay"
                        angle={-35}
                        textAnchor="end"
                        height={80}
                        minTickGap={16}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {visibleHouseMetrics.dead && (
                        <Line
                          type="monotone"
                          dataKey="dead"
                          name="ตาย"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                      )}
                      {visibleHouseMetrics.culled && (
                        <Line
                          type="monotone"
                          dataKey="culled"
                          name="คัด"
                          stroke="#f97316"
                          strokeWidth={2}
                        />
                      )}
                      {visibleHouseMetrics.total && (
                        <Line
                          type="monotone"
                          dataKey="total"
                          name="รวมสูญเสีย"
                          stroke="#2563eb"
                          strokeWidth={3}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 p-4 md:p-5">
                    <h4 className="text-lg font-bold text-gray-900">
                      ตารางข้อมูลรายวันของเล้า {selectedHouse}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      อุณหภูมิภายนอกและภายในเล้า ความชื้น และค่ามิเตอร์น้ำที่บันทึกในแต่ละวัน
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1320px] w-full text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold">วันที่</th>
                          <th className="px-4 py-3 text-center font-bold">วันที่ของรุ่น</th>
                          <th className="px-4 py-3 text-center font-bold text-red-600">ตายเช้า</th>
                          <th className="px-4 py-3 text-center font-bold text-orange-600">คัดเช้า</th>
                          <th className="px-4 py-3 text-center font-bold text-rose-700">ตายบ่าย</th>
                          <th className="px-4 py-3 text-center font-bold text-amber-700">คัดบ่าย</th>
                          <th className="px-4 py-3 text-center font-bold text-red-700">ตายรวม</th>
                          <th className="px-4 py-3 text-center font-bold text-orange-700">คัดรวม</th>
                          <th className="px-4 py-3 text-center font-bold">รวม</th>
                          <th className="px-4 py-3 text-center font-bold">อุณหภูมินอกเล้า</th>
                          <th className="px-4 py-3 text-center font-bold">อุณหภูมิในเล้า</th>
                          <th className="px-4 py-3 text-center font-bold">ความชื้น</th>
                          <th className="px-4 py-3 text-center font-bold">มิเตอร์น้ำ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedHouseDailyData.map((day) => (
                          <tr key={day.date} className="hover:bg-blue-50/50">
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                              {day.dateDisplay}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{day.day}</td>
                            <td className="px-4 py-3 text-center font-semibold text-red-600">
                              {day.hasRecord ? day.morningDead : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-orange-600">
                              {day.hasRecord ? day.morningCulled : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-rose-700">
                              {day.hasRecord ? day.afternoonDead : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-amber-700">
                              {day.hasRecord ? day.afternoonCulled : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-red-700">
                              {day.hasRecord ? day.dead : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-orange-700">
                              {day.hasRecord ? day.culled : "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                              {day.hasRecord ? day.total : "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {day.tempOutside ?? "-"}{day.tempOutside != null ? " °C" : ""}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {day.tempInside ?? "-"}{day.tempInside != null ? " °C" : ""}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {day.humidity ?? "-"}{day.humidity != null ? " %" : ""}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {day.waterMeter ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    ข้อมูลรายวันแบบอ่านง่าย
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 gap-px">
                {[
                  "อา.",
                  "จ.",
                  "อ.",
                  "พ.",
                  "พฤ.",
                  "ศ.",
                  "ส.",
                ].map((weekday) => (
                  <div
                    key={weekday}
                    className="bg-gray-100 px-1 py-2 text-center text-xs font-bold text-gray-600 md:text-sm"
                  >
                    {weekday}
                  </div>
                ))}

                {Array.from({ length: calendarStartOffset }).map((_, index) => (
                  <div key={`empty-${index}`} className="min-h-20 bg-gray-50 md:min-h-28" />
                ))}

                {dailySummary.map((day) => {
                  const isToday = day.date === todayDate;
                  return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDailyDate(day.date)}
                    className={`relative min-h-20 w-full p-1.5 text-left transition focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:min-h-28 md:p-3 ${
                      isToday
                        ? "bg-blue-100"
                        : "bg-white hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold md:h-8 md:min-w-8 ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : "text-gray-900"
                          }`}
                        >
                          {Number(day.date.slice(-2))}
                        </span>
                        {isToday && (
                          <span className="hidden rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white md:inline">
                            วันนี้
                          </span>
                        )}
                      </div>
                      <div className="mt-auto pt-1">
                        <p className="truncate text-[10px] text-gray-500 md:text-xs">
                          วันที่ {day.day} ของรุ่น
                        </p>
                        <p className="text-xs font-bold text-yellow-800 md:text-sm">
                          รวม {day.grandTotal || 0}
                        </p>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>

            {selectedDailySummary && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="daily-detail-title"
                onClick={() => setSelectedDailyDate(null)}
              >
                <div
                  className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 md:p-5">
                    <div>
                      <h3 id="daily-detail-title" className="text-xl font-bold text-gray-900">
                        ข้อมูลวันที่ {selectedDailySummary.dateDisplay}
                      </h3>
                      <p className="text-sm text-gray-500">
                        วันที่ {selectedDailySummary.day} ของรุ่น · รวม {selectedDailySummary.grandTotal || 0}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDailyDate(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-600 transition hover:bg-gray-200"
                      aria-label="ปิดรายละเอียด"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((house) => {
                        const data = selectedDailySummary.houses[house];
                        const record = records.find(
                          (r) =>
                            r.house_number === house &&
                            r.record_date === selectedDailySummary.date,
                        );
                        return (
                          <div
                            key={house}
                            className="rounded-xl bg-white border border-gray-200 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-900">
                                เล้า {house}
                              </h4>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                รวม {data.total || 0}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                              <div className="rounded-lg bg-red-50 p-2">
                                <p className="text-xs text-red-500">ตายเช้า</p>
                                <p className="font-bold text-red-700">
                                  {record?.morning_dead ?? 0}
                                </p>
                              </div>
                              <div className="rounded-lg bg-orange-50 p-2">
                                <p className="text-xs text-orange-500">คัดเช้า</p>
                                <p className="font-bold text-orange-700">
                                  {record?.morning_culled ?? 0}
                                </p>
                              </div>
                              <div className="rounded-lg bg-red-100 p-2">
                                <p className="text-xs text-red-600">ตายบ่าย</p>
                                <p className="font-bold text-red-800">
                                  {record?.afternoon_dead ?? 0}
                                </p>
                              </div>
                              <div className="rounded-lg bg-orange-100 p-2">
                                <p className="text-xs text-orange-600">คัดบ่าย</p>
                                <p className="font-bold text-orange-800">
                                  {record?.afternoon_culled ?? 0}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-100 p-2 col-span-2">
                                <p className="text-xs text-gray-500">รวมตาย/คัดทั้งวัน</p>
                                <p className="font-bold text-gray-900">
                                  {data.total || 0}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-gray-700">
                              <p>
                                นอก:{" "}
                                <span className="font-semibold">
                                  {record?.morning_temp_outside ?? "-"}
                                </span>
                              </p>
                              <p>
                                ใน:{" "}
                                <span className="font-semibold">
                                  {record?.morning_temp_inside ?? "-"}
                                </span>
                              </p>
                              <p>
                                ชื้น:{" "}
                                <span className="font-semibold">
                                  {record?.morning_humidity ?? "-"}
                                </span>
                              </p>
                              <p>
                                น้ำ:{" "}
                                <span className="font-semibold">
                                  {record?.morning_water_meter ?? "-"}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-5 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      ตารางข้อมูลเดิมทั้งหมด
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                        ซูมตาราง
                      </span>
                      <button
                        onClick={() =>
                          setLegacyTableZoom((value) =>
                            Math.max(0.55, Number((value - 0.05).toFixed(2))),
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                        type="button"
                      >
                        −
                      </button>
                      <span className="w-14 text-center text-sm font-bold text-gray-800">
                        {Math.round(legacyTableZoom * 100)}%
                      </span>
                      <button
                        onClick={() =>
                          setLegacyTableZoom((value) =>
                            Math.min(1, Number((value + 0.05).toFixed(2))),
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <ExportMenu
                      options={[
                        {
                          icon: "📊",
                          label: "ไฟล์ Excel (.xlsx)",
                          onClick: handleExportLegacyTableExcel,
                          disabled: recordsLoading,
                          busy: exportingLegacyExcel,
                        },
                        {
                          icon: "🖼️",
                          label: "รูปตาราง (PNG)",
                          onClick: handleExportLegacyTableImage,
                          busy: exportingLegacyTable,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-gray-100 p-3">
                <div
                  ref={legacyTableExportRef}
                  className="w-full origin-top-left bg-white"
                  style={{ zoom: legacyTableZoom } as React.CSSProperties}
                >
                  <table className="w-full min-w-full table-fixed border-collapse text-[11px] leading-tight">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-yellow-400 border-b-2 border-black">
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 bg-yellow-400 border border-black px-2 py-2 text-center font-bold w-[82px]"
                      >
                        วันที่
                      </th>
                      {[1, 2, 3, 4, 5, 6, 7].map((house) => (
                        <th
                          key={house}
                          colSpan={5}
                          className="border border-black px-2 py-2 text-center font-bold"
                          style={{ backgroundColor: legacyHouseColors[house - 1].header }}
                        >
                          เล้า {house}
                        </th>
                      ))}
                      <th
                        rowSpan={2}
                        className="border border-black px-2 py-2 text-center font-bold bg-yellow-300 w-[62px]"
                      >
                        รวม
                      </th>
                    </tr>
                    <tr className="bg-yellow-300 border-b-2 border-black">
                      {[1, 2, 3, 4, 5, 6, 7].map((house) => (
                        <React.Fragment key={house}>
                          <th className="border border-black px-1.5 py-1.5 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].subHeader }}>
                            ตายเช้า
                          </th>
                          <th className="border border-black px-1.5 py-1.5 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].subHeader }}>
                            คัดเช้า
                          </th>
                          <th className="border border-black px-1.5 py-1.5 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].subHeader }}>
                            ตายบ่าย
                          </th>
                          <th className="border border-black px-1.5 py-1.5 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].subHeader }}>
                            คัดบ่าย
                          </th>
                          <th className="border border-black px-1.5 py-1.5 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].subHeader }}>
                            รวม
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummary.map((day, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td
                          className={`sticky left-0 z-10 border border-black px-2 py-1.5 text-center font-semibold ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          {day.dateDisplay}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7].map((house) => {
                          const record = records.find(
                            (r) =>
                              r.house_number === house &&
                              r.record_date === day.date,
                          );
                          const hasMorningRecord = Boolean(record?.morning_recorded_at);
                          const hasAfternoonRecord = Boolean(record?.afternoon_recorded_at);
                          const morningDead = record?.morning_dead ?? 0;
                          const morningCulled = record?.morning_culled ?? 0;
                          const afternoonDead = record?.afternoon_dead ?? 0;
                          const afternoonCulled = record?.afternoon_culled ?? 0;
                          const rowTotal =
                            (hasMorningRecord ? morningDead + morningCulled : 0) +
                            (hasAfternoonRecord ? afternoonDead + afternoonCulled : 0);
                          const cellColor = idx % 2 === 0 ? legacyHouseColors[house - 1].cell : legacyHouseColors[house - 1].cellAlt;

                          return (
                            <React.Fragment key={house}>
                              <td className="border border-black px-1.5 py-1.5 text-center text-red-700" style={{ backgroundColor: cellColor }}>
                                {hasMorningRecord ? morningDead : "-"}
                              </td>
                              <td className="border border-black px-1.5 py-1.5 text-center text-orange-700" style={{ backgroundColor: cellColor }}>
                                {hasMorningRecord ? morningCulled : "-"}
                              </td>
                              <td className="border border-black px-1.5 py-1.5 text-center text-red-700" style={{ backgroundColor: cellColor }}>
                                {hasAfternoonRecord ? afternoonDead : "-"}
                              </td>
                              <td className="border border-black px-1.5 py-1.5 text-center text-orange-700" style={{ backgroundColor: cellColor }}>
                                {hasAfternoonRecord ? afternoonCulled : "-"}
                              </td>
                              <td className="border border-black px-1.5 py-1.5 text-center font-semibold" style={{ backgroundColor: cellColor }}>
                                {hasMorningRecord || hasAfternoonRecord ? rowTotal : "-"}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="border border-black px-2 py-1.5 text-center font-bold bg-yellow-100">
                          {records.some((r) => r.record_date === day.date) ? day.grandTotal : "-"}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-yellow-200 border-t-2 border-black">
                      <td className="sticky left-0 z-10 bg-yellow-200 border border-black px-2 py-2 text-center font-bold">
                        รวม
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map((house) => {
                        const houseRecords = records.filter((r) => r.house_number === house);
                        const morningDeadTotal = houseRecords.reduce((sum, r) => sum + (r.morning_dead || 0), 0);
                        const morningCulledTotal = houseRecords.reduce((sum, r) => sum + (r.morning_culled || 0), 0);
                        const afternoonDeadTotal = houseRecords.reduce((sum, r) => sum + (r.afternoon_dead || 0), 0);
                        const afternoonCulledTotal = houseRecords.reduce((sum, r) => sum + (r.afternoon_culled || 0), 0);
                        const houseGrandTotal = morningDeadTotal + morningCulledTotal + afternoonDeadTotal + afternoonCulledTotal;

                        return (
                          <React.Fragment key={house}>
                            <td className="border border-black px-1.5 py-2 text-center font-bold text-red-700" style={{ backgroundColor: legacyHouseColors[house - 1].total }}>
                              {morningDeadTotal}
                            </td>
                            <td className="border border-black px-1.5 py-2 text-center font-bold text-orange-700" style={{ backgroundColor: legacyHouseColors[house - 1].total }}>
                              {morningCulledTotal}
                            </td>
                            <td className="border border-black px-1.5 py-2 text-center font-bold text-red-700" style={{ backgroundColor: legacyHouseColors[house - 1].total }}>
                              {afternoonDeadTotal}
                            </td>
                            <td className="border border-black px-1.5 py-2 text-center font-bold text-orange-700" style={{ backgroundColor: legacyHouseColors[house - 1].total }}>
                              {afternoonCulledTotal}
                            </td>
                            <td className="border border-black px-1.5 py-2 text-center font-bold" style={{ backgroundColor: legacyHouseColors[house - 1].total }}>
                              {houseGrandTotal}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border border-black px-2 py-2 text-center font-bold text-lg bg-yellow-300">
                        {grandTotal}
                      </td>
                    </tr>

                    <tr className="bg-blue-100">
                      <td className="sticky left-0 z-10 bg-blue-100 border border-black px-2 py-2 text-center font-bold">
                        รวมตาย
                      </td>
                      <td
                        colSpan={36}
                        className="border border-black px-2 py-2 text-center font-bold text-red-700"
                      >
                        {grandTotalDead}
                      </td>
                    </tr>

                    <tr className="bg-orange-100">
                      <td className="sticky left-0 z-10 bg-orange-100 border border-black px-2 py-2 text-center font-bold">
                        รวมคัด
                      </td>
                      <td
                        colSpan={36}
                        className="border border-black px-2 py-2 text-center font-bold text-orange-700"
                      >
                        {grandTotalCulled}
                      </td>
                    </tr>

                    <tr className="bg-red-200">
                      <td className="sticky left-0 z-10 bg-red-200 border border-black px-2 py-2 text-center font-bold">
                        รวมตาย/คัด
                      </td>
                      <td
                        colSpan={36}
                        className="border border-black px-2 py-2 text-center font-bold text-lg"
                      >
                        {grandTotal}
                      </td>
                    </tr>
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
  );
}
