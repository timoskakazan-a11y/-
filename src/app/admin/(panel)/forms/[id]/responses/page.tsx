import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { deleteRow } from "../../../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { fieldsSchema } from "@/lib/forms";
import { fmtDateTime } from "@/lib/time";

const PAGE = 100;

export default async function Responses({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const { data: form } = await db().from("forms").select("id,title,slug,fields").eq("id", id).maybeSingle();
  if (!form) notFound();
  const fields = fieldsSchema.safeParse(form.fields);
  const cols = fields.success ? fields.data : [];

  const { data, count, error } = await db()
    .from("form_responses")
    .select("id,data,created_at", { count: "exact" })
    .eq("form_id", id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const extraKeys = [...new Set((data ?? []).flatMap((r) => Object.keys(r.data ?? {})))].filter((k) => !cols.some((c) => c.id === k));

  return (
    <div className="stack">
      <div className="row">
        <Link href={`/admin/forms/${id}`} className="muted">← К форме</Link>
      </div>
      <div className="row">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Ответы: {form.title}</h1>
        <span className="badge">{count ?? 0}</span>
        <span className="spacer" />
        <a className="btn btn-sm" href={`/api/admin/forms/${id}/export`}>Скачать CSV (Excel)</a>
      </div>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Время</th>
              {cols.map((c) => <th key={c.id}>{c.label}</th>)}
              {extraKeys.map((k) => <th key={k} className="muted">{k} (удалён)</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r, i) => (
              <tr key={r.id}>
                <td className="muted">{(count ?? 0) - (page - 1) * PAGE - i}</td>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td>
                {[...cols.map((c) => c.id), ...extraKeys].map((k) => {
                  const v = r.data?.[k];
                  return <td key={k} className="cell-text">{Array.isArray(v) ? v.join(", ") : v ?? ""}</td>;
                })}
                <td>
                  <ActionForm action={deleteRow} confirm="Удалить этот ответ?" inline>
                    <input type="hidden" name="table" value="form_responses" />
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="btn btn-sm btn-danger" pendingText="…">✕</SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={cols.length + 3} className="muted">Ответов пока нет</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="row">
          {page > 1 && <Link className="btn btn-sm btn-ghost" href={`?page=${page - 1}`}>← Новее</Link>}
          <span className="muted small">Стр. {page} из {pages}</span>
          {page < pages && <Link className="btn btn-sm btn-ghost" href={`?page=${page + 1}`}>Старше →</Link>}
        </div>
      )}
    </div>
  );
}
