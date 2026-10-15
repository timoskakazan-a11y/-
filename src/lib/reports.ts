import "server-only";
import { db } from "./supabase";
import { byClass, inScope } from "./people";

export type Period = { id: string; title: string; month: string; deadline: string; is_open: boolean; created_at: string };
export type Item = { id?: string; event_date: string; title: string; participants: number; note: string; event_id: string | null };
export type ClassReport = {
  id: string; period_id: string; class_name: string; head_id: string | null;
  status: "draft" | "submitted"; submitted_at: string | null; updated_at: string; items: Item[];
};
export type HeadRow = { id: string; full_name: string; class_name: string; login: string; is_active: boolean; last_login_at: string | null; created_at: string };

const PERIOD_COLS = "id,title,month,deadline,is_open,created_at";

function check<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export async function listPeriods(limit = 36): Promise<Period[]> {
  return check(await db().from("report_periods").select(PERIOD_COLS).order("month", { ascending: false }).order("created_at", { ascending: false }).limit(limit)) ?? [];
}

export async function getPeriod(id: string): Promise<Period | null> {
  return check(await db().from("report_periods").select(PERIOD_COLS).eq("id", id).maybeSingle());
}

/** Периоды, в которые староста может сдавать (открыт и срок не прошёл) */
export function isAccepting(p: Period) {
  return p.is_open && new Date(p.deadline).getTime() > Date.now();
}

export async function listHeads(scope: string[] | null): Promise<HeadRow[]> {
  const rows = check(await db().from("class_heads").select("id,full_name,class_name,login,is_active,last_login_at,created_at").limit(2000)) ?? [];
  return (rows as HeadRow[])
    .filter((h) => inScope(scope, h.class_name))
    .sort((a, b) => byClass(a.class_name, b.class_name) || a.full_name.localeCompare(b.full_name, "ru"));
}

/** Отчёты периода со строками. scope — классы сотрудника */
export async function reportsForPeriod(periodId: string, scope: string[] | null): Promise<ClassReport[]> {
  const reports = check(
    await db()
      .from("class_reports")
      .select("id,period_id,class_name,head_id,status,submitted_at,updated_at,report_items(id,position,event_date,title,participants,note,event_id)")
      .eq("period_id", periodId)
      .limit(1000),
  ) ?? [];
  return (reports as (Omit<ClassReport, "items"> & { report_items: (Item & { position: number })[] })[])
    .filter((r) => inScope(scope, r.class_name))
    .map(({ report_items, ...r }) => ({ ...r, items: [...report_items].sort((a, b) => a.position - b.position) }))
    .sort((a, b) => byClass(a.class_name, b.class_name));
}

export async function classReport(periodId: string, cls: string): Promise<ClassReport | null> {
  const r = check(
    await db()
      .from("class_reports")
      .select("id,period_id,class_name,head_id,status,submitted_at,updated_at,report_items(id,position,event_date,title,participants,note,event_id)")
      .eq("period_id", periodId)
      .eq("class_name", cls)
      .maybeSingle(),
  ) as (Omit<ClassReport, "items"> & { report_items: (Item & { position: number })[] }) | null;
  if (!r) return null;
  const { report_items, ...rest } = r;
  return { ...rest, items: [...report_items].sort((a, b) => a.position - b.position) };
}

/** События сайта за месяц периода — для быстрого выбора старостой */
export async function monthEvents(month: string) {
  const start = new Date(`${month}T00:00:00+03:00`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const rows = check(
    await db()
      .from("events")
      .select("id,title,starts_at")
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .limit(100),
  ) ?? [];
  return (rows as { id: string; title: string; starts_at: string }[]).map((e) => ({
    id: e.id,
    title: e.title,
    date: new Date(new Date(e.starts_at).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10),
  }));
}
