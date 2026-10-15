"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, isDbConfigured } from "@/lib/supabase";
import { requireHead } from "@/lib/auth";
import { ipHash } from "@/lib/security";
import { DUMMY_HASH, verifyPassword } from "@/lib/people";
import { HEAD_TTL_SECONDS, SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { getPeriod } from "@/lib/reports";

export type HeadLoginResult = { ok: boolean; message?: string } | null;

async function fails(column: "subject" | "ip_hash", value: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error } = await db()
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("success", false)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function headLogin(_: HeadLoginResult, fd: FormData): Promise<HeadLoginResult> {
  if (!isDbConfigured()) return { ok: false, message: "Сайт ещё не настроен" };
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "").trim().toLowerCase();
  if (!login || !password) return { ok: false, message: "Введи логин и пароль" };
  if (login.length > 40 || password.length > 64) return { ok: false, message: "Неверный логин или пароль" };

  const ip = await ipHash();
  const subject = `head:${login}`;
  try {
    // по логину — строго, по IP — мягко: вся школа может быть за одним IP
    if ((await fails("subject", subject)) >= 8) return { ok: false, message: "Слишком много попыток. Подожди 15 минут или попроси учителя сбросить пароль." };
    if ((await fails("ip_hash", ip)) >= 150) return { ok: false, message: "Слишком много попыток. Подожди 15 минут." };
  } catch (e) {
    console.error("head login check", e);
  }

  const { data } = await db().from("class_heads").select("id,password_hash,is_active").eq("login", login).maybeSingle();
  const ok = verifyPassword(password, data?.password_hash ?? DUMMY_HASH) && !!data && data.is_active;
  try {
    await db().from("admin_login_attempts").insert({ ip_hash: ip, success: ok, subject });
  } catch (e) {
    console.error("head login log", e);
  }
  if (!ok || !data) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: false, message: data && !data.is_active ? "Вход отключён. Обратись к учителю." : "Неверный логин или пароль" };
  }
  await db().from("class_heads").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);
  (await cookies()).set(SESSION_COOKIE, createSessionToken("head", data.id, HEAD_TTL_SECONDS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HEAD_TTL_SECONDS,
  });
  redirect("/s");
}

export async function headLogout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/s/login");
}

const itemSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажи дату"),
  title: z.string().trim().min(1, "Напиши название мероприятия").max(200, "Слишком длинное название"),
  participants: z.coerce.number().int().min(1, "Сколько человек ходило? Минимум 1").max(60, "Не больше 60 человек"),
  note: z.string().trim().max(500, "Комментарий слишком длинный").default(""),
  event_id: z.string().uuid().nullable().default(null),
});

export type SaveResult = {
  status: "ok" | "closed" | "late" | "conflict" | "not_found" | "invalid" | "error";
  updated_at?: string;
  message?: string;
};

export async function saveReport(input: { periodId: string; items: unknown; submit: boolean; expected: string | null }): Promise<SaveResult> {
  const head = await requireHead();
  const periodId = z.string().uuid().safeParse(input.periodId);
  if (!periodId.success) return { status: "not_found" };
  const items = z.array(itemSchema).max(100, "Слишком много строк").safeParse(input.items);
  if (!items.success) return { status: "invalid", message: items.error.issues[0]?.message ?? "Проверь записи" };
  if (input.submit && items.data.length === 0) return { status: "invalid", message: "Добавь хотя бы одно мероприятие" };

  const period = await getPeriod(periodId.data);
  if (!period) return { status: "not_found" };
  // дата мероприятия — в пределах месяца отчёта (± неделя на стыке месяцев)
  const from = new Date(`${period.month}T00:00:00Z`).getTime() - 7 * 86400000;
  const to = new Date(`${period.month}T00:00:00Z`);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const bad = items.data.find((i) => {
    const t = new Date(`${i.event_date}T00:00:00Z`).getTime();
    return t < from || t > to.getTime() + 7 * 86400000;
  });
  if (bad) return { status: "invalid", message: `Дата «${bad.title}» не из этого месяца` };

  const rpc = process.env.SUPABASE_SERVICE_ROLE_KEY ? "save_class_report" : "save_class_report_checked";
  const { data, error } = await db().rpc(rpc, {
    p_period: periodId.data,
    p_class: head.class_name,
    p_head: head.id,
    p_items: items.data,
    p_submit: input.submit,
    p_expected: input.expected,
  });
  if (error) {
    console.error("saveReport", error);
    return { status: "error", message: "Не получилось сохранить. Проверь интернет и попробуй ещё раз." };
  }
  // страницу не обновляем: редактор уже держит актуальные данные,
  // а перезагрузка сбросила бы открытую форму
  return data as SaveResult;
}
