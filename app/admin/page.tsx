"use client";

import UsersManager from "./UsersManager";
import { useAdminState } from "./useAdminState";
import { deriveAdminView } from "./adminView";
import { AdminProvider } from "./AdminContext";
import SummaryTab from "./tabs/SummaryTab";
import ChartTab from "./tabs/ChartTab";
import WeeklyTab from "./tabs/WeeklyTab";
import WeightTab from "./tabs/WeightTab";
import NoBatchNotice from "./tabs/NoBatchNotice";
import LogsTab from "./tabs/LogsTab";
import BatchesTab from "./tabs/BatchesTab";
import SettingsTab from "./tabs/SettingsTab";

export default function AdminDashboard() {
  const state = useAdminState();

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const admin = { ...state, ...deriveAdminView(state) };
  const {
    user,
    activeTab,
    setActiveTab,
    users,
    loadUsers,
    handleLogout,
    viewingBatch,
    recordAlerts,
  } = admin;

  return (
    <AdminProvider value={admin}>
  <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b-2 border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  ระบบจัดการ - แอดมิน
                </h1>
                <p className="text-sm text-gray-600 mt-1">{user?.full_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </header>
  
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("summary")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "summary"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ตารางสรุป
              </button>
              <button
                onClick={() => setActiveTab("chart")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "chart"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                กราฟสรุป
              </button>
              <button
                onClick={() => setActiveTab("weekly")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "weekly"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ประสิทธิภาพรายสัปดาห์
              </button>
              <button
                onClick={() => setActiveTab("weight")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "weight"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                คำนวณน้ำหนัก
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "logs"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ประวัติการทำรายการ
              </button>
              <button
                onClick={() => setActiveTab("batches")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "batches"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                จัดการรุ่น
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "users"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                จัดการผู้ใช้
              </button>
            <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === "settings"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ตั้งค่า
              </button>
            </div>
          </div>
        </div>
  
        {recordAlerts.length > 0 && (
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              {recordAlerts.map((a) => (
                <p key={a.period} className="font-semibold">
                  ⚠️ ยังไม่บันทึก{a.label}วันนี้: เล้า {a.houses.join(", ")}
                </p>
              ))}
            </div>
          </div>
        )}

        <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "summary" && viewingBatch && <SummaryTab />}
  
          {activeTab === "chart" && viewingBatch && <ChartTab />}
  
          {activeTab === "weekly" && viewingBatch && <WeeklyTab />}
  
          {activeTab === "weight" && viewingBatch && <WeightTab />}
  
          {(activeTab === "summary" ||
            activeTab === "chart" ||
            activeTab === "weekly" ||
            activeTab === "weight") &&
            !viewingBatch && <NoBatchNotice />}
  
          {activeTab === "logs" && <LogsTab />}
  
          {activeTab === "batches" && <BatchesTab />}
  
          {activeTab === "settings" && <SettingsTab />}

          {activeTab === "users" && (
            <UsersManager
              users={users}
              currentUserId={user?.id ?? null}
              onChanged={loadUsers}
            />
          )}
        </main>
  
        <div className="text-center py-8 text-sm text-gray-500">
          <p>พัฒนาโดย พิชชาพัฒน์ นีลวัฒนานนท์</p>
        </div>
      </div>
    
    </AdminProvider>
  );
}
