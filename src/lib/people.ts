// Общие правила для команды и старост: разделы доступа, классы,
// генерация логинов, паролей и кодов, хеширование.
import "server-only";
import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const PERMS = {
  reports: "Отчёты старост",
  heads: "Старосты: создание и пароли",
  forms: "Формы и ответы",
  events: "События на сайте",
  albums: "Фотоальбомы",
} as const;
export type Perm = keyof typeof PERMS;
export const PERM_KEYS = Object.keys(PERMS) as Perm[];

// ---- классы ----
const LATIN_LOOKALIKE: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х" };

/** «5 а», «5a», «5-А» → «5А». null, если это не похоже на класс. */
export function normalizeClass(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/[\s\-–.]/g, "").replace(/[ABCEHKMOPTX]/g, (c) => LATIN_LOOKALIKE[c] ?? c);
  return /^([1-9]|1[01])[А-ЯЁ]?$/.test(s) ? s : null;
}

export function classSortKey(c: string) {
  const m = /^(\d+)(.*)$/.exec(c);
  return m ? Number(m[1]) * 100 + (m[2] ? m[2].charCodeAt(0) - 1039 : 0) : 9999;
}
export const byClass = (a: string, b: string) => classSortKey(a) - classSortKey(b) || a.localeCompare(b, "ru");

/** Разбор списка классов «5А, 5Б, 6» → ['5А','5Б','6'] (параллель — просто цифра) */
export function parseClassScope(raw: string): { ok: string[]; bad: string[] } {
  const ok: string[] = [];
  const bad: string[] = [];
  for (const part of raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const c = normalizeClass(part);
    if (c) { if (!ok.includes(c)) ok.push(c); } else bad.push(part);
  }
  return { ok: ok.sort(byClass), bad };
}

/** Видит ли сотрудник с такими классами класс cls. Пустой список — все классы. */
export function inScope(scope: string[] | null, cls: string) {
  if (!scope || scope.length === 0) return true;
  const grade = /^\d+/.exec(cls)?.[0];
  return scope.some((s) => s === cls || (/^\d+$/.test(s) && s === grade));
}

// ---- логины и пароли старост ----
const TR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
export function translit(s: string) {
  return s.toLowerCase().split("").map((ch) => TR[ch] ?? ch).join("").replace(/[^a-z0-9]/g, "");
}

/** Иванова Мария, 5А → ivanova.5a */
export function baseLogin(fullName: string, cls: string) {
  const surname = translit(fullName.trim().split(/\s+/)[0] ?? "") || "starosta";
  return `${surname.slice(0, 24)}.${translit(cls)}`;
}

// Простые слова, которые пятикласснику легко набрать без ошибок
const WORDS = ["sova", "lisa", "volk", "kit", "tigr", "kot", "lev", "slon", "enot", "bobr", "gus", "utka", "zubr", "los", "rys", "panda", "lama", "zebra", "puma", "orel", "sokol", "chaika", "delfin", "pingvin", "homyak", "belka", "mishka", "zaya", "pony", "krab"];
export function kidPassword() {
  return `${WORDS[randomInt(WORDS.length)]}${randomInt(1000, 10000)}`;
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [alg, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const got = scryptSync(pw, Buffer.from(saltB64, "base64url"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(got, expected);
}
/** Чтобы время ответа не выдавало, существует ли логин */
export const DUMMY_HASH = hashPassword("dummy-password");

// ---- коды доступа сотрудников ----
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // без 0/O, 1/I/L
export function newAccessCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0");
}
export function codeHash(code: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET не задан");
  return createHmac("sha256", secret).update(`staff-code:${normalizeCode(code)}`).digest("hex");
}
