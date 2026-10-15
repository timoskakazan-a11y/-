"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { requireOwner, requireStaff, seesClass, type Actor } from "@/lib/auth";
import {
  PERM_KEYS, baseLogin, byClass, codeHash, hashPassword, kidPassword, newAccessCode, normalizeClass, parseClassScope, type Perm,
} from "@/lib/people";
import { localToIso } from "@/lib/time";

/** Данные для входа показываются ОДИН раз — в базе хранится только хеш */
export type Cred = { name: string; cls?: string; login?: string; secret: string; kind: "code" | "password" };
export type PeopleResult = { ok: boolean; message?: string; creds?: Cred[] } | null;

const fail = (message: string): PeopleResult => ({ ok: false, message });
const uuid = z.string().uuid();
const name = z.string().trim().min(2, "Введите ФИО").max(120, "Слишком длинное ФИО");

function dbError(e: unknown) {
  console.error(e);
  const code = (e as { code?: string })?.code;
  if (code === "23514") return "Проверьте поля: какое-то значение не подходит.";
  return "Ошибка базы данных. Попробуйте ещё раз.";
}

// ============================================================
// Команда: педагоги и кураторы (только главный администратор)
// ============================================================

function readStaffForm(fd: FormData) {
  const perms = fd.getAll("perm").map(String).filter((p): p is Perm => (PERM_KEYS as string[]).includes(p));
  const scope = parseClassScope(String(fd.get("classes") ?? ""));
  const parsed = z
    .object({ full_name: name, position: z.string().trim().max(120).default("") })
    .safeParse({ full_name: fd.get("full_name"), position: fd.get("position") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  if (scope.bad.length) return { error: `Не понял классы: ${scope.bad.join(", ")}. Пишите так: 5А, 5Б, 6` };
  if (perms.length === 0) return { error: "Отметьте хотя бы один раздел, к которому нужен доступ" };
  return { data: { ...parsed.data, permissions: perms, classes: scope.ok } };
}

async function insertWithCode(row: Record<string, unknown>) {
  // код случайный; при редком совпадении хеша пробуем ещё раз
  for (let i = 0; i < 5; i++) {
    const code = newAccessCode();
    const { error } = await db().from("staff").insert({ ...row, code_hash: codeHash(code) });
    if (!error) return code;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Не удалось создать уникальный код");
}

export async function createStaff(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireOwner();
  const r = readStaffForm(fd);
  if (r.error || !r.data) return fail(r.error ?? "Проверьте поля");
  try {
    const code = await insertWithCode(r.data);
    revalidatePath("/admin/team");
    return { ok: true, message: "Сотрудник добавлен", creds: [{ name: r.data.full_name, secret: code, kind: "code" }] };
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function updateStaff(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireOwner();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const r = readStaffForm(fd);
  if (r.error || !r.data) return fail(r.error ?? "Проверьте поля");
  const { error } = await db()
    .from("staff")
    .update({ ...r.data, is_active: fd.get("is_active") === "on" })
    .eq("id", id.data);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/team");
  return { ok: true, message: "Сохранено" };
}

export async function regenerateCode(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireOwner();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const { data: s } = await db().from("staff").select("full_name").eq("id", id.data).maybeSingle();
  if (!s) return fail("Сотрудник не найден");
  for (let i = 0; i < 5; i++) {
    const code = newAccessCode();
    const { error } = await db().from("staff").update({ code_hash: codeHash(code) }).eq("id", id.data);
    if (!error) {
      revalidatePath("/admin/team");
      return { ok: true, message: "Старый код больше не работает", creds: [{ name: s.full_name, secret: code, kind: "code" }] };
    }
    if (error.code !== "23505") return fail(dbError(error));
  }
  return fail("Не удалось создать код, попробуйте ещё раз");
}

export async function deleteStaff(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireOwner();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const { error } = await db().from("staff").delete().eq("id", id.data);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/team");
  redirect("/admin/team");
}

// ============================================================
// Старосты
// ============================================================

/** «5А Иванова Мария», «Иванова Мария 5А», «5а, Иванова Мария» */
function parseHeadLine(line: string): { cls: string; full_name: string } | { error: string } {
  const parts = line.replace(/[;,\t]/g, " ").split(/\s+/).filter(Boolean);
  const idx = parts.findIndex((p) => normalizeClass(p) !== null);
  if (idx === -1) return { error: `«${line}» — не нашёл класс (например 5А)` };
  const cls = normalizeClass(parts[idx])!;
  const full_name = parts.filter((_, i) => i !== idx).join(" ");
  if (full_name.length < 2) return { error: `«${line}» — нет ФИО` };
  if (full_name.length > 120) return { error: `«${line}» — слишком длинное ФИО` };
  return { cls, full_name };
}

async function uniqueLogin(base: string, taken: Set<string>) {
  const { data } = await db().from("class_heads").select("login").like("login", `${base}%`);
  for (const r of data ?? []) taken.add(r.login);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
  throw new Error("Не удалось подобрать логин");
}

function checkScope(a: Actor, cls: string) {
  return seesClass(a, cls) ? null : `Класс ${cls} не входит в ваши классы`;
}

export async function createHeads(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  const actor = await requireStaff("heads");
  const lines = String(fd.get("list") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return fail("Добавьте хотя бы одну строку: класс и ФИО, например «5А Иванова Мария»");
  if (lines.length > 80) return fail("За один раз — не больше 80 старост");

  const rows: { cls: string; full_name: string }[] = [];
  for (const l of lines) {
    const r = parseHeadLine(l);
    if ("error" in r) return fail(r.error);
    const scopeErr = checkScope(actor, r.cls);
    if (scopeErr) return fail(scopeErr);
    rows.push(r);
  }

  const taken = new Set<string>();
  const creds: Cred[] = [];
  try {
    for (const r of rows) {
      const login = await uniqueLogin(baseLogin(r.full_name, r.cls), taken);
      taken.add(login);
      const password = kidPassword();
      const { error } = await db()
        .from("class_heads")
        .insert({ full_name: r.full_name, class_name: r.cls, login, password_hash: hashPassword(password) });
      if (error) throw error;
      creds.push({ name: r.full_name, cls: r.cls, login, secret: password, kind: "password" });
    }
  } catch (e) {
    revalidatePath("/admin/heads");
    // часть могла создаться — показываем их, чтобы пароли не потерялись
    return { ok: false, message: `${dbError(e)} Создано: ${creds.length} из ${rows.length}.`, creds };
  }
  revalidatePath("/admin/heads");
  creds.sort((a, b) => byClass(a.cls ?? "", b.cls ?? ""));
  return { ok: true, message: creds.length === 1 ? "Староста добавлен" : `Добавлено старост: ${creds.length}`, creds };
}

async function loadHeadInScope(actor: Actor, id: string) {
  const { data } = await db().from("class_heads").select("id,full_name,class_name,login").eq("id", id).maybeSingle();
  if (!data || !seesClass(actor, data.class_name)) return null;
  return data;
}

export async function resetHeadPassword(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  const actor = await requireStaff("heads");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const h = await loadHeadInScope(actor, id.data);
  if (!h) return fail("Староста не найден");
  const password = kidPassword();
  const { error } = await db().from("class_heads").update({ password_hash: hashPassword(password) }).eq("id", h.id);
  if (error) return fail(dbError(error));
  return { ok: true, message: "Старый пароль больше не работает", creds: [{ name: h.full_name, cls: h.class_name, login: h.login, secret: password, kind: "password" }] };
}

export async function updateHead(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  const actor = await requireStaff("heads");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const h = await loadHeadInScope(actor, id.data);
  if (!h) return fail("Староста не найден");
  const full = name.safeParse(fd.get("full_name"));
  if (!full.success) return fail(full.error.issues[0]?.message ?? "Введите ФИО");
  const cls = normalizeClass(String(fd.get("class_name") ?? ""));
  if (!cls) return fail("Класс пишется так: 5А");
  const scopeErr = checkScope(actor, cls);
  if (scopeErr) return fail(scopeErr);
  const { error } = await db()
    .from("class_heads")
    .update({ full_name: full.data, class_name: cls, is_active: fd.get("is_active") === "on" })
    .eq("id", h.id);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/heads");
  return { ok: true, message: "Сохранено" };
}

export async function deleteHead(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  const actor = await requireStaff("heads");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const h = await loadHeadInScope(actor, id.data);
  if (!h) return fail("Староста не найден");
  const { error } = await db().from("class_heads").delete().eq("id", h.id);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/heads");
  return { ok: true, message: "Удалено" };
}

// ============================================================
// Отчётные периоды
// ============================================================

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const periodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Выберите месяц"),
  title: z.string().trim().max(120).default(""),
  deadline: z.string().transform((v, ctx) => {
    const iso = localToIso(v);
    if (!iso) ctx.addIssue({ code: "custom", message: "Укажите срок сдачи" });
    return iso ?? "";
  }),
});

export async function createPeriod(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireStaff("reports");
  const p = periodSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Проверьте поля");
  const [y, m] = p.data.month.split("-").map(Number);
  const title = p.data.title || `${MONTHS[m - 1]} ${y}`;
  const { data, error } = await db()
    .from("report_periods")
    .insert({ title, month: `${p.data.month}-01`, deadline: p.data.deadline, is_open: true })
    .select("id")
    .single();
  if (error) return fail(dbError(error));
  revalidatePath("/admin/reports");
  redirect(`/admin/reports/${data.id}`);
}

export async function updatePeriod(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireStaff("reports");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const title = z.string().trim().min(1, "Введите название").max(120).safeParse(fd.get("title"));
  if (!title.success) return fail(title.error.issues[0]?.message ?? "Введите название");
  const deadline = localToIso(String(fd.get("deadline") ?? ""));
  if (!deadline) return fail("Укажите срок сдачи");
  const { error } = await db()
    .from("report_periods")
    .update({ title: title.data, deadline, is_open: fd.get("is_open") === "on" })
    .eq("id", id.data);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/reports", "layout");
  return { ok: true, message: "Сохранено" };
}

export async function deletePeriod(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  await requireOwner();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const { error } = await db().from("report_periods").delete().eq("id", id.data);
  if (error) return fail(dbError(error));
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

/** Вернуть отчёт класса на доработку (статус «черновик») */
export async function reopenReport(_: PeopleResult, fd: FormData): Promise<PeopleResult> {
  const actor = await requireStaff("reports");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const { data } = await db().from("class_reports").select("id,class_name,period_id").eq("id", id.data).maybeSingle();
  if (!data || !seesClass(actor, data.class_name)) return fail("Отчёт не найден");
  const { error } = await db()
    .from("class_reports")
    .update({ status: "draft", submitted_at: null, updated_at: new Date().toISOString() })
    .eq("id", data.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/admin/reports/${data.period_id}`, "layout");
  return { ok: true, message: "Отчёт возвращён старосте" };
}
