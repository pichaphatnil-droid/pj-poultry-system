import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import {
  bangkokNow,
  buildAlertMessage,
  findMissingHouses,
  loadFarmSettings,
  sendToRecipients,
  timeToMinutes,
  type Period,
} from "../../../lib/server/alerts";

// ถูกเรียกทุก 15 นาทีโดย Supabase (pg_cron) — ดู supabase/migrations/20261120_record_alerts_cron.sql
// ถึงเวลาที่ตั้งไว้แล้ว ถ้ามีเล้าที่ยังไม่บันทึก จะส่ง LINE วันละครั้งต่อช่วง

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const settings = await loadFarmSettings(supabase);
    const { alerts } = settings;
    if (!alerts.enabled) return NextResponse.json({ skipped: "ปิดการแจ้งเตือนอยู่" });

    const now = bangkokNow();
    const results: Record<string, unknown> = {};

    const periods: { period: Period; on: boolean; time: string }[] = [
      { period: "morning", on: alerts.morningEnabled, time: alerts.morningTime },
      { period: "afternoon", on: alerts.afternoonEnabled, time: alerts.afternoonTime },
    ];

    for (const { period, on, time } of periods) {
      if (!on || now.minutes < timeToMinutes(time)) continue;

      // จองสิทธิ์ส่งของวันนี้ก่อน กันส่งซ้ำ (ถ้ามีแถวแล้ว = เคยเช็กแล้ว)
      const { data: claimed } = await supabase
        .from("alert_log")
        .upsert(
          { alert_date: now.date, period },
          { onConflict: "alert_date,period", ignoreDuplicates: true },
        )
        .select();
      if (!claimed || claimed.length === 0) {
        results[period] = "เช็กไปแล้ววันนี้";
        continue;
      }

      const { batchName, missing } = await findMissingHouses(supabase, now.date, period);
      if (missing.length === 0) {
        results[period] = "บันทึกครบทุกเล้า";
        continue;
      }

      const delivery = await sendToRecipients(
        supabase,
        buildAlertMessage(now.date, period, batchName, missing),
      );
      await supabase
        .from("alert_log")
        .update({
          missing_houses: missing.map((m) => m.house),
          sent_to: delivery.sent,
          error: delivery.errors.join("\n") || null,
        })
        .eq("alert_date", now.date)
        .eq("period", period);
      results[period] = { missing: missing.map((m) => m.house), ...delivery };
    }

    return NextResponse.json({ now, results });
  } catch (error: any) {
    console.error("Record alert error:", error);
    return NextResponse.json({ error: error?.message || "error" }, { status: 500 });
  }
}
