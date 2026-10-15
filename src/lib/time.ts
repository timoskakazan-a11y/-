// Казань живёт по московскому времени (UTC+3, без перехода на летнее).
const OFFSET = "+03:00";

/** "2026-10-20T15:00" (время Казани) → ISO-строка */
export function localToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "2026-10-20T15:00" для <input type="datetime-local"> */
export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  });
}

/** Короткий формат для таблиц: 11.10.2026 14:53 */
export function fmtShort(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  }).replace(",", "");
}

/** "2026-10-17" → "17 октября" (с годом, если год не текущий) */
export function fmtDay(date: string, withWeekday = false) {
  const d = new Date(`${date}T12:00:00+03:00`);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }), ...(withWeekday ? { weekday: "short" } : {}), timeZone: "Europe/Moscow",
  });
}

/** Срок сдачи: «31 октября, 18:00» */
export function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

/** Сколько полных дней осталось до срока (0 — сегодня, отрицательное — просрочено) */
export function daysLeft(iso: string) {
  const day = (t: number) => Math.floor((t + 3 * 3600 * 1000) / 86400000);
  return day(new Date(iso).getTime()) - day(Date.now());
}

/** Сегодняшняя дата по Казани: "2026-10-15" */
export function todayLocal() {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}
