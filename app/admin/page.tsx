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

interface BatchHouseCount {
  batch_id: string;
  house_number: number;
  initial_count: number;
  arrival_date: string | null;
  capture_date: string | null;
  chicken_sex: ChickenSex | null;
  breed: string | null;
  initial_weight: number | null;
  weekly_weight_1: number | null;
  weekly_weight_2: number | null;
  weekly_weight_3: number | null;
  weekly_weight_4: number | null;
  weekly_weight_5: number | null;
  weekly_weight_6: number | null;
}

type HouseChartMetric = "dead" | "culled" | "total";
type ChickenSex = "male" | "female" | "mix";

interface HouseDetailInput {
  arrivalDate: string;
  captureDate: string;
  chickenSex: ChickenSex | "";
  breed: string;
  initialWeight: string;
}

const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
const WEEKLY_TARGET_LOSS = [0.6, 0.4, 0.3, 0.3, 0.4, 0.5] as const;
const WEEKLY_WEIGHT_FIELDS = [
  "weekly_weight_1",
  "weekly_weight_2",
  "weekly_weight_3",
  "weekly_weight_4",
  "weekly_weight_5",
  "weekly_weight_6",
] as const;
const HOUSE_AREAS: Record<number, number> = {
  1: 3000,
  2: 3000,
  3: 3000,
  4: 3000,
  5: 3000,
  6: 3000,
  7: 2500,
};
const BATCH_HOUSE_SELECT =
  "batch_id, house_number, initial_count, arrival_date, capture_date, chicken_sex, breed, initial_weight, weekly_weight_1, weekly_weight_2, weekly_weight_3, weekly_weight_4, weekly_weight_5, weekly_weight_6";
const WEIGHT_STANDARDS: Record<
  ChickenSex,
  { label: string; weights: readonly number[] }
> = {
  male: { label: "ผู้ (Male)", weights: [203, 520, 1011, 1646, 2367, 3118] },
  female: { label: "เมีย (Female)", weights: [204, 505, 945, 1488, 2084, 2684] },
  mix: { label: "คละ (Mix)", weights: [204, 512, 978, 1567, 2226, 2901] },
};

const createEmptyHouseCountInputs = (): Record<number, string> =>
  Object.fromEntries(HOUSE_NUMBERS.map((house) => [house, ""]));

const createEmptyHouseDetailInputs = (): Record<number, HouseDetailInput> =>
  Object.fromEntries(
    HOUSE_NUMBERS.map((house) => [
      house,
      {
        arrivalDate: "",
        captureDate: "",
        chickenSex: "",
        breed: "",
        initialWeight: "",
      },
    ]),
  );

const createEmptyWeeklyWeightInputs = (): Record<number, string[]> =>
  Object.fromEntries(
    HOUSE_NUMBERS.map((house) => [house, WEEKLY_WEIGHT_FIELDS.map(() => "")]),
  );

