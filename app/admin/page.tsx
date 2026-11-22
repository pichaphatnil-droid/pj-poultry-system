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
import TodayOverview from "./components/TodayOverview";

type AdminTab =
  | "summary"
  | "chart"
  | "weekly"
  | "weight"
  | "logs"
  | "users"
  | "batches"
  | "settings";

// เมนูหลัก 4 กลุ่ม (ข้างในแต่ละกลุ่มยังเป็นหน้าเดิมทุกหน้า)
const NAV_GROUPS: {
  key: string;
  label: string;
  icon: string;
  tabs: [AdminTab, string][];
}[] = [
  {
    key: "overview",
    label: "ภาพรวม",
    icon: "📊",
    tabs: [
      ["summary", "ตารางสรุป"],
      ["chart", "กราฟ"],
    ],
  },
  {
    key: "weight",
    label: "น้ำหนัก",
    icon: "⚖️",
    tabs: [
      ["weekly", "ประสิทธิภาพรายสัปดาห์"],
      ["weight", "คำนวณน้ำหนัก"],
    ],
  },
  { key: "batches", label: "รุ่นไก่", icon: "🐔", tabs: [["batches", "จัดการรุ่น"]] },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: "⚙️",
    tabs: [
      ["settings", "ตั้งค่าฟาร์ม"],
      ["users", "ผู้ใช้"],
      ["logs", "ประวัติการทำรายการ"],
    ],
  },
];

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
  const currentGroup =
    NAV_GROUPS.find((g) => g.tabs.some(([tab]) => tab === activeTab)) ?? NAV_GROUPS[0];

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
  
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            {/* เมนูหลัก 4 กลุ่ม */}
            <div className="flex gap-1 overflow-x-auto pt-2">
              {NAV_GROUPS.map((group) => {
                const selected = group.key === currentGroup.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setActiveTab(group.tabs[0][0])}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-base font-semibold transition ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    <span>{group.icon}</span>
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* เมนูย่อย (เฉพาะกลุ่มที่มีมากกว่า 1 หน้า) */}
          {currentGroup.tabs.length > 1 && (
            <div className="border-t border-gray-100 bg-gray-50">
              <div className="max-w-full mx-auto flex gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
                {currentGroup.tabs.map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

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
          {currentGroup.key === "overview" && viewingBatch && <TodayOverview />}

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
