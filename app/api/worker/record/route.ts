import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { getSession } from "../../../lib/server/auth";

// พนักงานอ่าน/บันทึกข้อมูลรายวัน — บันทึกได้เฉพาะเล้าของตัวเองเท่านั้น
// (เซิร์ฟเวอร์เป็นคนกำหนดเล้า รุ่น และชื่อผู้บันทึก ไม่เชื่อค่าจากเบราว์เซอร์)

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const loadContext = async (request: NextRequest) => {
  const session = await getSession(request);
  if (!session) return { error: fail("กรุณาเข้าสู่ระบบใหม่", 401) };

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id, role, house_number, is_active")
    .eq("id", session.uid)
    .maybeSingle();
  if (!user || !user.is_active || user.role !== "worker" || !user.house_number) {
    return { error: fail("กรุณาเข้าสู่ระบบใหม่", 401) };
  }

  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  return { supabase, user, batch };
};

const toNumber = (value: unknown, parse: (v: string) => number) => {
  const n = parse(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
};

// GET /api/worker/record?date=YYYY-MM-DD → { batch, record }
export async function GET(request: NextRequest) {
  try {
    const ctx = await loadContext(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user, batch } = ctx;

    const date = request.nextUrl.searchParams.get("date");
    if (!batch || !date) return NextResponse.json({ batch: batch ?? null, record: null });
    if (!DATE.test(date)) return fail("วันที่ไม่ถูกต้อง");

    const { data: record } = await supabase
      .from("daily_records")
      .select("*")
      .eq("batch_id", batch.id)
      .eq("house_number", user.house_number)
      .eq("record_date", date)
      .maybeSingle();

    return NextResponse.json({ batch, record: record ?? null });
  } catch (error) {
    console.error("Worker record load error:", error);
    return fail("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}

// POST { date, period: "morning" | "afternoon", values: {...}, description } → { record }
export async function POST(request: NextRequest) {
  try {
    const ctx = await loadContext(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user, batch } = ctx;
    if (!batch) return fail("ยังไม่มีรุ่นที่เปิดใช้งาน");

    const body = await request.json().catch(() => ({}));
    const date = String(body.date ?? "");
    const period = body.period === "afternoon" ? "afternoon" : "morning";
    const values = body.values ?? {};
    if (!DATE.test(date)) return fail("วันที่ไม่ถูกต้อง");

    const now = new Date().toISOString();
    const recordData: Record<string, unknown> = {
      batch_id: batch.id,
      house_number: user.house_number,
      record_date: date,
    };

    if (period === "morning") {
      recordData.morning_dead = toNumber(values.dead, (v) => parseInt(v, 10)) ?? 0;
      recordData.morning_culled = toNumber(values.culled, (v) => parseInt(v, 10)) ?? 0;
      recordData.morning_temp_outside = toNumber(values.tempOutside, parseFloat) || null;
      recordData.morning_temp_inside = toNumber(values.tempInside, parseFloat) || null;
      recordData.morning_humidity = toNumber(values.humidity, parseFloat) || null;
      recordData.morning_water_meter = toNumber(values.waterMeter, parseFloat) || null;
      recordData.morning_recorded_by = user.id;
      recordData.morning_recorded_at = now;
    } else {
      recordData.afternoon_dead = toNumber(values.dead, (v) => parseInt(v, 10)) ?? 0;
      recordData.afternoon_culled = toNumber(values.culled, (v) => parseInt(v, 10)) ?? 0;
      recordData.afternoon_recorded_by = user.id;
      recordData.afternoon_recorded_at = now;
    }

    for (const key of ["morning_dead", "morning_culled", "afternoon_dead", "afternoon_culled"]) {
      const n = recordData[key];
      if (typeof n === "number" && (n < 0 || n > 100000)) return fail("จำนวนไก่ไม่ถูกต้อง");
    }

    const { data: record, error } = await supabase
      .from("daily_records")
      .upsert(recordData, { onConflict: "batch_id,house_number,record_date" })
      .select()
      .single();
    if (error) return fail(error.message, 400);

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: period === "morning" ? "RECORD_MORNING" : "RECORD_AFTERNOON",
      description: String(body.description ?? "").slice(0, 300),
      record_date: date,
      house_number: user.house_number,
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error("Worker record save error:", error);
    return fail("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
