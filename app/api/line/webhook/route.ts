import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { lineGet, lineReply } from "../../../lib/server/alerts";

// รับเหตุการณ์จาก LINE: มีคนเพิ่มเพื่อน / เชิญบอทเข้ากลุ่ม → บันทึกเป็นผู้รับแจ้งเตือน (รอแอดมินเปิดใช้)
// ตั้ง Webhook URL ใน LINE Developers เป็น https://<เว็บของคุณ>/api/line/webhook

const validSignature = (body: string, signature: string | null) => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const events: any[] = JSON.parse(body || "{}").events || [];
  const supabase = getSupabaseAdmin();

  for (const event of events) {
    const source = event.source || {};
    const id: string | undefined = source.groupId || source.roomId || source.userId;
    const kind = source.groupId ? "group" : source.roomId ? "room" : "user";
    if (!id) continue;

    if (event.type === "follow" || event.type === "join") {
      let name = "";
      if (kind === "user") name = (await lineGet(`/v2/bot/profile/${id}`))?.displayName || "";
      if (kind === "group") name = (await lineGet(`/v2/bot/group/${id}/summary`))?.groupName || "";

      await supabase
        .from("line_recipients")
        .upsert({ id, kind, name: name || null }, { onConflict: "id", ignoreDuplicates: true });

      if (event.replyToken) {
        await lineReply(
          event.replyToken,
          "เชื่อมต่อกับระบบฟาร์มแล้ว ✅\nรอแอดมินกดเปิดรับแจ้งเตือนในหน้า ตั้งค่า > การแจ้งเตือน",
        );
      }
    }

    if (event.type === "unfollow" || event.type === "leave") {
      await supabase.from("line_recipients").update({ enabled: false }).eq("id", id);
    }
  }

  return NextResponse.json({ ok: true });
}
