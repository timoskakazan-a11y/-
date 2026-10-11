import "server-only";
import { db, isDbConfigured, withRetry } from "./supabase";
import { fieldsSchema, type PublicForm } from "./forms";

export type EventItem = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  location: string;
  link_url: string | null;
};

export type Album = {
  id: string;
  title: string;
  url: string;
  cover_url: string | null;
  album_date: string | null;
};

// Публичные страницы кешируются (ISR). Если при обновлении кеша БД
// недоступна — бросаем ошибку, и Next.js продолжает отдавать последнюю
// удачную версию страницы. Посетители не видят сбоя.
// null — только если БД ещё не подключена (env не заданы).

export async function getUpcomingEvents(limit = 50): Promise<EventItem[] | null> {
  if (!isDbConfigured()) return null;
  try {
    return await withRetry(async () => {
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data, error } = await db()
        .from("events")
        .select("id,title,description,starts_at,location,link_url")
        .eq("is_published", true)
        .gte("starts_at", since)
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    });
  } catch (e) {
    console.error("getUpcomingEvents", e);
    throw new Error("Сбой загрузки данных");
  }
}

export async function getAlbums(limit = 100): Promise<Album[] | null> {
  if (!isDbConfigured()) return null;
  try {
    return await withRetry(async () => {
      const { data, error } = await db()
        .from("albums")
        .select("id,title,url,cover_url,album_date")
        .eq("is_published", true)
        .order("album_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    });
  } catch (e) {
    console.error("getAlbums", e);
    throw new Error("Сбой загрузки данных");
  }
}

export type FormLookup =
  | { status: "ok"; form: PublicForm }
  | { status: "closed"; title: string }
  | { status: "not_found" }
  | { status: "error" };

export async function getPublicForm(slug: string): Promise<FormLookup> {
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) return { status: "not_found" };
  if (!isDbConfigured()) return { status: "error" };
  try {
    return await withRetry(async () => {
      const { data, error } = await db()
        .from("forms")
        .select("id,slug,title,description,fields,is_open,closes_at,max_responses,success_text")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { status: "not_found" } as const;
      const closedByTime = data.closes_at && new Date(data.closes_at) <= new Date();
      let full = false;
      if (data.max_responses) {
        const { count, error: cErr } = await db()
          .from("form_responses")
          .select("id", { count: "exact", head: true })
          .eq("form_id", data.id);
        if (cErr) throw cErr;
        full = (count ?? 0) >= data.max_responses;
      }
      if (!data.is_open || closedByTime || full) return { status: "closed", title: data.title } as const;
      const fields = fieldsSchema.safeParse(data.fields);
      if (!fields.success) return { status: "error" } as const;
      return {
        status: "ok",
        form: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          fields: fields.data,
          success_text: data.success_text,
        },
      } as const;
    });
  } catch (e) {
    console.error("getPublicForm", e);
    return { status: "error" };
  }
}
