"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, isDbConfigured, withRetry } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";
import { ipHash, safeEqual } from "@/lib/security";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/session";
import { codeHash, normalizeCode } from "@/lib/people";
import { fieldsSchema } from "@/lib/forms";
import { localToIso } from "@/lib/time";

export type ActionResult = { ok: boolean; message?: string } | null;

const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message = "Сохранено"): ActionResult => ({ ok: true, message });

function errText(e: unknown) {
  const msg = (e as { message?: string; code?: string })?.message ?? "";
  if ((e as { code?: string })?.code === "23505") return "Такое значение уже используется (например, адрес формы).";
  if ((e as { code?: string })?.code === "23514") return "Проверьте поля: какое-то значение не подходит.";
  console.error(e);
  return msg ? `Ошибка базы данных: ${msg}` : "Ошибка базы данных";
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

const httpsUrl = z.string().trim().url().refine((u) => u.startsWith("https://"), "Нужна ссылка https://");
const optUrl = z.union([z.literal(""), httpsUrl]).transform((v) => v || null);
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const uuid = z.string().uuid();

// ---------------- Вход / выход ----------------

async function failsSince(filter: { ip?: string; subject?: string }, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  let q = db().from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("success", false).gte("created_at", since);
  if (filter.ip) q = q.eq("ip_hash", filter.ip);
  if (filter.subject) q = q.eq("subject", filter.subject);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Журнал попыток не должен мешать входу: при сбое БД просто пропускаем */
async function logAttempt(ip: string, success: boolean, subject: string | null) {
  try {
    await db().from("admin_login_attempts").insert({ ip_hash: ip, success, subject });
  } catch (e) {
    console.error("login attempts log", e);
  }
}

async function setSession(token: string, maxAge: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

const slowDown = () => new Promise((r) => setTimeout(r, 700));

/** Вход главного администратора по паролю из ADMIN_PASSWORD */
export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const password = String(fd.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return fail("Админка не настроена: задайте ADMIN_PASSWORD (минимум 8 символов).");

  const hash = await ipHash();
  const dbReady = isDbConfigured();
  if (dbReady) try {
    if ((await failsSince({ ip: hash, subject: "owner" })) >= 8) return fail("Слишком много попыток. Подождите 15 минут.");
  } catch (e) {
    console.error("login attempts check", e);
  }

  const ok = safeEqual(password, expected);
  if (dbReady) await logAttempt(hash, ok, "owner");
  if (!ok) {
    await slowDown();
    return fail("Неверный пароль");
  }
  await setSession(createSessionToken("owner", "owner"), SESSION_TTL_SECONDS);
  redirect("/admin");
}

/** Вход педагога или куратора по личному коду */
export async function loginWithCode(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!isDbConfigured()) return fail("База данных ещё не подключена");
  const raw = String(fd.get("code") ?? "");
  if (normalizeCode(raw).length !== 8) return fail("Код — это 8 букв и цифр, например ABCD-2345");

  const hash = await ipHash();
  try {
    if ((await failsSince({ ip: hash, subject: "staff" })) >= 20) return fail("Слишком много попыток. Подождите 15 минут.");
  } catch (e) {
    console.error("login attempts check", e);
  }

  const { data, error } = await db().from("staff").select("id,is_active").eq("code_hash", codeHash(raw)).maybeSingle();
  if (error) return fail("Не получилось проверить код. Попробуйте ещё раз.");
  const ok = !!data && data.is_active;
  await logAttempt(hash, ok, "staff");
  if (!ok) {
    await slowDown();
    return fail(data ? "Этот код отключён. Обратитесь к администратору." : "Неверный код");
  }
  await db().from("staff").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);
  await setSession(createSessionToken("staff", data.id), SESSION_TTL_SECONDS);
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------------- Мероприятия ----------------

const eventSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  description: z.string().trim().max(5000).default(""),
  starts_at: z.string().transform((v, ctx) => {
    const iso = localToIso(v);
    if (!iso) ctx.addIssue({ code: "custom", message: "Укажите дату и время" });
    return iso ?? "";
  }),
  location: z.string().trim().max(200).default(""),
  link_url: optUrl,
  is_published: bool,
});

export async function saveEvent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("events");
  const parsed = eventSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const id = fd.get("id");
  try {
    await withRetry(async () => {
      const q = id
        ? db().from("events").update(parsed.data).eq("id", uuid.parse(id))
        : db().from("events").insert(parsed.data);
      const { error } = await q;
      if (error) throw error;
    }, 2);
  } catch (e) {
    return fail(errText(e));
  }
  refreshPublic();
  revalidatePath("/admin/events");
  return done(id ? "Изменения сохранены" : "Мероприятие добавлено");
}

