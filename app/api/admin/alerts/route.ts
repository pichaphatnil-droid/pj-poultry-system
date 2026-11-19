import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { requireAdmin } from "../../../lib/server/auth";
import {
  bangkokNow,
  buildAlertMessage,
  findMissingHouses,
  lineConfigured,
  loadFarmSettings,
  PERIOD_LABEL,
  sendToRecipients,
} from "../../../lib/server/alerts";

const ensureActiveAdmin = async (request: NextRequest) => {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("role, is_active")
    .eq("id", session.uid)
    .maybeSingle();
  if (!data || data.role !== "admin" || !data.is_active) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }
  return session;
};

// สถานะการตั้งค่า (ไม่ส่งค่าลับกลับไป) + ประวัติการแจ้งเตือนล่าสุด
export async function GET(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;

  const { data: logs } = await getSupabaseAdmin()
    .from("alert_log")
    .select("*")
    .order("alert_date", { ascending: false })
    .order("period", { ascending: true })
    .limit(10);

  return NextResponse.json({
    lineAccessToken: lineConfigured(),
    lineChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    cronSecret: Boolean(process.env.CRON_SECRET),
    webhookUrl: `${request.nextUrl.origin}/api/line/webhook`,
    cronUrl: `${request.nextUrl.origin}/api/cron/record-alerts`,
    logs: logs || [],
  });
}

// ส่งข้อความทดสอบ: บอกสถานะการบันทึกของวันนี้ทั้งสองช่วง
export async function POST(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;
  if (!lineConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ใส่ LINE_CHANNEL_ACCESS_TOKEN ใน Vercel" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const now = bangkokNow();
  const lines = ["🔔 ทดสอบการแจ้งเตือนจากระบบฟาร์ม"];
  for (const period of ["morning", "afternoon"] as const) {
    const { batchName, missing } = await findMissingHouses(supabase, now.date, period);
    lines.push(
      missing.length
        ? buildAlertMessage(now.date, period, batchName, missing)
        : `✅ ${PERIOD_LABEL[period]}: บันทึกครบแล้ว`,
    );
  }

  const { alerts } = await loadFarmSettings(supabase);
  const delivery = await sendToRecipients(supabase, lines.join("\n\n"), alerts.mentionAll);
  if (delivery.recipients === 0) {
    return NextResponse.json({ error: "ยังไม่มีผู้รับที่เปิดใช้งาน" }, { status: 400 });
  }
  return NextResponse.json(delivery);
}
