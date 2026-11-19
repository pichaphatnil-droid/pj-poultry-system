import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { hashPassword, PIN_PATTERN, verifyPassword } from "../../../lib/server/password";
import { setSessionCookie } from "../../../lib/server/auth";

// พนักงานเข้าระบบด้วย "เล้า + รหัสเล้า"
// ระบบจะเข้าเป็นพนักงานที่ประจำเล้านั้นอยู่ตอนนี้ (ประวัติจึงยังรู้ว่าใครบันทึก)

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const WRONG_PIN = "รหัสไม่ถูกต้อง / ລະຫັດບໍ່ຖືກຕ້ອງ";

const WORKER_COLUMNS =
  "id, username, full_name, role, house_number, is_active, created_at, updated_at, password_hash, failed_attempts, locked_until";

type WorkerRow = {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "worker";
  house_number: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  password_hash: string | null;
  failed_attempts: number | null;
  locked_until: string | null;
};

const isLocked = (lockedUntil: string | null) =>
  !!lockedUntil && new Date(lockedUntil).getTime() > Date.now();

const lockedResponse = (lockedUntil: string) => {
  const minutes = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
  return NextResponse.json(
    { error: `ใส่รหัสผิดหลายครั้ง กรุณารออีก ${minutes} นาที หรือติดต่อแอดมิน` },
    { status: 429 },
  );
};

const nextFailState = (attempts: number | null) => {
  const count = (attempts || 0) + 1;
  const locked = count >= MAX_FAILED_ATTEMPTS;
  return {
    failed_attempts: locked ? 0 : count,
    locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
  };
};

const toSafeUser = (row: WorkerRow) => {
  const { password_hash: _h, failed_attempts: _a, locked_until: _l, ...safe } = row;
  return safe;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const house = Number(body.house);
  const pin = String(body.pin ?? "").trim();
  const userId = typeof body.userId === "string" ? body.userId : null;

  if (!Number.isInteger(house) || house < 1 || house > 7 || !PIN_PATTERN.test(pin)) {
    return NextResponse.json({ error: WRONG_PIN }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const [{ data: housePin }, { data: workerRows }] = await Promise.all([
      supabase.from("house_pins").select("*").eq("house_number", house).maybeSingle(),
      supabase
        .from("users")
        .select(WORKER_COLUMNS)
        .eq("role", "worker")
        .eq("house_number", house)
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
    ]);
    const workers = (workerRows || []) as WorkerRow[];

    if (workers.length === 0) {
      return NextResponse.json(
        { error: `ยังไม่มีพนักงานประจำเล้า ${house} กรุณาติดต่อแอดมิน` },
        { status: 404 },
      );
    }

    let allowed: WorkerRow[];

    if (housePin) {
      // ใช้รหัสประจำเล้า
      if (isLocked(housePin.locked_until)) return lockedResponse(housePin.locked_until);

      const { ok } = await verifyPassword(pin, housePin.pin_hash);
      if (!ok) {
        await supabase
          .from("house_pins")
          .update(nextFailState(housePin.failed_attempts))
          .eq("house_number", house);
        return NextResponse.json({ error: WRONG_PIN }, { status: 401 });
      }
      if (housePin.failed_attempts || housePin.locked_until) {
        await supabase
          .from("house_pins")
          .update({ failed_attempts: 0, locked_until: null })
          .eq("house_number", house);
      }
      allowed = workers;
    } else {
      // ยังไม่ได้ตั้งรหัสเล้า → ใช้รหัสเดิมของพนักงานในเล้านั้น
      const unlocked = workers.filter((w) => !isLocked(w.locked_until));
      if (unlocked.length === 0) return lockedResponse(workers[0].locked_until!);

      allowed = [];
      for (const worker of unlocked) {
        const { ok, needsRehash } = await verifyPassword(pin, worker.password_hash);
        if (ok) {
          allowed.push(worker);
          const updates: Record<string, unknown> = { failed_attempts: 0, locked_until: null };
          if (needsRehash) updates.password_hash = await hashPassword(pin);
          await supabase.from("users").update(updates).eq("id", worker.id);
        }
      }

      if (allowed.length === 0) {
        await Promise.all(
          unlocked.map((w) =>
            supabase.from("users").update(nextFailState(w.failed_attempts)).eq("id", w.id),
          ),
        );
        return NextResponse.json({ error: WRONG_PIN }, { status: 401 });
      }
    }

    // มีพนักงานหลายคนในเล้าเดียวกัน → ให้เลือกชื่อ
    let chosen: WorkerRow | undefined;
    if (userId) {
      chosen = allowed.find((w) => w.id === userId);
    } else if (allowed.length === 1) {
      chosen = allowed[0];
    }

    if (!chosen) {
      return NextResponse.json({
        choose: allowed.map((w) => ({ id: w.id, full_name: w.full_name })),
      });
    }

    const user = toSafeUser(chosen);
    const response = NextResponse.json({ user });
    await setSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("House login error:", error);
    return NextResponse.json({ error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
