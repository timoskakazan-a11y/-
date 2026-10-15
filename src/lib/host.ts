import "server-only";
import { headers } from "next/headers";

/** Адрес сайта без протокола, как его видит пользователь: ig71.ru */
export async function siteHost() {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "ig71.ru").split(",")[0].trim();
}
