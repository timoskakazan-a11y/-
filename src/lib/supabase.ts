import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Два режима доступа к БД (оба только на сервере):
 * 1) SUPABASE_SERVICE_ROLE_KEY — полный ключ, RLS обходится;
 * 2) SUPABASE_ANON_KEY + SUPABASE_SERVER_SECRET — публичный ключ плюс
 *    секретный заголовок x-mc71-key; RLS пускает только с ним
 *    (см. supabase/server_access.sql).
 */
function credentials() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serverSecret = process.env.SUPABASE_SERVER_SECRET;
  if (!url) return null;
  if (serviceKey) return { url, key: serviceKey, headers: {} as Record<string, string> };
  if (anonKey && serverSecret) return { url, key: anonKey, headers: { "x-mc71-key": serverSecret } };
  return null;
}

export function isDbConfigured() {
  return credentials() !== null;
}

/** Имя RPC для записи ответа зависит от режима доступа. */
export function submitRpcName() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? "submit_form_response" : "submit_form_response_checked";
}

/**
 * Серверный клиент Supabase. Импортируется только на сервере ("server-only"),
 * ключи и секрет в браузер не попадают.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const c = credentials();
  if (!c) throw new Error("Supabase не настроен: нет SUPABASE_URL и ключа доступа");
  client = createClient(c.url, c.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: c.headers,
      // жёсткий таймаут, чтобы запрос не «висел» бесконечно
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    },
  });
  return client;
}

/** Повтор операции при временных сбоях сети/БД с экспоненциальной паузой. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    }
  }
  throw lastError;
}
