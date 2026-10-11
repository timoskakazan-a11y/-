import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function isAdmin() {
  const c = await cookies();
  return verifySessionToken(c.get(SESSION_COOKIE)?.value);
}

/** Вызывается в КАЖДОМ серверном действии и API админки (не полагаемся только на proxy). */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