// ---------------- Альбомы ----------------

const albumSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  url: httpsUrl,
  cover_url: optUrl,
  album_date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((v) => v || null),
  is_published: bool,
});

export async function saveAlbum(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("albums");
  const parsed = albumSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const id = fd.get("id");
  try {
    await withRetry(async () => {
      const q = id
        ? db().from("albums").update(parsed.data).eq("id", uuid.parse(id))
        : db().from("albums").insert(parsed.data);
      const { error } = await q;
      if (error) throw error;
    }, 2);
  } catch (e) {
    return fail(errText(e));
  }
  refreshPublic();
  revalidatePath("/admin/albums");
  return done(id ? "Изменения сохранены" : "Альбом добавлен");
}

// ---------------- Удаление ----------------

const TABLES = { events: "events", albums: "albums", forms: "forms", form_responses: "forms" } as const;

export async function deleteRow(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const table = String(fd.get("table")) as keyof typeof TABLES;
  if (!(table in TABLES)) return fail("Неизвестная таблица");
  await requireStaff(TABLES[table]);
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const { error } = await db().from(table).delete().eq("id", id.data);
  if (error) return fail(errText(error));
  refreshPublic();
  revalidatePath("/admin", "layout");
  if (table === "forms") redirect("/admin/forms");
  return done("Удалено");
}

// ---------------- Формы ----------------

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,60}$/, "Адрес: только латиница, цифры и дефис (2–61 символ)");

export async function createForm(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("forms");
  const parsed = z
    .object({ title: z.string().trim().min(1, "Введите название").max(200), slug: slugSchema })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const { data, error } = await db()
    .from("forms")
    .insert({
      ...parsed.data,
      is_open: true,
      fields: [{ id: "q1", type: "text", label: "Новый вопрос", required: true }],
    })
    .select("id")
    .single();
  if (error) return fail(errText(error));
  redirect(`/admin/forms/${data.id}`);
}

const fieldsJson = z.string().transform((v, ctx) => {
  try {
    const r = fieldsSchema.safeParse(JSON.parse(v));
    if (!r.success) {
      const issue = r.error.issues[0];
      const idx = typeof issue?.path[0] === "number" ? `Вопрос ${issue.path[0] + 1}: ` : "";
      const msg = issue?.path.includes("label") ? "введите текст вопроса" : issue?.message ?? "ошибка";
      ctx.addIssue({ code: "custom", message: idx + msg });
      return [];
    }
    if (r.data.length === 0) ctx.addIssue({ code: "custom", message: "Добавьте хотя бы один вопрос" });
    return r.data;
  } catch {
    ctx.addIssue({ code: "custom", message: "Ошибка в вопросах" });
    return [];
  }
});

async function updateForm(id: string, patch: Record<string, unknown>): Promise<ActionResult> {
  try {
    await withRetry(async () => {
      const { error } = await db()
        .from("forms")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    }, 2);
  } catch (e) {
    return fail(errText(e));
  }
  revalidatePath("/admin", "layout");
  return done("Сохранено");
}

export async function saveFormFields(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("forms");
  const parsed = z.object({ id: uuid, fields: fieldsJson }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте вопросы");
  return updateForm(parsed.data.id, { fields: parsed.data.fields });
}

const formSettingsSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, "Введите название").max(200),
  slug: slugSchema,
  description: z.string().trim().max(3000).default(""),
  success_text: z.string().trim().min(1, "Введите текст после отправки").max(500),
  is_open: bool,
  closes_at: z.union([z.literal(""), z.string()]).transform((v, ctx) => {
    if (!v) return null;
    const iso = localToIso(v);
    if (!iso) ctx.addIssue({ code: "custom", message: "Неверная дата закрытия" });
    return iso;
  }),
  max_responses: z
    .union([z.literal(""), z.coerce.number().int().positive("Максимум ответов — положительное число").max(1_000_000)])
    .transform((v) => (v === "" ? null : v)),
});

export async function saveFormSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("forms");
  const parsed = formSettingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const { id, ...rest } = parsed.data;
  return updateForm(id, rest);
}

export async function toggleForm(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireStaff("forms");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const open = fd.get("open") === "true";
  const { error } = await db().from("forms").update({ is_open: open }).eq("id", id.data);
  if (error) return fail(errText(error));
  revalidatePath("/admin", "layout");
  return done(open ? "Приём ответов открыт" : "Приём ответов закрыт");
}
