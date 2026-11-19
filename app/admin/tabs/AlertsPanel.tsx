"use client";

import { useEffect, useState } from "react";
import { adminDb } from "../adminDb";

// ส่วนจัดการผู้รับ LINE + สถานะการเชื่อมต่อ + ปุ่มทดสอบ (ทำงานทันที ไม่ต้องกดบันทึก)

interface Recipient {
  id: string;
  kind: "user" | "group" | "room";
  name: string | null;
  enabled: boolean;
  created_at: string;
}

interface AlertLog {
  alert_date: string;
  period: "morning" | "afternoon";
  missing_houses: number[];
  sent_to: number;
  error: string | null;
}

interface Status {
  lineAccessToken: boolean;
  lineChannelSecret: boolean;
  cronSecret: boolean;
  webhookUrl: string;
  cronUrl: string;
  logs: AlertLog[];
}

const Check = ({ ok, label }: { ok: boolean; label: string }) => (
  <li className={ok ? "text-green-700" : "text-amber-700"}>
    {ok ? "✅" : "⚠️"} {label}
  </li>
);

export default function AlertsPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data }, res] = await Promise.all([
      adminDb.from("line_recipients").select("*").order("created_at", { ascending: true }),
      fetch("/api/admin/alerts", { cache: "no-store" }),
    ]);
    setRecipients((data as Recipient[]) || []);
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (r: Recipient) => {
    setBusy(true);
    const { error } = await adminDb
      .from("line_recipients")
      .update({ enabled: !r.enabled })
      .eq("id", r.id);
    setBusy(false);
    if (error) setMessage("บันทึกไม่สำเร็จ: " + error.message);
    await load();
  };

  const remove = async (r: Recipient) => {
    if (!window.confirm(`ลบ ${r.name || "ผู้รับนี้"} ออกจากรายชื่อ?`)) return;
    setBusy(true);
    await adminDb.from("line_recipients").delete().eq("id", r.id);
    setBusy(false);
    await load();
  };

  const sendTest = async () => {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/alerts", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMessage("ส่งไม่สำเร็จ: " + (data.error || res.status));
    else
      setMessage(
        `ส่งแล้ว ${data.sent}/${data.recipients} ผู้รับ` +
          (data.errors?.length ? ` — ผิดพลาด: ${data.errors.join(", ")}` : ""),
      );
    await load();
  };

  const ready = status?.lineAccessToken && status?.lineChannelSecret && status?.cronSecret;

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      {status && (
        <div className="text-sm">
          <p className="font-medium text-gray-700 mb-1">การเชื่อมต่อ</p>
          <ul className="space-y-0.5">
            <Check ok={status.lineAccessToken} label="LINE_CHANNEL_ACCESS_TOKEN ใน Vercel" />
            <Check ok={status.lineChannelSecret} label="LINE_CHANNEL_SECRET ใน Vercel" />
            <Check ok={status.cronSecret} label="CRON_SECRET ใน Vercel" />
          </ul>
          {!ready && (
            <p className="mt-2 text-gray-500">
              ยังตั้งค่าไม่ครบ — ระหว่างนี้แจ้งเตือนจะขึ้นเฉพาะในหน้าแอดมินเท่านั้น
            </p>
          )}
          <p className="mt-2 text-gray-500 break-all">
            Webhook URL สำหรับ LINE: <code className="bg-gray-100 px-1 rounded">{status.webhookUrl}</code>
          </p>
        </div>
      )}

      <div>
        <p className="font-medium text-gray-700 text-sm mb-1">ผู้รับแจ้งเตือนทาง LINE</p>
        <p className="text-xs text-gray-500 mb-2">
          เพิ่มเพื่อน LINE OA ของฟาร์ม (หรือเชิญเข้ากลุ่ม) แล้วชื่อจะขึ้นที่นี่ กด &quot;เปิดรับ&quot; เพื่อเริ่มส่ง
          · แพ็กเกจฟรีส่งได้ 300 ข้อความ/เดือน นับตามจำนวนคนที่ได้รับ
        </p>
        {recipients.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มี</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {r.kind === "user" ? "👤" : "👥"} {r.name || r.id.slice(0, 10) + "…"}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(r)}
                    disabled={busy}
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      r.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.enabled ? "รับแจ้งเตือนอยู่" : "เปิดรับ"}
                  </button>
                  <button onClick={() => remove(r)} disabled={busy} className="text-red-600 px-1">
                    ลบ
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={sendTest}
          disabled={busy || !status?.lineAccessToken}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          ส่งข้อความทดสอบ
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>

      {status && status.logs.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-gray-700 mb-1">ประวัติล่าสุด</p>
          <ul className="space-y-0.5 text-gray-600">
            {status.logs.map((l) => (
              <li key={`${l.alert_date}-${l.period}`}>
                {l.alert_date} {l.period === "morning" ? "เช้า" : "บ่าย"}:{" "}
                {l.missing_houses.length
                  ? `ขาดเล้า ${l.missing_houses.join(", ")} · ส่งถึง ${l.sent_to} ผู้รับ`
                  : "บันทึกครบ"}
                {l.error && <span className="text-red-600"> · {l.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
