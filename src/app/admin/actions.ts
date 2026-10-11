"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, isDbConfigured, withRetry } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { ipHash, safeEqual } from "@/lib/security";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/session";
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

export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const password = String(fd.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return fail("Админка не настроена: задайте ADMIN_PASSWORD (минимум 8 символов).");

  const hash = await ipHash();
  const dbReady = isDbConfigured();
  if (dbReady) try {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await db()
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", hash)
      .eq("success", false)
      .gte("created_at", since);
    if ((count ?? 0) >= 8) return fail("Слишком много попыток. Подождите 15 минут.");
  } catch (e) {
    console.error("login attempts check", e);
  }

  const ok = safeEqual(password, expected);
  // Журнал попыток не должен мешать входу: при сбое БД просто пропускаем
  if (dbReady) {
    try {
      await db().from("admin_login_attempts").insert({ ip_hash: hash, success: ok });
    } catch (e) {
      console.error("login attempts log", e);
    }
  }

  if (!ok) {
    await new Promise((r) => setTimeout(r, 800));
    return fail("Неверный пароль");
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
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
  await requireAdmin();
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
  await requireAdmin();
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

const TABLES = { events: "/admin/events", albums: "/admin/albums", forms: "/admin/forms", form_responses: null } as const;

export async function deleteRow(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const table = String(fd.get("table")) as keyof typeof TABLES;
  if (!(table in TABLES)) return fail("Неизвестная таблица");
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
  await requireAdmin();
  const parsed = z
    .object({ title: z.string().trim().min(1, "Введите название").max(200), slug: slugSchema })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const { data, error } = await db()
    .from("forms")
    .insert({
      ...parsed.data,
      is_open: false,
      fields: [{ id: "q1", type: "text", label: "Ваш ответ", required: true }],
    })
    .select("id")
    .single();
  if (error) return fail(errText(error));
  redirect(`/admin/forms/${data.id}`);
}

const formSettingsSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, "Введите название").max(200),
  slug: slugSchema,
  description: z.string().trim().max(3000).default(""),
  success_text: z.string().trim().min(1).max(500),
  is_open: bool,
  closes_at: z.union([z.literal(""), z.string()]).transform((v, ctx) => {
    if (!v) return null;
    const iso = localToIso(v);
    if (!iso) ctx.addIssue({ code: "custom", message: "Неверная дата закрытия" });
    return iso;
  }),
  max_responses: z
    .union([z.literal(""), z.coerce.number().int().positive().max(1_000_000)])
    .transform((v) => (v === "" ? null : v)),
  fields: z.string().transform((v, ctx) => {
    try {
      const r = fieldsSchema.safeParse(JSON.parse(v));
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: r.error.issues[0]?.message ?? "Ошибка в вопросах" });
        return [];
      }
      if (r.data.length === 0) ctx.addIssue({ code: "custom", message: "Добавьте хотя бы один вопрос" });
      return r.data;
    } catch {
      ctx.addIssue({ code: "custom", message: "Ошибка в вопросах" });
      return [];
    }
  }),
});

export async function saveForm(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = formSettingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля");
  const { id, ...rest } = parsed.data;
  try {
    await withRetry(async () => {
      const { error } = await db()
        .from("forms")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    }, 2);
  } catch (e) {
    return fail(errText(e));
  }
  revalidatePath("/admin", "layout");
  return done("Форма сохранена");
}

export async function toggleForm(_: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return fail("Неверный id");
  const open = fd.get("open") === "true";
  const { error } = await db().from("forms").update({ is_open: open }).eq("id", id.data);
  if (error) return fail(errText(error));
  revalidatePath("/admin", "layout");
  return done(open ? "Приём ответов открыт" : "Приём ответов закрыт");
}
