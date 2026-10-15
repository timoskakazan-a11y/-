// Подпись/проверка cookie сессии. Используется и в proxy.ts, и на сервере.
// В токене роль и id: owner (главный админ по паролю), staff (педагог по коду),
// head (староста по логину и паролю).
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mc71_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 часов
export const HEAD_TTL_SECONDS = 60 * 60 * 24 * 30; // старосте не нужно входить каждый день

export type Role = "owner" | "staff" | "head";
export type Session = { role: Role; uid: string };

function sign(payload: string) {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return createHmac("sha256", s).update(`session:${payload}`).digest("base64url");
}

export function createSessionToken(role: Role = "owner", uid = "owner", ttl = SESSION_TTL_SECONDS): string {
  if (!/^[a-z0-9-]{1,64}$/.test(uid)) throw new Error("bad uid");
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${role}.${uid}.${exp}`;
  const sig = sign(payload);
  if (!sig) throw new Error("SESSION_SECRET не задан");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [role, uid, expStr, sig] = parts;
  if (role !== "owner" && role !== "staff" && role !== "head") return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = sign(`${role}.${uid}.${expStr}`);
  if (!expected) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { role, uid };
}

/** Для proxy: только сотрудники (владелец или педагог) */
export function verifySessionToken(token: string | undefined | null): boolean {
  const s = readSessionToken(token);
  return !!s && s.role !== "head";
}
