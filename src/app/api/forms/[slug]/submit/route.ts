import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, isDbConfigured, submitRpcName, withRetry } from "@/lib/supabase";
import { fieldsSchema, validateAnswers } from "@/lib/forms";
import { ipHash } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY = 64 * 1024;

const bodySchema = z.object({
  token: z.string().uuid(),
  answers: z.record(z.unknown()),
  website: z.string().optional(), // honeypot: люди это поле не видят
});

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) return json(404, { error: "Форма не найдена" });

  // Принимаем отправку только с нашего же сайта
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json(403, { error: "Запрещено" });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "Слишком большой ответ" });

  let parsed: z.infer<typeof bodySchema>;
  try {
    const r = bodySchema.safeParse(JSON.parse(raw));
    if (!r.success) return json(400, { error: "Неверный формат запроса" });
    parsed = r.data;
  } catch {
    return json(400, { error: "Неверный формат запроса" });
  }

  // Бот заполнил скрытое поле — делаем вид, что всё хорошо, но не сохраняем
  if (parsed.website) return json(200, { ok: true });

  if (!isDbConfigured()) return json(503, { error: "Сервис временно недоступен", retry: true });

  try {
    const { data: form, error } = await withRetry(async () => {
      const r = await db().from("forms").select("fields").eq("slug", slug).maybeSingle();
      if (r.error) throw r.error;
      return r;
    });
    if (error || !form) return json(404, { error: "Форма не найдена" });

    const fields = fieldsSchema.safeParse(form.fields);
    if (!fields.success) return json(500, { error: "Ошибка настройки формы" });

    const check = validateAnswers(fields.data, parsed.answers);
    if (!check.ok) return json(422, { error: "Проверьте ответы", fields: check.errors });

    const hash = await ipHash();
    // Повтор безопасен: благодаря token запись не задвоится
    const status = await withRetry(async () => {
      const { data, error: rpcErr } = await db().rpc(submitRpcName(), {
        p_slug: slug,
        p_data: check.data,
        p_client_token: parsed.token,
        p_ip_hash: hash,
      });
      if (rpcErr) throw rpcErr;
      return data as string;
    });

    switch (status) {
      case "ok":
      case "duplicate":
        return json(200, { ok: true });
      case "not_found":
        return json(404, { error: "Форма не найдена" });
      case "closed":
      case "full":
        return json(410, { error: "Приём ответов закрыт" });
      case "rate_limited":
        return json(429, { error: "Слишком много ответов подряд. Попробуйте позже." });
      default:
        throw new Error(`Неожиданный статус: ${status}`);
    }
  } catch (e) {
    console.error("submit", slug, e);
    return json(503, { error: "Не удалось сохранить ответ. Попробуйте ещё раз.", retry: true });
  }
}

export function GET() {
  return json(405, { error: "Method not allowed" });
}