const createWeeklyWeightInputs = (
  rows: BatchHouseCount[],
): Record<number, string[]> => {
  const inputs = createEmptyWeeklyWeightInputs();

  rows.forEach((row) => {
    inputs[row.house_number] = WEEKLY_WEIGHT_FIELDS.map((field) =>
      row[field] == null ? "" : String(row[field]),
    );
  });

  return inputs;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeBatch, setActiveBatch] = useState<AdminBatch | null>(null);
  const [allBatches, setAllBatches] = useState<AdminBatch[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "summary" | "chart" | "weekly" | "logs" | "users" | "batches"
  >("summary");
  const [users, setUsers] = useState<User[]>([]);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchStartDate, setNewBatchStartDate] = useState("");
  const [newBatchHouseCounts, setNewBatchHouseCounts] = useState<
    Record<number, string>
  >(createEmptyHouseCountInputs);
  const [newBatchHouseDetails, setNewBatchHouseDetails] = useState<
    Record<number, HouseDetailInput>
  >(createEmptyHouseDetailInputs);
  const [houseInitialCounts, setHouseInitialCounts] = useState<
    Record<number, number>
  >({});
  const [housePerformanceData, setHousePerformanceData] = useState<
    Record<number, BatchHouseCount>
  >({});
  const [editHouseCountsBatchId, setEditHouseCountsBatchId] = useState<
    string | null
  >(null);
  const [editHouseCounts, setEditHouseCounts] = useState<Record<number, string>>(
    createEmptyHouseCountInputs,
  );
  const [editHouseDetails, setEditHouseDetails] = useState<
    Record<number, HouseDetailInput>
  >(createEmptyHouseDetailInputs);
  const [savingHouseCounts, setSavingHouseCounts] = useState(false);
  const [weeklyWeightInputs, setWeeklyWeightInputs] = useState<
    Record<number, string[]>
  >(createEmptyWeeklyWeightInputs);
  const [editingWeeklyWeights, setEditingWeeklyWeights] = useState(false);
  const [savingWeeklyWeights, setSavingWeeklyWeights] = useState(false);
  const [scheduleCloseBatchId, setScheduleCloseBatchId] = useState<string | null>(null);
  const [scheduledEndDate, setScheduledEndDate] = useState("");
  const [legacyTableZoom, setLegacyTableZoom] = useState(1);
  const legacyTableExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingLegacyTable, setExportingLegacyTable] = useState(false);
  const weeklyPerformanceExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingWeeklyPerformance, setExportingWeeklyPerformance] =
    useState(false);

  // รุ่นที่กำลังดูอยู่ในแท็บ "ตารางสรุป" / "กราฟสรุป" (อาจเป็นรุ่นที่ปิดไปแล้วก็ได้)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [visibleHouseMetrics, setVisibleHouseMetrics] = useState<
    Record<HouseChartMetric, boolean>
  >({ dead: true, culled: true, total: true });
  const [recordsLoading, setRecordsLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // เลือกรุ่นที่จะแสดงผล: ถ้าผู้ใช้เลือกรุ่นไว้แล้วและรุ่นนั้นยังมีอยู่ ให้คงไว้ตามเดิม
        // (ไม่สลับกลับไปที่รุ่นปัจจุบันทันทีที่ปิดรุ่น) ไม่เช่นนั้นให้ตั้งค่าเริ่มต้นเป็นรุ่นที่ใช้งานอยู่
        // หรือรุ่นล่าสุดถ้าไม่มีรุ่นที่ใช้งานอยู่เลย
        const stillExists =
          selectedBatchId && batchesData.some((b) => b.id === selectedBatchId);
        const targetBatchId = stillExists
          ? selectedBatchId
          : active?.id || batchesData[0]?.id || null;

        if (targetBatchId !== selectedBatchId) {
          setSelectedBatchId(targetBatchId);
        }

        if (targetBatchId) {
          const [recordsResult, houseCountsResult] = await Promise.all([
            supabase
              .from("daily_records")
              .select("*")
              .eq("batch_id", targetBatchId)
              .order("record_date", { ascending: true }),
            supabase
              .from("batch_house_counts")
              .select(BATCH_HOUSE_SELECT)
              .eq("batch_id", targetBatchId)
              .order("house_number", { ascending: true }),
          ]);

          const recordsData = recordsResult.data;
          setRecords(recordsData || []);
          const houseCountRows = (houseCountsResult.data || []) as BatchHouseCount[];
          setHouseInitialCounts(
            Object.fromEntries(
              houseCountRows.map((item) => [item.house_number, item.initial_count]),
            ),
          );
          setHousePerformanceData(
            Object.fromEntries(
              houseCountRows.map((item) => [item.house_number, item]),
            ),
          );
          setWeeklyWeightInputs(createWeeklyWeightInputs(houseCountRows));
        } else {
          setRecords([]);
          setHouseInitialCounts({});
          setHousePerformanceData({});
          setWeeklyWeightInputs(createEmptyWeeklyWeightInputs());
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

  // โหลดข้อมูล daily_records สำหรับรุ่นที่เลือกดู (ใช้ตอนผู้ใช้สลับรุ่นในตัวเลือก)
  const handleSelectViewBatch = async (batchId: string) => {
    if (!batchId) return;
    setSelectedBatchId(batchId);
    setSelectedHouse(null);
    setEditingWeeklyWeights(false);
    setRecordsLoading(true);
    try {
      const [recordsResult, houseCountsResult] = await Promise.all([
        supabase
          .from("daily_records")
          .select("*")
          .eq("batch_id", batchId)
          .order("record_date", { ascending: true }),
        supabase
          .from("batch_house_counts")
          .select(BATCH_HOUSE_SELECT)
          .eq("batch_id", batchId)
          .order("house_number", { ascending: true }),
      ]);

      if (recordsResult.error) throw recordsResult.error;
      if (houseCountsResult.error) throw houseCountsResult.error;

      setRecords(recordsResult.data || []);
      const houseCountRows = (houseCountsResult.data || []) as BatchHouseCount[];
      setHouseInitialCounts(
        Object.fromEntries(
          houseCountRows.map((item) => [item.house_number, item.initial_count]),
        ),
      );
      setHousePerformanceData(
        Object.fromEntries(
          houseCountRows.map((item) => [item.house_number, item]),
        ),
      );
      setWeeklyWeightInputs(createWeeklyWeightInputs(houseCountRows));
    } catch (error) {
      console.error("Error loading records for selected batch:", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  // ใช้จากแท็บ "จัดการรุ่น" เพื่อกดดูสรุปของรุ่นใดรุ่นหนึ่งโดยตรง
  const handleViewBatchSummary = async (batchId: string) => {
    await handleSelectViewBatch(batchId);
    setActiveTab("summary");
  };

  const handleViewHouseSummary = (house: number) => {
    setSelectedHouse(house);
    window.setTimeout(() => {
      document
        .getElementById("selected-house-summary")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleToggleHouseMetric = (metric: HouseChartMetric) => {
    setVisibleHouseMetrics((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;

      // ให้กราฟมีข้อมูลแสดงอย่างน้อย 1 เส้นเสมอ
      if (current[metric] && visibleCount === 1) return current;

      return { ...current, [metric]: !current[metric] };
    });
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

    const parsedHouseCounts = Object.fromEntries(
      HOUSE_NUMBERS.map((house) => [
        house,
        Number.parseInt(newBatchHouseCounts[house], 10) || 0,
      ]),
    ) as Record<number, number>;

    if (HOUSE_NUMBERS.some((house) => parsedHouseCounts[house] <= 0)) {
      alert("กรุณากรอกจำนวนไก่ลงเริ่มต้นให้ครบทั้ง 7 เล้า");
      return;
    }

    if (
      HOUSE_NUMBERS.some((house) => {
        const detail = newBatchHouseDetails[house];
        return (
          !detail.arrivalDate ||
          !detail.chickenSex ||
          !detail.breed.trim() ||
          !(Number.parseFloat(detail.initialWeight) > 0)
        );
      })
    ) {
      alert(
        "กรุณากรอกวันที่ไก่เข้า เพศ พันธุ์ และน้ำหนักแรกเข้าให้ครบทั้ง 7 เล้า",
      );
      return;
    }

    if (
      HOUSE_NUMBERS.some((house) => {
        const detail = newBatchHouseDetails[house];
        return (
          detail.captureDate !== "" &&
          detail.captureDate < detail.arrivalDate
        );
      })
    ) {
      alert("วันที่จับไก่ต้องไม่อยู่ก่อนวันที่ไก่เข้า");
      return;
    }

    const totalInitialCount = HOUSE_NUMBERS.reduce(
      (sum, house) => sum + parsedHouseCounts[house],
      0,
    );

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
      const { data: insertedBatch, error } = await supabase
        .from("batches")
        .insert({
          batch_name: newBatchName,
          start_date: newBatchStartDate,
          initial_count: totalInitialCount,
          is_active: true,
          scheduled_end_date: null,
          closed_at: null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!insertedBatch) throw new Error("ไม่พบข้อมูลรุ่นที่เพิ่งสร้าง");

      const { error: houseCountsError } = await supabase
        .from("batch_house_counts")
        .insert(
          HOUSE_NUMBERS.map((house) => ({
            batch_id: insertedBatch.id,
            house_number: house,
            initial_count: parsedHouseCounts[house],
            arrival_date: newBatchHouseDetails[house].arrivalDate,
            capture_date: newBatchHouseDetails[house].captureDate || null,
            chicken_sex: newBatchHouseDetails[house].chickenSex,
            breed: newBatchHouseDetails[house].breed.trim(),
            initial_weight: Number.parseFloat(
              newBatchHouseDetails[house].initialWeight,
            ),
          })),
        );

      if (houseCountsError) throw houseCountsError;

      alert("สร้างรุ่นใหม่สำเร็จ");
      setShowBatchForm(false);
      setNewBatchName("");
      setNewBatchStartDate("");
      setNewBatchHouseCounts(createEmptyHouseCountInputs());
      setNewBatchHouseDetails(createEmptyHouseDetailInputs());
      // สลับไปดูรุ่นใหม่ที่เพิ่งสร้างโดยอัตโนมัติ
      if (insertedBatch) {
        setSelectedBatchId(insertedBatch.id);
      }
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleOpenHouseCountsEditor = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from("batch_house_counts")
        .select(BATCH_HOUSE_SELECT)
        .eq("batch_id", batchId)
        .order("house_number", { ascending: true });

      if (error) throw error;

      const counts = createEmptyHouseCountInputs();
      const details = createEmptyHouseDetailInputs();
      ((data || []) as BatchHouseCount[]).forEach((item) => {
        counts[item.house_number] = item.initial_count.toString();
        details[item.house_number] = {
          arrivalDate: item.arrival_date || "",
          captureDate: item.capture_date || "",
          chickenSex: item.chicken_sex || "",
          breed: item.breed || "",
          initialWeight: item.initial_weight?.toString() || "",
        };
      });

      setEditHouseCounts(counts);
      setEditHouseDetails(details);
      setEditHouseCountsBatchId(batchId);
    } catch (error: any) {
      alert("ไม่สามารถโหลดจำนวนไก่เริ่มต้นได้: " + error.message);
    }
  };

  const handleSaveHouseCounts = async () => {
    if (!editHouseCountsBatchId) return;

    const parsedHouseCounts = Object.fromEntries(
      HOUSE_NUMBERS.map((house) => [
        house,
        Number.parseInt(editHouseCounts[house], 10) || 0,
      ]),
    ) as Record<number, number>;

    if (HOUSE_NUMBERS.some((house) => parsedHouseCounts[house] <= 0)) {
      alert("กรุณากรอกจำนวนไก่ลงเริ่มต้นให้ครบทั้ง 7 เล้า");
      return;
    }

    if (
      HOUSE_NUMBERS.some((house) => {
        const detail = editHouseDetails[house];
        return (
          !detail.arrivalDate ||
          !detail.chickenSex ||
          !detail.breed.trim() ||
          !(Number.parseFloat(detail.initialWeight) > 0)
        );
      })
    ) {
      alert(
        "กรุณากรอกวันที่ไก่เข้า เพศ พันธุ์ และน้ำหนักแรกเข้าให้ครบทั้ง 7 เล้า",
      );
      return;
    }

    if (
      HOUSE_NUMBERS.some((house) => {
        const detail = editHouseDetails[house];
        return (
          detail.captureDate !== "" && detail.captureDate < detail.arrivalDate
        );
      })
    ) {
      alert("วันที่จับไก่ต้องไม่อยู่ก่อนวันที่ไก่เข้า");
      return;
    }

    const totalInitialCount = HOUSE_NUMBERS.reduce(
      (sum, house) => sum + parsedHouseCounts[house],
      0,
    );

    setSavingHouseCounts(true);
    try {
      const now = new Date().toISOString();
      const { error: countsError } = await supabase
        .from("batch_house_counts")
        .upsert(
          HOUSE_NUMBERS.map((house) => ({
            batch_id: editHouseCountsBatchId,
            house_number: house,
            initial_count: parsedHouseCounts[house],
            arrival_date: editHouseDetails[house].arrivalDate,
            capture_date: editHouseDetails[house].captureDate || null,
            chicken_sex: editHouseDetails[house].chickenSex,
            breed: editHouseDetails[house].breed.trim(),
            initial_weight: Number.parseFloat(
              editHouseDetails[house].initialWeight,
            ),
            updated_at: now,
          })),
          { onConflict: "batch_id,house_number" },
        );

      if (countsError) throw countsError;

      const { error: batchError } = await supabase
        .from("batches")
        .update({ initial_count: totalInitialCount })
        .eq("id", editHouseCountsBatchId);

      if (batchError) throw batchError;

      if (selectedBatchId === editHouseCountsBatchId) {
        setHouseInitialCounts(parsedHouseCounts);
        setHousePerformanceData(
          Object.fromEntries(
            HOUSE_NUMBERS.map((house) => [
              house,
              {
                batch_id: editHouseCountsBatchId,
                house_number: house,
                initial_count: parsedHouseCounts[house],
                arrival_date: editHouseDetails[house].arrivalDate,
                capture_date: editHouseDetails[house].captureDate || null,
                chicken_sex: editHouseDetails[house].chickenSex || null,
                breed: editHouseDetails[house].breed.trim() || null,
                initial_weight:
                  Number.parseFloat(editHouseDetails[house].initialWeight) || null,
                weekly_weight_1:
                  housePerformanceData[house]?.weekly_weight_1 ?? null,
                weekly_weight_2:
                  housePerformanceData[house]?.weekly_weight_2 ?? null,
                weekly_weight_3:
                  housePerformanceData[house]?.weekly_weight_3 ?? null,
                weekly_weight_4:
                  housePerformanceData[house]?.weekly_weight_4 ?? null,
                weekly_weight_5:
                  housePerformanceData[house]?.weekly_weight_5 ?? null,
                weekly_weight_6:
                  housePerformanceData[house]?.weekly_weight_6 ?? null,
              } satisfies BatchHouseCount,
            ]),
          ),
        );
      }

      alert("บันทึกจำนวนไก่ลงเริ่มต้นเรียบร้อยแล้ว");
      setEditHouseCountsBatchId(null);
      setEditHouseCounts(createEmptyHouseCountInputs());
      setEditHouseDetails(createEmptyHouseDetailInputs());
      loadData();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSavingHouseCounts(false);
    }
  };

  const handleSaveWeeklyWeights = async () => {
    if (!viewingBatch) return;

    const parsedWeights = Object.fromEntries(
      HOUSE_NUMBERS.map((house) => [
        house,
        WEEKLY_WEIGHT_FIELDS.map((_, index) => {
          const value = weeklyWeightInputs[house]?.[index]?.trim() || "";
          return value === "" ? null : Number.parseFloat(value);
        }),
      ]),
    ) as Record<number, Array<number | null>>;

    const hasInvalidWeight = HOUSE_NUMBERS.some((house) =>
      parsedWeights[house].some(
        (weight) => weight != null && (!Number.isFinite(weight) || weight <= 0),
      ),
    );

    if (hasInvalidWeight) {
      alert("น้ำหนักรายสัปดาห์ต้องเป็นตัวเลขมากกว่า 0 หรือเว้นว่างไว้");
      return;
    }

    if (HOUSE_NUMBERS.some((house) => !housePerformanceData[house])) {
      alert("กรุณาบันทึกข้อมูลประจำเล้าให้ครบก่อนกรอกน้ำหนักรายสัปดาห์");
      return;
    }

    setSavingWeeklyWeights(true);
    try {
      const now = new Date().toISOString();
      const results = await Promise.all(
        HOUSE_NUMBERS.map((house) => {
          const weights = parsedWeights[house];
          return supabase
            .from("batch_house_counts")
            .update({
              weekly_weight_1: weights[0],
              weekly_weight_2: weights[1],
              weekly_weight_3: weights[2],
              weekly_weight_4: weights[3],
              weekly_weight_5: weights[4],
              weekly_weight_6: weights[5],
              updated_at: now,
            })
            .eq("batch_id", viewingBatch.id)
            .eq("house_number", house);
        }),
      );

      const failedResult = results.find((result) => result.error);
      if (failedResult?.error) throw failedResult.error;

      setHousePerformanceData((current) =>
        Object.fromEntries(
          HOUSE_NUMBERS.map((house) => {
            const weights = parsedWeights[house];
            const profile = current[house]!;
            return [
              house,
              {
                ...profile,
                weekly_weight_1: weights[0],
                weekly_weight_2: weights[1],
                weekly_weight_3: weights[2],
                weekly_weight_4: weights[3],
                weekly_weight_5: weights[4],
                weekly_weight_6: weights[5],
              } satisfies BatchHouseCount,
            ];
          }),
        ),
      );

      alert("บันทึกน้ำหนักจริงรายสัปดาห์เรียบร้อยแล้ว");
      setEditingWeeklyWeights(false);
    } catch (error: any) {
      alert("บันทึกน้ำหนักไม่สำเร็จ: " + error.message);
    } finally {
      setSavingWeeklyWeights(false);
    }
  };

  const handleCancelWeeklyWeightEdit = () => {
    setWeeklyWeightInputs(
      createWeeklyWeightInputs(Object.values(housePerformanceData)),
    );
    setEditingWeeklyWeights(false);
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
      // ถ้าลบรุ่นที่กำลังดูอยู่ ให้เคลียร์ selection เพื่อให้ loadData เลือกรุ่นใหม่ให้เอง
      if (selectedBatchId === batchId) {
        setSelectedBatchId(null);
      }
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
      link.download = `ตารางข้อมูลเดิม-${viewingBatch?.batch_name || "batch"}-${getTodayThailand()}.png`;
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

  const handleExportWeeklyPerformanceImage = async () => {
    const element = weeklyPerformanceExportRef.current;
    if (!element) return;

    setExportingWeeklyPerformance(true);

    const previousElementStyles = {
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      backgroundColor: element.style.backgroundColor,
    };
    const expandableElements = Array.from(
      element.querySelectorAll<HTMLElement>("[data-weekly-export-expand]"),
    );
    const previousExpandableStyles = expandableElements.map((item) => ({
      overflow: item.style.overflow,
      overflowX: item.style.overflowX,
    }));

    // ใช้ความกว้างคงที่สำหรับภาพ เพื่อให้ตารางและการ์ดไม่ถูกบีบหรือยืดผิดสัดส่วน
    element.style.width = "1440px";
    element.style.minWidth = "1440px";
    element.style.maxWidth = "none";
    element.style.backgroundColor = "#f9fafb";
    expandableElements.forEach((item) => {
      item.style.overflow = "visible";
      item.style.overflowX = "visible";
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const exportWidth = Math.ceil(element.scrollWidth);
      const exportHeight = Math.ceil(element.scrollHeight);
      const canvas = await html2canvas(element, {
        backgroundColor: "#f9fafb",
        scale: 2,
        useCORS: true,
        width: exportWidth,
        height: exportHeight,
        windowWidth: exportWidth,
        windowHeight: exportHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const safeBatchName = (viewingBatch?.batch_name || "batch").replace(
        /[\\/:*?"<>|]/g,
        "-",
      );
      const link = document.createElement("a");
      link.download = `Weekly-Performance-${safeBatchName}-${getTodayThailand()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Weekly Performance export failed:", error);
      alert(
        "ไม่สามารถ Export เป็นภาพได้ กรุณาติดตั้งแพ็กเกจ html2canvas ด้วยคำสั่ง: npm install html2canvas",
      );
    } finally {
      element.style.width = previousElementStyles.width;
      element.style.minWidth = previousElementStyles.minWidth;
      element.style.maxWidth = previousElementStyles.maxWidth;
      element.style.backgroundColor = previousElementStyles.backgroundColor;
      expandableElements.forEach((item, index) => {
        item.style.overflow = previousExpandableStyles[index].overflow;
        item.style.overflowX = previousExpandableStyles[index].overflowX;
      });
      setExportingWeeklyPerformance(false);
    }
  };

  // รุ่นที่กำลังแสดงผลอยู่ในแท็บตารางสรุป/กราฟสรุป (ค่าเริ่มต้นคือรุ่นที่ใช้งานอยู่ ถ้าไม่ได้เลือกรุ่นอื่น)
  const viewingBatch: AdminBatch | null =
    allBatches.find((b) => b.id === selectedBatchId) || activeBatch;

  const calculateDailySummary = () => {
    if (!viewingBatch) return [];

    const startDate = new Date(viewingBatch.start_date);
    const endReference = viewingBatch.end_date
      ? new Date(viewingBatch.end_date)
      : new Date(getTodayThailand());
    const today = new Date(getTodayThailand());
    // ถ้ารุ่นปิดไปแล้ว ให้แสดงถึงวันที่ปิดรุ่น ไม่ใช่วันปัจจุบัน
    const lastDate = viewingBatch.end_date && endReference < today ? endReference : today;
    const days = differenceInDays(lastDate, startDate) + 1;
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

  const prepareSelectedHouseData = (house: number) => {
    const todayDate = getTodayThailand();

    return calculateDailySummary()
      .filter((day) => day.date <= todayDate)
      .map((day) => {
        const record = records.find(
          (r) => r.house_number === house && r.record_date === day.date,
        );

        return {
          day: day.day,
          date: day.date,
          dateDisplay: day.dateDisplay,
          dead: day.houses[house].dead,
          culled: day.houses[house].culled,
          total: day.houses[house].total,
          tempOutside: record?.morning_temp_outside,
          tempInside: record?.morning_temp_inside,
          humidity: record?.morning_humidity,
          waterMeter: record?.morning_water_meter,
          hasRecord: Boolean(record),
        };
      });
  };

  const prepareWeeklyHousePerformance = () => {
    const todayDate = getTodayThailand();
    const cumulativeHouseTotals = calculateHouseTotals(calculateDailySummary());

    return HOUSE_NUMBERS.map((house) => {
      const profile = housePerformanceData[house];
      const arrivalDate = profile?.arrival_date;
      const initialCount = profile?.initial_count || 0;
      const cumulativeTotal = cumulativeHouseTotals[house]?.total || 0;
      const cumulativeLossPercentage = initialCount
        ? (cumulativeTotal / initialCount) * 100
        : null;
      const areaSquareMeters = HOUSE_AREAS[house];
      const weeklyWeights = WEEKLY_WEIGHT_FIELDS.map(
        (field) => profile?.[field] ?? null,
      );

      const weeks = WEEKLY_TARGET_LOSS.map((target, index) => {
        if (!arrivalDate || !initialCount) {
          return {
            week: index + 1,
            target,
            startDate: null,
            endDate: null,
            dead: 0,
            culled: 0,
            total: 0,
            percentage: null,
          };
        }

        const arrival = new Date(`${arrivalDate}T00:00:00`);
        // Weekly Report ของฟาร์มนับวันที่ไก่เข้าเป็น DOC 0:
        // Wk1 = DOC 0-7, Wk2 = DOC 8-14, ... , Wk6 = DOC 36-42
        const startOffset = index === 0 ? 0 : index * 7 + 1;
        const endOffset = (index + 1) * 7;
        const weekStart = addDays(arrival, startOffset);
        const weekEnd = addDays(arrival, endOffset);
        const startDate = format(weekStart, "yyyy-MM-dd");
        const endDate = format(weekEnd, "yyyy-MM-dd");
        const weekRecords = records.filter(
          (record) =>
            record.house_number === house &&
            record.record_date >= startDate &&
            record.record_date <= endDate,
        );
        const dead = weekRecords.reduce(
          (sum, record) =>
            sum + (record.morning_dead || 0) + (record.afternoon_dead || 0),
          0,
        );
        const culled = weekRecords.reduce(
          (sum, record) =>
            sum +
            (record.morning_culled || 0) +
            (record.afternoon_culled || 0),
          0,
        );
        const total = dead + culled;

        return {
          week: index + 1,
          target,
          startDate,
          endDate,
          dead,
          culled,
          total,
          percentage:
            startDate <= todayDate ? (total / initialCount) * 100 : null,
        };
      });

      return {
        house,
        profile,
        weeks,
        weeklyWeights,
        areaSquareMeters,
        density: initialCount ? initialCount / areaSquareMeters : null,
        cumulativeTotal,
        cumulativeLossPercentage,
        liveability:
          cumulativeLossPercentage == null
            ? null
            : Math.max(0, 100 - cumulativeLossPercentage),
        remainingChickens: Math.max(0, initialCount - cumulativeTotal),
        captureAge:
          profile?.arrival_date && profile?.capture_date
            ? differenceInDays(
                new Date(`${profile.capture_date}T00:00:00`),
                new Date(`${profile.arrival_date}T00:00:00`),
              )
            : null,
      };
    });
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
        {activeTab === "summary" && viewingBatch && (
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
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold">วันที่</th>
                          <th className="px-4 py-3 text-center font-bold">วันที่ของรุ่น</th>
                          <th className="px-4 py-3 text-center font-bold text-red-700">ตาย</th>
                          <th className="px-4 py-3 text-center font-bold text-orange-700">คัด</th>
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

        {activeTab === "chart" && viewingBatch && (
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
              <div className="flex items-center gap-3">
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

        {activeTab === "weekly" && viewingBatch && (
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
                  <button
                    type="button"
                    onClick={handleExportWeeklyPerformanceImage}
                    disabled={exportingWeeklyPerformance}
                    data-html2canvas-ignore="true"
                    className="rounded-xl bg-white px-4 py-3 font-bold text-purple-700 shadow-sm transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportingWeeklyPerformance
                      ? "กำลัง Export..."
                      : "Export ทั้งหน้าเป็น PNG"}
                  </button>
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
                    สีเขียว = ได้โบนัสตั้งแต่ 4.50 เท่า · ค่า X = น้ำหนักจริง ÷ น้ำหนักแรกเข้า
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
                          const bonusAmount =
                            roundedGrowthMultiple == null
                              ? 0
                              : roundedGrowthMultiple >= 5
                                ? 2200
                                : roundedGrowthMultiple >= 4.8
                                  ? 1600
                                  : roundedGrowthMultiple >= 4.5
                                    ? 1000
                                    : 0;

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
                                    : bonusAmount > 0
                                      ? "text-green-700"
                                      : "text-red-600"
                                }`}
                              >
                                {roundedGrowthMultiple == null
                                  ? "-"
                                  : `${difference == null ? "" : `${difference >= 0 ? "+" : ""}${difference.toFixed(2)} กรัม · `}${roundedGrowthMultiple.toFixed(2)} เท่า · ${bonusAmount > 0 ? `โบนัส ${bonusAmount.toLocaleString()} บาท` : "ไม่ได้โบนัส"}`}
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
        )}

        {(activeTab === "summary" ||
          activeTab === "chart" ||
          activeTab === "weekly") &&
          !viewingBatch && (
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
              ยังไม่มีรุ่นใดในระบบ
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
