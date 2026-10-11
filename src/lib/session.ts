// Подпись/проверка cookie админ-сессии. Используется и в proxy.ts, и на сервере.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mc71_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 часов

function sign(payload: string) {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return createHmac("sha256", s).update(`session:${payload}`).digest("base64url");
}

export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${exp}`;
  const sig = sign(payload);
  if (!sig) throw new Error("SESSION_SECRET не задан");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  if (!expected) return false;
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
