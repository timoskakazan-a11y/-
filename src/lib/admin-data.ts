import "server-only";
import { db } from "./supabase";

export type FormRow = {
  id: string;
  slug: string;
  title: string;
  is_open: boolean;
  closes_at: string | null;
  max_responses: number | null;
};

export async function listFormsWithStats() {
  const [forms, stats] = await Promise.all([
    db().from("forms").select("id,slug,title,is_open,closes_at,max_responses").order("created_at", { ascending: false }),
    db().from("form_stats").select("form_id,responses,last_response_at"),
  ]);
  const map = new Map((stats.data ?? []).map((s) => [s.form_id as string, s as { responses: number; last_response_at: string | null }]));
  return {
    error: forms.error ?? stats.error,
    forms: ((forms.data ?? []) as FormRow[]).map((f) => ({
      ...f,
      responses: map.get(f.id)?.responses ?? 0,
      last_response_at: map.get(f.id)?.last_response_at ?? null,
    })),
  };
}

/** Фактически ли форма принимает ответы прямо сейчас */
export function isAccepting(f: { is_open: boolean; closes_at: string | null; max_responses: number | null }, responses: number) {
  if (!f.is_open) return false;
  if (f.closes_at && new Date(f.closes_at) <= new Date()) return false;
  if (f.max_responses && responses >= f.max_responses) return false;
  return true;
}
