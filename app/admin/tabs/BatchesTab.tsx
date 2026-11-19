"use client";

import { getTodayThailand } from "../../lib/dateUtils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { HOUSE_NUMBERS, createEmptyHouseCountInputs, createEmptyHouseDetailInputs } from "../shared";
import { useAdmin } from "../AdminContext";

export default function BatchesTab() {
  const {
    allBatches,
    showBatchForm,
    setShowBatchForm,
    newBatchName,
    setNewBatchName,
    newBatchStartDate,
    setNewBatchStartDate,
    newBatchHouseCounts,
    setNewBatchHouseDetails,
    editHouseCountsBatchId,
    setEditHouseCountsBatchId,
    editHouseCounts,
    setEditHouseCounts,
    setEditHouseDetails,
    savingHouseCounts,
    scheduleCloseBatchId,
    setScheduleCloseBatchId,
    scheduledEndDate,
    setScheduledEndDate,
    selectedBatchId,
    handleViewBatchSummary,
    handleCreateBatch,
    handleOpenHouseCountsEditor,
    handleSaveHouseCounts,
    handleCloseBatch,
    handleScheduleCloseBatch,
    handleCancelScheduledCloseBatch,
    handleDeleteBatch,
    renderHouseDetailCards,
  } = useAdmin();

  return (
    <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                จัดการรุ่น
              </h2>
              <button
                onClick={() => setShowBatchForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                + สร้างรุ่นใหม่
              </button>
            </div>

            {showBatchForm && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  สร้างรุ่นใหม่
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อรุ่น
                    </label>
                    <input
                      type="text"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="เช่น รุ่น 3/69"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่เริ่มรุ่น
                    </label>
                    <input
                      type="date"
                      value={newBatchStartDate}
                      onChange={(e) => {
                        const date = e.target.value;
                        setNewBatchStartDate(date);
                        setNewBatchHouseDetails((current) =>
                          Object.fromEntries(
                            HOUSE_NUMBERS.map((house) => [
                              house,
                              { ...current[house], arrivalDate: date },
                            ]),
                          ),
                        );
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        จำนวนไก่ลงเริ่มต้นแยกตามเล้า
                      </h4>
                      <p className="text-sm text-gray-500">
                        กรอกจากช่อง DOC/จำนวนไก่เข้าใน Weekly Report ของฟาร์ม
                      </p>
                    </div>
                    <p className="text-sm font-bold text-blue-700">
                      รวม {HOUSE_NUMBERS.reduce(
                        (sum, house) =>
                          sum +
                          (Number.parseInt(newBatchHouseCounts[house], 10) || 0),
                        0,
                      ).toLocaleString()} ตัว
                    </p>
                  </div>
                  {renderHouseDetailCards("new")}
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBatchForm(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateBatch}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    สร้างรุ่น
                  </button>
                </div>
              </div>
            )}

            {editHouseCountsBatchId && (
              <div className="rounded-lg border border-purple-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      แก้ไขข้อมูลประจำเล้า
                    </h3>
                    <p className="text-sm text-gray-500">
                      รุ่น {allBatches.find((batch) => batch.id === editHouseCountsBatchId)?.batch_name || "-"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-purple-700">
                    รวม {HOUSE_NUMBERS.reduce(
                      (sum, house) =>
                        sum +
                        (Number.parseInt(editHouseCounts[house], 10) || 0),
                      0,
                    ).toLocaleString()} ตัว
                  </p>
                </div>

                {renderHouseDetailCards("edit")}

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditHouseCountsBatchId(null);
                      setEditHouseCounts(createEmptyHouseCountInputs());
                      setEditHouseDetails(createEmptyHouseDetailInputs());
                    }}
                    disabled={savingHouseCounts}
                    className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHouseCounts}
                    disabled={savingHouseCounts}
                    className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                  >
                    {savingHouseCounts ? "กำลังบันทึก..." : "บันทึกข้อมูลประจำเล้า"}
                  </button>
                </div>
              </div>
            )}

            {scheduleCloseBatchId && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  ตั้งเวลาปิดรุ่น
                </h3>
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่ต้องการปิดรุ่น
                    </label>
                    <input
                      type="date"
                      value={scheduledEndDate}
                      min={getTodayThailand()}
                      onChange={(e) => setScheduledEndDate(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleScheduleCloseBatch(scheduleCloseBatchId)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    บันทึกเวลาปิด
                  </button>
                  <button
                    onClick={() => {
                      setScheduleCloseBatchId(null);
                      setScheduledEndDate("");
                    }}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อรุ่น
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่เริ่ม
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่จบ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ตั้งเวลาปิด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className={
                        selectedBatchId === batch.id ? "bg-blue-50" : undefined
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {batch.batch_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(batch.start_date), "dd/MM/yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.end_date
                          ? format(new Date(batch.end_date), "dd/MM/yyyy")
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.scheduled_end_date
                          ? format(
                              new Date(batch.scheduled_end_date),
                              "dd/MM/yyyy",
                            )
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {batch.is_active ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              กำลังใช้งาน
                            </span>
                            {batch.scheduled_end_date && (
                              <span className="text-xs text-blue-600 font-medium">
                                รอปิดตามกำหนด
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            สิ้นสุดแล้ว
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleViewBatchSummary(batch.id)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            ดูสรุป
                          </button>
                          <button
                            onClick={() => handleOpenHouseCountsEditor(batch.id)}
                            className="text-purple-600 hover:text-purple-900 font-medium"
                          >
                            แก้ข้อมูลประจำเล้า
                          </button>
                          {batch.is_active && (
                            <>
                              <button
                                onClick={() => handleCloseBatch(batch.id)}
                                className="text-orange-600 hover:text-orange-900 font-medium"
                              >
                                ปิดทันที
                              </button>
                              <button
                                onClick={() => {
                                  setScheduleCloseBatchId(batch.id);
                                  setScheduledEndDate(
                                    batch.scheduled_end_date || "",
                                  );
                                }}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                {batch.scheduled_end_date
                                  ? "แก้ไขเวลาปิด"
                                  : "ตั้งเวลาปิด"}
                              </button>
                              {batch.scheduled_end_date && (
                                <button
                                  onClick={() =>
                                    handleCancelScheduledCloseBatch(batch.id)
                                  }
                                  className="text-gray-600 hover:text-gray-900 font-medium"
                                >
                                  ยกเลิกเวลา
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() =>
                              handleDeleteBatch(batch.id, batch.batch_name)
                            }
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
  );
}
