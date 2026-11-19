"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshCurrentUser, signOut } from "../lib/supabase";
import { adminDb } from "./adminDb";
import { getTodayThailand } from "../lib/dateUtils";
import type { User, DailyRecord } from "../types";
import { format, differenceInDays, addDays } from "date-fns";
import { ActivityLog, AdminBatch, BatchHouseCount, WeightMeasurementSession, WeightCalculatorInput, HouseChartMetric, HouseDetailInput, HOUSE_NUMBERS, WEEKLY_WEIGHT_FIELDS, BATCH_HOUSE_SELECT, WEIGHT_SESSION_SELECT, WEIGHING_POSITIONS, createEmptyHouseCountInputs, createEmptyHouseDetailInputs, createEmptyWeeklyWeightInputs, createWeeklyWeightInputs, createEmptyWeightCalculatorInput, createWeightCalculatorInput, FarmSettings, DEFAULT_FARM_SETTINGS, normalizeFarmSettings, buildFarmConstants, calculateBonus } from "./shared";

// state, การโหลดข้อมูล และฟังก์ชันจัดการทั้งหมดของหน้าแอดมิน
export function useAdminState() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeBatch, setActiveBatch] = useState<AdminBatch | null>(null);
  const [allBatches, setAllBatches] = useState<AdminBatch[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "summary" | "chart" | "weekly" | "weight" | "logs" | "users" | "batches" | "settings"
  >("summary");
  const [farmSettings, setFarmSettings] = useState<FarmSettings>(DEFAULT_FARM_SETTINGS);
  const [savingFarmSettings, setSavingFarmSettings] = useState(false);
  // ค่าที่ใช้คำนวณ มาจากหน้าตั้งค่า (ชื่อเดิมของค่าคงที่ เพื่อให้สูตรเดิมใช้ได้เหมือนเดิม)
  const { WEEKLY_TARGET_LOSS, HOUSE_AREAS, WEIGHT_STANDARDS, BONUS_TIERS } =
    buildFarmConstants(farmSettings);
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
  const [weightSessions, setWeightSessions] = useState<
    Record<string, WeightMeasurementSession>
  >({});
  const [weightCalculatorHouse, setWeightCalculatorHouse] = useState(1);
  const [weightCalculatorWeek, setWeightCalculatorWeek] = useState(1);
  const [weightCalculatorInput, setWeightCalculatorInput] =
    useState<WeightCalculatorInput>(createEmptyWeightCalculatorInput);
  const [savingWeightCalculator, setSavingWeightCalculator] = useState(false);
  const [scheduleCloseBatchId, setScheduleCloseBatchId] = useState<string | null>(null);
  const [scheduledEndDate, setScheduledEndDate] = useState("");
  const [legacyTableZoom, setLegacyTableZoom] = useState(1);
  const legacyTableExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingLegacyTable, setExportingLegacyTable] = useState(false);
  const [exportingLegacyExcel, setExportingLegacyExcel] = useState(false);
  const weeklyPerformanceExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingWeeklyPerformance, setExportingWeeklyPerformance] =
    useState(false);
  const growthTableExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingGrowthTable, setExportingGrowthTable] = useState(false);
  const chartSummaryExportRef = useRef<HTMLDivElement | null>(null);
  const [exportingChartImage, setExportingChartImage] = useState(false);

  // รุ่นที่กำลังดูอยู่ในแท็บ "ตารางสรุป" / "กราฟสรุป" (อาจเป็นรุ่นที่ปิดไปแล้วก็ได้)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null);
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
    let cancelled = false;
    (async () => {
      const currentUser = await refreshCurrentUser();
      if (cancelled) return;
      if (!currentUser || currentUser.role !== "admin") {
        router.push("/");
        return;
      }
      setUser(currentUser);
      loadData();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const sessionKey = `${weightCalculatorHouse}-${weightCalculatorWeek}`;
    setWeightCalculatorInput(
      createWeightCalculatorInput(
        weightSessions[sessionKey],
      ),
    );
  }, [weightCalculatorHouse, weightCalculatorWeek, weightSessions]);

  const loadUsers = async () => {
    // เลือกเฉพาะคอลัมน์ที่เปิดให้อ่านได้ (password_hash ถูกปิดไว้ในฐานข้อมูล)
    const { data: usersData } = await adminDb
      .from("users")
      .select("id, username, full_name, role, house_number, is_active, created_at, updated_at")
      .order("role", { ascending: false })
      .order("house_number", { ascending: true });
    setUsers((usersData as User[]) || []);
  };

  const loadData = async () => {
    try {
      // ผู้ใช้ + ประวัติ ไม่ขึ้นกับรุ่น → เริ่มโหลดพร้อมกันไปเลย
      const usersAndLogs = Promise.all([
        loadUsers(),
        adminDb
          .from("activity_logs")
          .select("*, users(full_name, house_number)")
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data: logsData }) => setActivityLogs(logsData || [])),
      ]);

      const [{ data: settingsRows }, { error: scheduledCloseError }] =
        await Promise.all([
          adminDb.from("farm_settings").select("data").eq("id", 1),
          adminDb.rpc("close_scheduled_batches"),
        ]);
      setFarmSettings(normalizeFarmSettings(settingsRows?.[0]?.data));

      if (scheduledCloseError) {
        console.warn("Scheduled batch close check failed:", scheduledCloseError);
      }

      const { data: batchesData } = await adminDb
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
          const [recordsResult, houseCountsResult, weightSessionsResult] =
            await Promise.all([
            adminDb
              .from("daily_records")
              .select("*")
              .eq("batch_id", targetBatchId)
              .order("record_date", { ascending: true }),
            adminDb
              .from("batch_house_counts")
              .select(BATCH_HOUSE_SELECT)
              .eq("batch_id", targetBatchId)
              .order("house_number", { ascending: true }),
            adminDb
              .from("batch_house_weight_sessions")
              .select(WEIGHT_SESSION_SELECT)
              .eq("batch_id", targetBatchId)
              .order("house_number", { ascending: true })
              .order("week_number", { ascending: true }),
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
          const weightSessionRows = (weightSessionsResult.data ||
            []) as WeightMeasurementSession[];
          setWeightSessions(
            Object.fromEntries(
              weightSessionRows.map((session) => [
                `${session.house_number}-${session.week_number}`,
                session,
              ]),
            ),
          );
        } else {
          setRecords([]);
          setHouseInitialCounts({});
          setHousePerformanceData({});
          setWeeklyWeightInputs(createEmptyWeeklyWeightInputs());
          setWeightSessions({});
        }
      }

      await usersAndLogs;
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
      const [recordsResult, houseCountsResult, weightSessionsResult] =
        await Promise.all([
        adminDb
          .from("daily_records")
          .select("*")
          .eq("batch_id", batchId)
          .order("record_date", { ascending: true }),
        adminDb
          .from("batch_house_counts")
          .select(BATCH_HOUSE_SELECT)
          .eq("batch_id", batchId)
          .order("house_number", { ascending: true }),
        adminDb
          .from("batch_house_weight_sessions")
          .select(WEIGHT_SESSION_SELECT)
          .eq("batch_id", batchId)
          .order("house_number", { ascending: true })
          .order("week_number", { ascending: true }),
        ]);

      if (recordsResult.error) throw recordsResult.error;
      if (houseCountsResult.error) throw houseCountsResult.error;
      if (weightSessionsResult.error) throw weightSessionsResult.error;

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
      const weightSessionRows = (weightSessionsResult.data ||
        []) as WeightMeasurementSession[];
      setWeightSessions(
        Object.fromEntries(
          weightSessionRows.map((session) => [
            `${session.house_number}-${session.week_number}`,
            session,
          ]),
        ),
      );
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

  const handleSaveFarmSettings = async (next: FarmSettings) => {
    setSavingFarmSettings(true);
    try {
      const cleaned = normalizeFarmSettings(next);
      const { error } = await adminDb
        .from("farm_settings")
        .upsert(
          { id: 1, data: cleaned, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
      if (error) throw new Error(error.message);
      setFarmSettings(cleaned);
      alert("บันทึกการตั้งค่าแล้ว");
      return true;
    } catch (error: any) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
      return false;
    } finally {
      setSavingFarmSettings(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
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
        const { error: closeActiveError } = await adminDb
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
      const { data: insertedBatch, error } = await adminDb
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

      const { error: houseCountsError } = await adminDb
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
      const { data, error } = await adminDb
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
      const { error: countsError } = await adminDb
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

      const { error: batchError } = await adminDb
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
          return adminDb
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

  const calculateWeightCalculatorSummary = () => {
    const birdsPerWeighing = Number.parseInt(
      weightCalculatorInput.birdsPerWeighing,
      10,
    );
    const totalBirdsOverride = Number.parseInt(
      weightCalculatorInput.totalBirdsOverride,
      10,
    );
    const hasTotalBirdsOverride =
      weightCalculatorInput.totalBirdsOverride.trim() !== "";
    const basketWeightKg = Number.parseFloat(
      weightCalculatorInput.basketWeightKg,
    );
    const deductionPerBirdG = Number.parseFloat(
      weightCalculatorInput.deductionPerBirdG,
    );
    const measurements = WEIGHING_POSITIONS.map((position) =>
      weightCalculatorInput.measurements[position.key].map((value) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      }) as [number | null, number | null],
    );
    const completedReadings = measurements.flat().filter(
      (value): value is number => value != null,
    );
    const grossWeightKg = completedReadings.reduce(
      (sum, value) => sum + value,
      0,
    );
    const automaticTotalBirds =
      birdsPerWeighing > 0 ? completedReadings.length * birdsPerWeighing : 0;
    const totalBirds =
      hasTotalBirdsOverride &&
      Number.isFinite(totalBirdsOverride) &&
      totalBirdsOverride > 0
        ? totalBirdsOverride
        : automaticTotalBirds;
    const weighingCountForBasket =
      hasTotalBirdsOverride && birdsPerWeighing > 0
        ? Math.ceil(totalBirds / birdsPerWeighing)
        : completedReadings.length;
    const basketTotalKg =
      Number.isFinite(basketWeightKg) && basketWeightKg >= 0
        ? weighingCountForBasket * basketWeightKg
        : 0;
    const netWeightKg = Math.max(0, grossWeightKg - basketTotalKg);
    const rawAverageG = totalBirds
      ? (netWeightKg * 1000) / totalBirds
      : null;
    const adjustedAverageG =
      rawAverageG == null || !Number.isFinite(deductionPerBirdG)
        ? null
        : Math.max(0, rawAverageG - Math.max(0, deductionPerBirdG));
    const profile = housePerformanceData[weightCalculatorHouse];
    const initialWeight = profile?.initial_weight;
    const growthMultiple =
      adjustedAverageG != null && initialWeight != null && initialWeight > 0
        ? adjustedAverageG / initialWeight
        : null;
    const roundedGrowthMultiple =
      growthMultiple == null
        ? null
        : Math.round((growthMultiple + Number.EPSILON) * 100) / 100;
    const bonusAmount =
      weightCalculatorWeek !== 1
        ? 0
        : calculateBonus(roundedGrowthMultiple, BONUS_TIERS);
    const standardWeight = profile?.chicken_sex
      ? WEIGHT_STANDARDS[profile.chicken_sex].weights[weightCalculatorWeek - 1]
      : null;
    const previousActualWeight =
      weightCalculatorWeek === 1
        ? initialWeight
        : profile?.[WEEKLY_WEIGHT_FIELDS[weightCalculatorWeek - 2]];
    const weightGainG =
      adjustedAverageG != null && previousActualWeight != null
        ? adjustedAverageG - Number(previousActualWeight)
        : null;
    const actualAdg =
      weightGainG != null
        ? weightGainG / 7
        : null;
    const previousStandardWeight =
      weightCalculatorWeek === 1
        ? initialWeight
        : profile?.chicken_sex
          ? WEIGHT_STANDARDS[profile.chicken_sex].weights[
              weightCalculatorWeek - 2
            ]
          : null;
    const standardAdg =
      standardWeight != null && previousStandardWeight != null
        ? (standardWeight - previousStandardWeight) / 7
        : null;
    const arrivalDate = profile?.arrival_date;
    const weekEndDate = arrivalDate
      ? format(
          addDays(
            new Date(`${arrivalDate}T00:00:00`),
            weightCalculatorWeek * 7,
          ),
          "yyyy-MM-dd",
        )
      : null;
    const cumulativeLoss = records
      .filter(
        (record) =>
          record.house_number === weightCalculatorHouse &&
          (!arrivalDate || record.record_date >= arrivalDate) &&
          (!weekEndDate || record.record_date <= weekEndDate),
      )
      .reduce(
        (sum, record) =>
          sum +
          (record.morning_dead || 0) +
          (record.afternoon_dead || 0) +
          (record.morning_culled || 0) +
          (record.afternoon_culled || 0),
        0,
      );
    const remainingChickens = Math.max(
      0,
      (profile?.initial_count || 0) - cumulativeLoss,
    );

    return {
      birdsPerWeighing,
      totalBirdsOverride,
      hasTotalBirdsOverride,
      automaticTotalBirds,
      basketWeightKg,
      deductionPerBirdG,
      measurements,
      completedReadings: completedReadings.length,
      grossWeightKg,
      basketTotalKg,
      netWeightKg,
      totalBirds,
      rawAverageG,
      adjustedAverageG,
      growthMultiple,
      roundedGrowthMultiple,
      bonusAmount,
      standardWeight,
      weightGainG,
      actualAdg,
      standardAdg,
      cumulativeLoss,
      remainingChickens,
      differenceFromStandard:
        adjustedAverageG != null && standardWeight != null
          ? adjustedAverageG - standardWeight
          : null,
    };
  };

  const handleSaveWeightCalculator = async () => {
    if (!viewingBatch) return;

    const summary = calculateWeightCalculatorSummary();
    const profile = housePerformanceData[weightCalculatorHouse];

    if (!profile) {
      alert("กรุณาบันทึกข้อมูลประจำเล้าก่อนคำนวณน้ำหนัก");
      return;
    }
    if (summary.completedReadings < 1) {
      alert("กรุณากรอกน้ำหนักอย่างน้อย 1 ค่า");
      return;
    }
    if (!(summary.birdsPerWeighing > 0)) {
      alert("จำนวนไก่ต่อครั้งต้องมากกว่า 0");
      return;
    }
    if (
      summary.hasTotalBirdsOverride &&
      (!Number.isFinite(summary.totalBirdsOverride) ||
        summary.totalBirdsOverride <= 0)
    ) {
      alert("จำนวนไก่ที่ชั่งรวมต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }
    if (
      !Number.isFinite(summary.basketWeightKg) ||
      summary.basketWeightKg < 0 ||
      !Number.isFinite(summary.deductionPerBirdG) ||
      summary.deductionPerBirdG < 0 ||
      summary.rawAverageG == null ||
      summary.rawAverageG <= 0 ||
      summary.adjustedAverageG == null ||
      summary.adjustedAverageG <= 0
    ) {
      alert("กรุณาตรวจสอบน้ำหนักรวม น้ำหนักตะกร้า และน้ำหนักหักกระเพาะ");
      return;
    }

    setSavingWeightCalculator(true);
    try {
      const now = new Date().toISOString();
      const adjustedAverageG = Number(summary.adjustedAverageG.toFixed(2));
      const session: WeightMeasurementSession = {
        batch_id: viewingBatch.id,
        house_number: weightCalculatorHouse,
        week_number: weightCalculatorWeek,
        sample_date: weightCalculatorInput.sampleDate || null,
        birds_per_weighing: summary.birdsPerWeighing,
        basket_weight_kg: summary.basketWeightKg,
        deduction_per_bird_g: summary.deductionPerBirdG,
        measurements: summary.measurements,
        total_weight_kg: Number(summary.grossWeightKg.toFixed(3)),
        total_birds: summary.totalBirds,
        raw_average_g: Number(summary.rawAverageG!.toFixed(2)),
        adjusted_average_g: adjustedAverageG,
      };

      const { error: sessionError } = await adminDb
        .from("batch_house_weight_sessions")
        .upsert(
          { ...session, updated_at: now },
          { onConflict: "batch_id,house_number,week_number" },
        );
      if (sessionError) throw sessionError;

      const weightField = WEEKLY_WEIGHT_FIELDS[weightCalculatorWeek - 1];
      const { error: weightError } = await adminDb
        .from("batch_house_counts")
        .update({ [weightField]: adjustedAverageG, updated_at: now })
        .eq("batch_id", viewingBatch.id)
        .eq("house_number", weightCalculatorHouse);
      if (weightError) throw weightError;

      const sessionKey = `${weightCalculatorHouse}-${weightCalculatorWeek}`;
      setWeightSessions((current) => ({ ...current, [sessionKey]: session }));
      setHousePerformanceData((current) => ({
        ...current,
        [weightCalculatorHouse]: {
          ...current[weightCalculatorHouse],
          [weightField]: adjustedAverageG,
        } as BatchHouseCount,
      }));
      setWeeklyWeightInputs((current) => ({
        ...current,
        [weightCalculatorHouse]: current[weightCalculatorHouse].map(
          (value, index) =>
            index === weightCalculatorWeek - 1
              ? adjustedAverageG.toFixed(2)
              : value,
        ),
      }));

      alert(
        `บันทึกน้ำหนักเล้า ${weightCalculatorHouse} Wk${weightCalculatorWeek} = ${adjustedAverageG.toFixed(2)} กรัมแล้ว`,
      );
    } catch (error: any) {
      alert("บันทึกผลชั่งไม่สำเร็จ: " + error.message);
    } finally {
      setSavingWeightCalculator(false);
    }
  };

  const handleCloseBatch = async (batchId: string) => {
    if (!confirm("ต้องการปิดรุ่นนี้ทันทีหรือไม่?")) return;

    try {
      const { error } = await adminDb
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
      const { error } = await adminDb
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
      const { error } = await adminDb
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
      const { error } = await adminDb
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

  const handleExportLegacyTableExcel = async () => {
    if (!viewingBatch || exportingLegacyExcel) return;
    setExportingLegacyExcel(true);

    try {
      const XLSX = await import("xlsx");
      const summary = calculateDailySummary();
      const recordMap = new Map(
        records.map((record) => [`${record.record_date}-${record.house_number}`, record]),
      );
      const workbook = XLSX.utils.book_new();
      const columns = [
        "อายุ (วัน)", "วันที่",
        "เช้า: ตาย", "เช้า: คัดทิ้ง", "",
        "บ่าย: ตาย", "บ่าย: คัดทิ้ง", "",
        "อุณหภูมิภายนอก (°C)", "อุณหภูมิภายใน (°C)",
        "ความชื้น (%)", "มิเตอร์น้ำ", "น้ำใช้ (ผลต่างมิเตอร์)",
      ];

      for (const house of HOUSE_NUMBERS) {
        const rows: (string | number | null)[][] = [
          [`ฟาร์ม: ${viewingBatch.batch_name}`, "", "", "", "", `เล้า ${house}`],
          ["อายุ", "วันที่", "เช้า", "", "", "บ่าย", "", "", "อุณหภูมิ", "", "ความชื้น", "น้ำ", ""],
          columns,
        ];
        let previousMeter: number | null = null;

        for (const day of summary) {
          const record = recordMap.get(`${day.date}-${house}`);
          const morning = Boolean(record?.morning_recorded_at);
          const afternoon = Boolean(record?.afternoon_recorded_at);
          const md = morning ? (record?.morning_dead ?? 0) : null;
          const mc = morning ? (record?.morning_culled ?? 0) : null;
          const ad = afternoon ? (record?.afternoon_dead ?? 0) : null;
          const ac = afternoon ? (record?.afternoon_culled ?? 0) : null;
          const meter = record?.morning_water_meter ?? null;
          // มิเตอร์เป็นค่าที่อ่านสะสม จึงแสดงน้ำใช้เฉพาะเมื่อมีค่าก่อนหน้าที่บันทึกไว้
          // และผลต่างไม่ติดลบ (กรณีมิเตอร์ถูกรีเซ็ตจะเว้นว่าง)
          const waterUsed = meter != null && previousMeter != null && meter >= previousMeter
            ? meter - previousMeter : null;
          if (meter != null) previousMeter = meter;
          const [year, month, date] = day.date.split("-").map(Number);
          rows.push([
            day.day, `${date}/${month}/${year + 543}`,
            md, mc, 0,
            ad, ac, 0,
            record?.morning_temp_outside ?? null,
            record?.morning_temp_inside ?? null,
            record?.morning_humidity ?? null,
            meter, waterUsed,
          ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
          { s: { r: 0, c: 5 }, e: { r: 0, c: 12 } },
          ...[[2, 4], [5, 7], [8, 9], [11, 12]].map(
            ([start, end]) => ({ s: { r: 1, c: start }, e: { r: 1, c: end } }),
          ),
        ];
        worksheet["!cols"] = columns.map((_, index) => ({
          wch: index === 0 ? 15 : index === 1 ? 17 : index >= 8 ? 23 : 18,
        }));
        worksheet["!rows"] = [{ hpt: 26 }, { hpt: 23 }, { hpt: 30 }];
        worksheet["!freeze"] = { xSplit: 2, ySplit: 3 };
        XLSX.utils.book_append_sheet(workbook, worksheet, `เล้า ${house}`);
      }

      const safeName = viewingBatch.batch_name.replace(/[\\/:*?"<>|]/g, "-");
      XLSX.writeFile(workbook, `ข้อมูลรายเล้า-${safeName}-${getTodayThailand()}.xlsx`);
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("ไม่สามารถ Export Excel ได้ กรุณาตรวจสอบรายละเอียดใน Console");
    } finally {
      setExportingLegacyExcel(false);
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

  const handleExportGrowthTableImage = async () => {
    const element = growthTableExportRef.current;
    if (!element) return;

    setExportingGrowthTable(true);

    const scrollContainer = element.querySelector<HTMLElement>(
      "[data-growth-export-scroll]",
    );
    const previousElementStyles = {
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      overflow: element.style.overflow,
      backgroundColor: element.style.backgroundColor,
    };
    const previousScrollStyles = scrollContainer
      ? {
          overflow: scrollContainer.style.overflow,
          overflowX: scrollContainer.style.overflowX,
        }
      : null;

    // ตารางมี 6 สัปดาห์และ 38 คอลัมน์ จึงขยายเป็นความกว้างจริงก่อนจับภาพ
    // เพื่อไม่ให้ html2canvas บีบสัดส่วนหรือตัดคอลัมน์ที่อยู่นอกหน้าจอ
    element.style.width = "3300px";
    element.style.minWidth = "3300px";
    element.style.maxWidth = "none";
    element.style.overflow = "visible";
    element.style.backgroundColor = "#ffffff";
    if (scrollContainer) {
      scrollContainer.style.overflow = "visible";
      scrollContainer.style.overflowX = "visible";
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const exportWidth = Math.ceil(element.scrollWidth);
      const exportHeight = Math.ceil(element.scrollHeight);
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
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
      link.download = `Growth-Performance-${safeBatchName}-${getTodayThailand()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Growth table export failed:", error);
      alert(
        "ไม่สามารถ Export ตารางเป็นภาพได้ กรุณาติดตั้งแพ็กเกจ html2canvas ด้วยคำสั่ง: npm install html2canvas",
      );
    } finally {
      element.style.width = previousElementStyles.width;
      element.style.minWidth = previousElementStyles.minWidth;
      element.style.maxWidth = previousElementStyles.maxWidth;
      element.style.overflow = previousElementStyles.overflow;
      element.style.backgroundColor = previousElementStyles.backgroundColor;
      if (scrollContainer && previousScrollStyles) {
        scrollContainer.style.overflow = previousScrollStyles.overflow;
        scrollContainer.style.overflowX = previousScrollStyles.overflowX;
      }
      setExportingGrowthTable(false);
    }
  };

  const handleExportChartImage = async () => {
    const element = chartSummaryExportRef.current;
    if (!element || !viewingBatch) return;

    setExportingChartImage(true);

    const previousStyles = {
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      backgroundColor: element.style.backgroundColor,
    };

    // ขยายกราฟให้กว้างกว่าหน้ากระดาษ A4 มาก เพื่อให้เส้นและวันที่อ่านได้ละเอียด
    element.style.width = "3000px";
    element.style.minWidth = "3000px";
    element.style.maxWidth = "none";
    element.style.backgroundColor = "#f9fafb";

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

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

      const safeBatchName = viewingBatch.batch_name.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );
      const link = document.createElement("a");
      link.download = `กราฟสรุป-${safeBatchName}-${getTodayThailand()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Chart image export failed:", error);
      alert(
        "ไม่สามารถ Export กราฟเป็นภาพได้ กรุณาติดตั้งแพ็กเกจ html2canvas ก่อน",
      );
    } finally {
      element.style.width = previousStyles.width;
      element.style.minWidth = previousStyles.minWidth;
      element.style.maxWidth = previousStyles.maxWidth;
      element.style.backgroundColor = previousStyles.backgroundColor;
      setExportingChartImage(false);
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
          morningDead: record?.morning_dead ?? 0,
          afternoonDead: record?.afternoon_dead ?? 0,
          morningCulled: record?.morning_culled ?? 0,
          afternoonCulled: record?.afternoon_culled ?? 0,
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

  return {
    farmSettings,
    savingFarmSettings,
    handleSaveFarmSettings,
    WEEKLY_TARGET_LOSS,
    HOUSE_AREAS,
    WEIGHT_STANDARDS,
    BONUS_TIERS,
    router,
    user,
    setUser,
    activeBatch,
    setActiveBatch,
    allBatches,
    setAllBatches,
    records,
    setRecords,
    activityLogs,
    setActivityLogs,
    loading,
    setLoading,
    activeTab,
    setActiveTab,
    users,
    setUsers,
    showBatchForm,
    setShowBatchForm,
    newBatchName,
    setNewBatchName,
    newBatchStartDate,
    setNewBatchStartDate,
    newBatchHouseCounts,
    setNewBatchHouseCounts,
    newBatchHouseDetails,
    setNewBatchHouseDetails,
    houseInitialCounts,
    setHouseInitialCounts,
    housePerformanceData,
    setHousePerformanceData,
    editHouseCountsBatchId,
    setEditHouseCountsBatchId,
    editHouseCounts,
    setEditHouseCounts,
    editHouseDetails,
    setEditHouseDetails,
    savingHouseCounts,
    setSavingHouseCounts,
    weeklyWeightInputs,
    setWeeklyWeightInputs,
    editingWeeklyWeights,
    setEditingWeeklyWeights,
    savingWeeklyWeights,
    setSavingWeeklyWeights,
    weightSessions,
    setWeightSessions,
    weightCalculatorHouse,
    setWeightCalculatorHouse,
    weightCalculatorWeek,
    setWeightCalculatorWeek,
    weightCalculatorInput,
    setWeightCalculatorInput,
    savingWeightCalculator,
    setSavingWeightCalculator,
    scheduleCloseBatchId,
    setScheduleCloseBatchId,
    scheduledEndDate,
    setScheduledEndDate,
    legacyTableZoom,
    setLegacyTableZoom,
    legacyTableExportRef,
    exportingLegacyTable,
    setExportingLegacyTable,
    exportingLegacyExcel,
    setExportingLegacyExcel,
    weeklyPerformanceExportRef,
    exportingWeeklyPerformance,
    setExportingWeeklyPerformance,
    growthTableExportRef,
    exportingGrowthTable,
    setExportingGrowthTable,
    chartSummaryExportRef,
    exportingChartImage,
    setExportingChartImage,
    selectedBatchId,
    setSelectedBatchId,
    selectedHouse,
    setSelectedHouse,
    selectedDailyDate,
    setSelectedDailyDate,
    visibleHouseMetrics,
    setVisibleHouseMetrics,
    recordsLoading,
    setRecordsLoading,
    legacyHouseColors,
    loadUsers,
    loadData,
    handleSelectViewBatch,
    handleViewBatchSummary,
    handleViewHouseSummary,
    handleToggleHouseMetric,
    handleLogout,
    handleCreateBatch,
    handleOpenHouseCountsEditor,
    handleSaveHouseCounts,
    handleSaveWeeklyWeights,
    handleCancelWeeklyWeightEdit,
    calculateWeightCalculatorSummary,
    handleSaveWeightCalculator,
    handleCloseBatch,
    handleScheduleCloseBatch,
    handleCancelScheduledCloseBatch,
    handleDeleteBatch,
    handleExportLegacyTableImage,
    handleExportLegacyTableExcel,
    handleExportWeeklyPerformanceImage,
    handleExportGrowthTableImage,
    handleExportChartImage,
    viewingBatch,
    calculateDailySummary,
    calculateHouseTotals,
    prepareChartData,
    prepareHouseChartData,
    prepareSelectedHouseData,
    prepareWeeklyHousePerformance,
  };
}

export type AdminState = ReturnType<typeof useAdminState>;
