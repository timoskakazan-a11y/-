import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "./session";
import { db, isDbConfigured } from "./supabase";
import { PERM_KEYS, inScope, type Perm } from "./people";

export type Actor = {
  role: "owner" | "staff";
  id: string;
  name: string;
  position: string;
  perms: Perm[];
  /** null — все классы */
  classes: string[] | null;
};

export type Head = { id: string; full_name: string; class_name: string; login: string };

const OWNER: Actor = { role: "owner", id: "owner", name: "Администратор", position: "Полный доступ", perms: PERM_KEYS, classes: null };

export async function getSession() {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Текущий сотрудник; для педагога проверяем в базе, что доступ не отозван. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const s = await getSession();
  if (!s || s.role === "head") return null;
  if (s.role === "owner") return OWNER;
  if (!isDbConfigured()) return null;
  const { data, error } = await db()
    .from("staff")
    .select("id,full_name,position,permissions,classes,is_active")
    .eq("id", s.uid)
    .maybeSingle();
  if (error) throw new Error("Не удалось проверить доступ");
  if (!data || !data.is_active) return null;
  return {
    role: "staff",
    id: data.id,
    name: data.full_name,
    position: data.position,
    perms: (data.permissions as string[]).filter((p): p is Perm => (PERM_KEYS as string[]).includes(p)),
    classes: (data.classes as string[]).length ? (data.classes as string[]) : null,
  };
});

export function can(a: Actor | null, perm: Perm) {
  return !!a && a.perms.includes(perm);
}

export function seesClass(a: Actor, cls: string) {
  return inScope(a.classes, cls);
}

export async function isAdmin() {
  return (await getActor()) !== null;
}

/**
 * Вызывается в КАЖДОМ серверном действии, странице и API админки
 * (не полагаемся только на proxy). Без нужного раздела — на обзор.
 */
export async function requireStaff(perm?: Perm): Promise<Actor> {
  const a = await getActor();
  if (!a) redirect("/admin/login");
  if (perm && !a.perms.includes(perm)) redirect("/admin?denied=1");
  return a;
}

/** Только главный администратор (управление командой) */
export async function requireOwner(): Promise<Actor> {
  const a = await requireStaff();
  if (a.role !== "owner") redirect("/admin?denied=1");
  return a;
}

/** @deprecated оставлено для совместимости: любой сотрудник */
export async function requireAdmin() {
  await requireStaff();
}

export const getHead = cache(async (): Promise<Head | null> => {
  const s = await getSession();
  if (!s || s.role !== "head" || !isDbConfigured()) return null;
  const { data, error } = await db()
    .from("class_heads")
    .select("id,full_name,class_name,login,is_active")
    .eq("id", s.uid)
    .maybeSingle();
  if (error) throw new Error("Не удалось проверить доступ");
  if (!data || !data.is_active) return null;
  return { id: data.id, full_name: data.full_name, class_name: data.class_name, login: data.login };
});

export async function requireHead(): Promise<Head> {
  const h = await getHead();
  if (!h) redirect("/s/login");
  return h;
}
