"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ExportMenu from "../components/ExportMenu";
import { useAdmin } from "../AdminContext";

export default function ChartTab() {
  const {
    chartSummaryExportRef,
    exportingChartImage,
    selectedBatchId,
    recordsLoading,
    handleSelectViewBatch,
    handleExportChartImage,
    viewingBatch: maybeViewingBatch,
    prepareChartData,
    prepareHouseChartData,
    batchOptions,
  } = useAdmin();
  const viewingBatch = maybeViewingBatch!;

  return (
    <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="font-semibold text-blue-900 text-lg">
                กราฟสรุปรุ่น {viewingBatch.batch_name}
                {!viewingBatch.is_active && (
                  <span className="ml-2 text-sm font-normal text-blue-700">
                    (ปิดแล้ว - ข้อมูลย้อนหลัง)
                  </span>
                )}
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ExportMenu
                  options={[
                    {
                      icon: "🖼️",
                      label: "รูปกราฟ (PNG)",
                      onClick: handleExportChartImage,
                      disabled: recordsLoading,
                      busy: exportingChartImage,
                    },
                  ]}
                />
                <span className="text-sm font-semibold text-blue-900">
                  เลือกรุ่น:
                </span>
                <select
                  value={selectedBatchId || ""}
                  onChange={(e) => handleSelectViewBatch(e.target.value)}
                  disabled={recordsLoading}
                  className="px-3 py-2 rounded-lg bg-white border border-blue-300 text-blue-900 font-semibold outline-none disabled:opacity-60"
                >
                  {batchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} {b.is_active ? "(กำลังใช้งาน)" : "(ปิดแล้ว)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div ref={chartSummaryExportRef} className="space-y-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                กราฟแสดงแนวโน้มรายวัน (แยกตามเล้า)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="เล้า 1"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 2"
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 3"
                    stroke="#eab308"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 4"
                    stroke="#84cc16"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 5"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 6"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="เล้า 7"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                สรุปยอดรวมแต่ละเล้า
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={prepareHouseChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="เล้า" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ตาย" fill="#ef4444" />
                  <Bar dataKey="คัด" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>
          </div>
  );
}
