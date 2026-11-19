// แจ้งเตือนเล้าที่ยังไม่บันทึกข้อมูล — ใช้เฉพาะฝั่งเซิร์ฟเวอร์
import { normalizeFarmSettings, type FarmSettings } from "../farmSettings";

export type Period = "morning" | "afternoon";

export const PERIOD_LABEL: Record<Period, string> = {
  morning: "ช่วงเช้า",
  afternoon: "ช่วงบ่าย",
};

// วันที่และเวลาปัจจุบันตามเวลาไทย (เซิร์ฟเวอร์ Vercel ใช้ UTC)
export const bangkokNow = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    time: `${parts.hour}:${parts.minute}`,
  };
};

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const loadFarmSettings = async (supabase: any): Promise<FarmSettings> => {
  const { data } = await supabase.from("farm_settings").select("data").eq("id", 1).maybeSingle();
  return normalizeFarmSettings(data?.data);
};

export interface MissingHouse {
  house: number;
  workers: string[];
}

/**
 * หาเล้าที่ยังไม่บันทึกข้อมูลช่วงที่กำหนด ของรุ่นที่เปิดใช้งานอยู่
 * นับเฉพาะเล้าที่อยู่ในรุ่นนี้ (มีจำนวนไก่) ไก่เข้าแล้ว และยังไม่ถึงวันจับ
 */
export const findMissingHouses = async (
  supabase: any,
  date: string,
  period: Period,
): Promise<{ batchName: string | null; missing: MissingHouse[] }> => {
  const { data: batch } = await supabase
    .from("batches")
    .select("id, batch_name, start_date")
    .eq("is_active", true)
    .maybeSingle();
  if (!batch || date < batch.start_date) return { batchName: batch?.batch_name ?? null, missing: [] };

  const [{ data: houses }, { data: records }, { data: workers }] = await Promise.all([
    supabase
      .from("batch_house_counts")
      .select("house_number, initial_count, arrival_date, capture_date")
      .eq("batch_id", batch.id),
    supabase
      .from("daily_records")
      .select("house_number, morning_recorded_at, afternoon_recorded_at")
      .eq("batch_id", batch.id)
      .eq("record_date", date),
    supabase
      .from("users")
      .select("full_name, house_number")
      .eq("role", "worker")
      .eq("is_active", true),
  ]);

  // ถ้ายังไม่ได้ตั้งข้อมูลเล้าของรุ่น ใช้เล้าที่มีพนักงานประจำแทน
  let expected: number[] = (houses || [])
    .filter(
      (h: any) =>
        h.initial_count > 0 &&
        (!h.arrival_date || h.arrival_date <= date) &&
        (!h.capture_date || h.capture_date > date),
    )
    .map((h: any) => Number(h.house_number));
  if (!houses || houses.length === 0) {
    expected = [...new Set<number>((workers || []).map((w: any) => w.house_number).filter(Boolean))];
  }

  const field = period === "morning" ? "morning_recorded_at" : "afternoon_recorded_at";
  const done = new Set((records || []).filter((r: any) => r[field]).map((r: any) => r.house_number));

  const missing = expected
    .filter((h) => !done.has(h))
    .sort((a, b) => a - b)
    .map((house) => ({
      house,
      workers: (workers || []).filter((w: any) => w.house_number === house).map((w: any) => w.full_name),
    }));

  return { batchName: batch.batch_name, missing };
};

export const formatThaiDate = (date: string) =>
  new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

export const buildAlertMessage = (
  date: string,
  period: Period,
  batchName: string | null,
  missing: MissingHouse[],
) =>
  [
    `⚠️ ยังไม่บันทึกข้อมูล${PERIOD_LABEL[period]} (${formatThaiDate(date)})`,
    ...missing.map((m) => `• เล้า ${m.house}${m.workers.length ? ` — ${m.workers.join(", ")}` : ""}`),
    batchName ? `รุ่น ${batchName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

// ---------- LINE Messaging API ----------

export const lineConfigured = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

export const linePush = async (to: string, text: string, mentionAll = false) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN" };
  const content = text.replace(/[{}]/g, "").slice(0, 4800);
  // textV2 + mentionee "all" = แท็ก @All ทั้งกลุ่ม
  const message = mentionAll
    ? {
        type: "textV2",
        text: `{everyone}\n${content}`,
        substitution: { everyone: { type: "mention", mentionee: { type: "all" } } },
      }
    : { type: "text", text: content };
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [message] }),
  });
  if (res.ok) return { ok: true as const };
  const body = await res.text().catch(() => "");
  return { ok: false as const, error: `LINE ${res.status}: ${body.slice(0, 200)}` };
};

export const lineReply = async (replyToken: string, text: string) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  }).catch(() => undefined);
};

export const lineGet = async (path: string) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.line.me${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  return res && res.ok ? res.json().catch(() => null) : null;
};

// ส่งข้อความถึงผู้รับทุกคนที่แอดมินเปิดใช้งานไว้
// mentionAll: แท็ก @All เฉพาะผู้รับที่เป็นกลุ่ม (แชทส่วนตัวไม่มี @All)
export const sendToRecipients = async (supabase: any, text: string, mentionAll = false) => {
  const { data: recipients } = await supabase
    .from("line_recipients")
    .select("id, name, kind")
    .eq("enabled", true);
  let sent = 0;
  const errors: string[] = [];
  for (const r of recipients || []) {
    const result = await linePush(r.id, text, mentionAll && r.kind !== "user");
    if (result.ok) sent += 1;
    else errors.push(`${r.name || r.id}: ${result.error}`);
  }
  return { recipients: (recipients || []).length, sent, errors };
};
