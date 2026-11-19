import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
  type SessionPayload,
} from "../session";

export const getSession = (request: NextRequest) =>
  verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

export const setSessionCookie = async (
  response: NextResponse,
  user: { id: string; role: "admin" | "worker"; house_number: number | null },
) => {
  const token = await createSessionToken({
    uid: user.id,
    role: user.role,
    house: user.house_number ?? null,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
};

export const requireAdmin = async (
  request: NextRequest,
): Promise<SessionPayload | NextResponse> => {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }
  return session;
};
