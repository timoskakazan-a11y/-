import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Серверный клиент Supabase с service_role ключом.
 * Импортируется только на сервере ("server-only"), в браузер не попадает.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase не настроен: нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
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
