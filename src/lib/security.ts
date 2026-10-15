import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET не задан или короче 32 символов");
  return s;
}

/**
 * IP посетителя. Если сайт стоит за Cloudflare, Vercel видит адрес Cloudflare,
 * а настоящий лежит в CF-Connecting-IP. Этому заголовку верим только когда
 * Cloudflare приложил наш секрет (правило в Cloudflare добавляет заголовок
 * x-ig71-proxy = PROXY_SECRET), иначе его мог бы подделать кто угодно.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const proxySecret = process.env.PROXY_SECRET;
  const cfIp = h.get("cf-connecting-ip");
  if (proxySecret && proxySecret.length >= 16 && cfIp && safeEqual(h.get("x-ig71-proxy") ?? "", proxySecret)) {
    return cfIp.trim();
  }
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Хеш IP с секретной солью: позволяет ограничивать спам, но не хранит сам IP. */
export async function ipHash(): Promise<string> {
  return createHash("sha256").update(`${secret()}:${await clientIp()}`).digest("hex").slice(0, 32);
}

export function hmac(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
