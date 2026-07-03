"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut, supabase } from "../lib/supabase";
import { getTodayThailand } from "../lib/dateUtils";
import type { User, Batch, DailyRecord } from "../types";
import { format, differenceInDays, addDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  record_date: string | null;
  house_number: number | null;
  created_at: string;
  users?: { full_name: string; house_number: number | null };
}

interface AdminBatch extends Batch {
  scheduled_end_date?: string | null;
  closed_at?: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeBatch, setActiveBatch] = useState<AdminBatch | null>(null);
  const [allBatches, setAllBatches] = useState<AdminBatch[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "summary" | "chart" | "logs" | "users" | "batches"
  >("summary");
  const [users, setUsers] = useState<User[]>([]);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchStartDate, setNewBatchStartDate] = useState("");
  const [newBatchInitialCount, setNewBatchInitialCount] = useState("");
  const [scheduleCloseBatchId, setScheduleCloseBatchId] = useState<string | null>(null);
  const [scheduledEndDate, setScheduledEndDate] = useState("");
  const [legacyTableZoom, setLegacyTableZoom] = useState(1);
  const legacyTableExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingLegacyTable, setExportingLegacyTable] = useState(false);

  const legacyHouseColors = [
    { header: "#fecaca", subHeader: "#fee2e2", cell: "#fff1f2", cellAlt: "#ffe4e6", total: "#fecaca" },
    { header: "#fed7aa", subHeader: "#ffedd5", cell: "#fff7ed", cellAlt: "#ffedd5", total: "#fed7aa" },
    { header: "#fde68a", subHeader: "#fef3c7", cell: "#fffbeb", cellAlt: "#fef3c7", total: "#fde68a" },
    { header: "#bbf7d0", subHeader: "#dcfce7", cell: "#f0fdf4", cellAlt: "#dcfce7", total: "#bbf7d0" },
    { header: "#bfdbfe", subHeader: "#dbeafe", cell: "#eff6ff", cellAlt: "#dbeafe", total: "#bfdbfe" },
    { header: "#c7d2fe", subHeader: "#e0e7ff", cell: "#eef2ff", cellAlt: "#e0e7ff", total: "#c7d2fe" },
    { header: "#ddd6fe", subHeader: "#ede9fe", cell: "#f5f3ff", cellAlt: "#ede9fe", total: "#ddd6fe" },
  ];


  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      router.push("/");
      return;
    }
    setUser(currentUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const { error: scheduledCloseError } = await supabase.rpc(
        "close_scheduled_batches",
      );

      if (scheduledCloseError) {
        console.warn("Scheduled batch close check failed:", scheduledCloseError);
      }

      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (batchesData) {
        setAllBatches(batchesData);
        const active = batchesData.find((b) => b.is_active);
        setActiveBatch(active || null);

        if (active) {
          const { data: recordsData } = await supabase
            .from("daily_records")
            .select("*")
            .eq("batch_id", active.id)
            .order("record_date", { ascending: true });
          setRecords(recordsData || []);
        }
      }

      const { data: usersData } = await supabase
        .from("users")
        .select("*")
        .order("role", { ascending: false })
        .order("house_number", { ascending: true });
      setUsers(usersData || []);

      const { data: logsData } = await supabase
        .from("activity_logs")
        .select("*, users(full_name, house_number)")
        .order("created_at", { ascending: false })
        .limit(100);
      setActivityLogs(logsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.push("/");
  };

  const handleCreateBatch = async () => {
    if (!newBatchName || !newBatchStartDate) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      // ปิดรุ่นเก่าก่อน
      if (activeBatch) {
        const { error: closeActiveError } = await supabase
          .from("batches")
          .update({
            is_active: false,
            end_date: getTodayThailand(),
            scheduled_end_date: null,
            closed_at: new Date().toISOString(),
          })
          .eq("id", activeBatch.id);

        if (closeActiveError) throw closeActiveError;
      }

      // สร้างรุ่นใหม่
      const { error } = await supabase.from("batches").insert({
        batch_name: newBatchName,
        start_date: newBatchStartDate,
        initial_count: parseInt(newBatchInitialCount) || 0,
        is_active: true,
        scheduled_end_date: null,
        closed_at: null,
        created_by: user?.id,
      });

      if (error) throw error;

      alert("สร้างรุ่นใหม่สำเร็จ");
      setShowBatchForm(false);
      setNewBatchName("");
      setNewBatchStartDate("");
      setNewBatchInitialCount("");
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleCloseBatch = async (batchId: string) => {
    if (!confirm("ต้องการปิดรุ่นนี้ทันทีหรือไม่?")) return;

    try {
      const { error } = await supabase
        .from("batches")
        .update({
          is_active: false,
          end_date: getTodayThailand(),
          scheduled_end_date: null,
          closed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      if (error) throw error;

      alert("ปิดรุ่นสำเร็จ");
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleScheduleCloseBatch = async (batchId: string) => {
    if (!scheduledEndDate) {
      alert("กรุณาเลือกวันที่ต้องการปิดรุ่น");
      return;
    }

    if (
      !confirm(`ต้องการตั้งเวลาปิดรุ่นในวันที่ ${scheduledEndDate} หรือไม่?`)
    )
      return;

    try {
      const { error } = await supabase
        .from("batches")
        .update({ scheduled_end_date: scheduledEndDate })
        .eq("id", batchId);

      if (error) throw error;

      alert("ตั้งเวลาปิดรุ่นสำเร็จ");
      setScheduleCloseBatchId(null);
      setScheduledEndDate("");
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleCancelScheduledCloseBatch = async (batchId: string) => {
    if (!confirm("ต้องการยกเลิกเวลาปิดรุ่นนี้หรือไม่?")) return;

    try {
      const { error } = await supabase
        .from("batches")
        .update({ scheduled_end_date: null })
        .eq("id", batchId);

      if (error) throw error;

      alert("ยกเลิกเวลาปิดรุ่นสำเร็จ");
      if (scheduleCloseBatchId === batchId) {
        setScheduleCloseBatchId(null);
        setScheduledEndDate("");
      }
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (
      !confirm(
        `ต้องการลบรุ่น "${batchName}" หรือไม่?\n\n⚠️ ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้!`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("batches")
        .delete()
        .eq("id", batchId);

      if (error) throw error;

      alert("ลบรุ่นสำเร็จ");
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };


  const handleExportLegacyTableImage = async () => {
    const element = legacyTableExportRef.current;
    if (!element) return;

    setExportingLegacyTable(true);

    const previousZoom = element.style.zoom;
    element.style.zoom = "1";

    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const link = document.createElement("a");
      link.download = `ตารางข้อมูลเดิม-${activeBatch?.batch_name || "batch"}-${getTodayThailand()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      alert(
        "ไม่สามารถ Export เป็นรูปภาพได้ กรุณาติดตั้งแพ็กเกจ html2canvas ด้วยคำสั่ง: npm install html2canvas",
      );
    } finally {
      element.style.zoom = previousZoom;
      setExportingLegacyTable(false);
    }
  };

  const calculateDailySummary = () => {
    if (!activeBatch) return [];

    const startDate = new Date(activeBatch.start_date);
    const today = new Date(getTodayThailand());
    const days = differenceInDays(today, startDate) + 1;
    const summary: any[] = [];

    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDate, day);
      const dateStr = format(currentDate, "yyyy-MM-dd");

      const dayData: any = {
        day: day + 1,
        date: dateStr,
        dateDisplay: format(currentDate, "d/M/yyyy"),
        houses: {},
      };

      let dayTotalDead = 0;
      let dayTotalCulled = 0;

      for (let house = 1; house <= 7; house++) {
        const record = records.find(
          (r) => r.house_number === house && r.record_date === dateStr,
        );

        const dead =
          (record?.morning_dead || 0) + (record?.afternoon_dead || 0);
        const culled =
          (record?.morning_culled || 0) + (record?.afternoon_culled || 0);

        dayData.houses[house] = { dead, culled, total: dead + culled };
        dayTotalDead += dead;
        dayTotalCulled += culled;
      }

      dayData.totalDead = dayTotalDead;
      dayData.totalCulled = dayTotalCulled;
      dayData.grandTotal = dayTotalDead + dayTotalCulled;
      summary.push(dayData);
    }

    return summary;
  };

  const calculateHouseTotals = (summary: any[]) => {
    const totals: any = {};

    for (let house = 1; house <= 7; house++) {
      let totalDead = 0;
      let totalCulled = 0;

      summary.forEach((day) => {
        totalDead += day.houses[house].dead;
        totalCulled += day.houses[house].culled;
      });

      totals[house] = {
        dead: totalDead,
        culled: totalCulled,
        total: totalDead + totalCulled,
      };
    }

    return totals;
  };

  const prepareChartData = () => {
    const dailySummary = calculateDailySummary();
    const todayDate = getTodayThailand();
    // แสดงเฉพาะวันที่ผ่านมาแล้ว (ไม่รวมวันอนาคต)
    // แต่แสดงทุกวันแม้ยังไม่มีข้อมูล (แสดง 0)
    return dailySummary
      .filter((day) => day.date <= todayDate)
      .map((day) => ({
        date: day.dateDisplay,
        "เล้า 1": day.houses[1].total,
        "เล้า 2": day.houses[2].total,
        "เล้า 3": day.houses[3].total,
        "เล้า 4": day.houses[4].total,
        "เล้า 5": day.houses[5].total,
        "เล้า 6": day.houses[6].total,
        "เล้า 7": day.houses[7].total,
      }));
  };

  const prepareHouseChartData = () => {
    const dailySummary = calculateDailySummary();
    const houseTotals = calculateHouseTotals(dailySummary);

    return [1, 2, 3, 4, 5, 6, 7].map((house) => ({
      เล้า: `เล้า ${house}`,
      ตาย: houseTotals[house].dead,
      คัด: houseTotals[house].culled,
      รวม: houseTotals[house].total,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const dailySummary = calculateDailySummary();
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

  return (
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
          </div>
        </div>
      </div>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "summary" && activeBatch && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 md:p-6 text-white shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-1">
                    ภาพรวมรุ่นปัจจุบัน
                  </p>
                  <h2 className="font-bold text-2xl md:text-3xl">
                    สรุปไก่ตาย-ไก่คัด รุ่น {activeBatch.batch_name}
                  </h2>
                  <p className="text-sm md:text-base text-blue-100 mt-2">
                    เริ่มวันที่:{" "}
                    {format(new Date(activeBatch.start_date), "dd MMMM yyyy", {
                      locale: th,
                    })}{" "}
                    (วันที่{" "}
                    {differenceInDays(
                      new Date(getTodayThailand()),
                      new Date(activeBatch.start_date),
                    ) + 1}
                    )
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl font-semibold transition"
                >
                  โหลดข้อมูลใหม่
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-200">
                <p className="text-xs md:text-sm text-gray-500 font-semibold">
                  จำนวนเริ่มต้น
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                  {activeBatch.initial_count?.toLocaleString() || 0}
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
                    (activeBatch.initial_count || 0) - grandTotal,
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
                              ยอดสะสมทั้งรุ่น
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${total.total > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                        >
                          รวม {total.total}
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
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    ข้อมูลรายวันแบบอ่านง่าย
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {dailySummary.map((day, idx) => (
                  <details
                    key={idx}
                    className="group rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
                    open={idx === dailySummary.length - 1}
                  >
                    <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 bg-white hover:bg-gray-50 transition">
                      <div>
                        <p className="font-bold text-gray-900">
                          วันที่ {day.dateDisplay}
                        </p>
                        <p className="text-sm text-gray-500">
                          วันที่ {day.day} ของรุ่น
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold text-sm">
                          รวม {day.grandTotal || 0}
                        </span>
                        <span className="text-gray-400 group-open:rotate-180 transition">
                          ⌄
                        </span>
                      </div>
                    </summary>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((house) => {
                        const data = day.houses[house];
                        const record = records.find(
                          (r) =>
                            r.house_number === house &&
                            r.record_date === day.date,
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
                  </details>
                ))}
              </div>
            </div>

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

                    <button
                      onClick={handleExportLegacyTableImage}
                      disabled={exportingLegacyTable}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm transition"
                      type="button"
                    >
                      {exportingLegacyTable ? "กำลัง Export..." : "Export เป็นภาพ PNG"}
                    </button>
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
        )}

        {activeTab === "chart" && activeBatch && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 text-lg">
                กราฟสรุปรุ่น {activeBatch.batch_name}
              </h2>
            </div>

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
        )}

        {(activeTab === "summary" || activeTab === "chart") && !activeBatch && (
          <div className="text-center bg-white p-12 rounded-lg shadow-sm">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              ยังไม่มีรุ่นที่เปิดใช้งาน
            </h3>
            <p className="text-gray-500 mb-6">
              กรุณาสร้างรุ่นใหม่ในเมนู "จัดการรุ่น"
            </p>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                ประวัติการทำรายการ
              </h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        เวลา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้ใช้
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        เล้า
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        กิจกรรม
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่บันทึก
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleString("th-TH", {
                            timeZone: "Asia/Bangkok",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.users?.full_name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.house_number || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.record_date
                            ? new Date(log.record_date).toLocaleDateString(
                                "th-TH",
                                { timeZone: "Asia/Bangkok" },
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "batches" && (
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      onChange={(e) => setNewBatchStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      จำนวนเริ่มต้น
                    </label>
                    <input
                      type="number"
                      value={newBatchInitialCount}
                      onChange={(e) => setNewBatchInitialCount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
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
                    <tr key={batch.id}>
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
                        <div className="flex space-x-3">
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
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                จัดการผู้ใช้
              </h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อผู้ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-นามสกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      บทบาท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เล้า
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.house_number || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ระงับ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <div className="text-center py-8 text-sm text-gray-500">
        <p>พัฒนาโดย พิชชาพัฒน์ นีลวัฒนานนท์</p>
      </div>
    </div>
  );
}
