// ใช้เฉพาะฝั่ง server (API route) เท่านั้น
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

const scrypt = (password: string, salt: Buffer, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
};

export const isHashed = (stored: string) => stored.startsWith(`${PREFIX}$`);

/**
 * ตรวจรหัสผ่าน รองรับทั้งแบบ hash ใหม่ และรหัสแบบข้อความธรรมดาที่เก็บไว้เดิม
 * ถ้าเป็นแบบเดิมและรหัสถูก จะคืน needsRehash = true เพื่อให้ระบบ hash เก็บใหม่ทันที
 * (พนักงานจึงใช้รหัสเดิมต่อได้ ไม่ต้องตั้งใหม่)
 */
export const verifyPassword = async (
  password: string,
  stored: string | null | undefined,
): Promise<{ ok: boolean; needsRehash: boolean }> => {
  if (!stored) return { ok: false, needsRehash: false };

  if (isHashed(stored)) {
    const [, saltHex, keyHex] = stored.split("$");
    if (!saltHex || !keyHex) return { ok: false, needsRehash: false };
    const expected = Buffer.from(keyHex, "hex");
    const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
    return {
      ok: actual.length === expected.length && timingSafeEqual(actual, expected),
      needsRehash: false,
    };
  }

  // รหัสแบบเก่า (ข้อความธรรมดา)
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
};

export const PIN_PATTERN = /^\d{4,6}$/;
