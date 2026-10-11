import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { isAccepting } from "@/lib/admin-data";
import { Icon } from "./Icon";
import { plural } from "./FormListItem";

export type FullForm = {
  id: string;
  slug: string;
  title: string;
  description: string;
  fields: unknown;
  is_open: boolean;
  closes_at: string | null;
  max_responses: number | null;
  success_text: string;
};

export async function loadForm(id: string) {
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [{ data, error }, { count }] = await Promise.all([
    db().from("forms").select("id,slug,title,description,fields,is_open,closes_at,max_responses,success_text").eq("id", id).maybeSingle(),
    db().from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", id),
  ]);
  if (error) throw error;
  if (!data) notFound();
  return { form: data as FullForm, responses: count ?? 0 };
}

export async function publicUrl(slug: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}/f/${slug}`;
}

const TABS = [
  { key: "questions", label: "Вопросы", path: "" },
  { key: "responses", label: "Ответы", path: "/responses" },
  { key: "settings", label: "Настройки", path: "/settings" },
] as const;

export function FormHeader({ form, responses, active }: { form: FullForm; responses: number; active: (typeof TABS)[number]["key"] }) {
  const open = isAccepting(form, responses);
  return (
    <div className="form-head">
      <Link href="/admin/forms" className="back"><Icon name="chevronLeft" size={20} weight={2.2} /> Формы</Link>
      <h1 className="form-head-title">{form.title}</h1>
      <div className="form-head-meta">
        {open ? <span className="pill pill-ok">Принимает ответы</span> : <span className="pill">Приём закрыт</span>}
        <span>{responses} {plural(responses, "ответ", "ответа", "ответов")}</span>
      </div>
      <nav className="segmented" aria-label="Разделы формы">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/forms/${form.id}${t.path}`} aria-current={t.key === active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
