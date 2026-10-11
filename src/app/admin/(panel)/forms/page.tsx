import Link from "next/link";
import { db } from "@/lib/supabase";
import { createForm } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export default async function FormsAdmin() {
  const [{ data, error }, stats] = await Promise.all([
    db().from("forms").select("id,slug,title,is_open,closes_at").order("created_at", { ascending: false }),
    db().from("form_stats").select("form_id,responses"),
  ]);
  const counts = new Map((stats.data ?? []).map((s) => [s.form_id, s.responses]));

  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Формы</h1>
      <details className="card">
        <summary>＋ Новая форма</summary>
        <ActionForm action={createForm} className="form-grid">
          <label className="field"><span className="field-label">Название*</span>
            <input className="input" name="title" required maxLength={200} placeholder="Песни для новогодней дискотеки" /></label>
          <label className="field"><span className="field-label">Адрес ссылки* (латиница, цифры, дефис)</span>
            <input className="input" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,60}" placeholder="disco-new-year" /></label>
          <div><SubmitButton pendingText="Создаём…">Создать и настроить</SubmitButton></div>
        </ActionForm>
      </details>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Форма</th><th>Статус</th><th>Ответов</th><th></th></tr></thead>
          <tbody>
            {data?.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/admin/forms/${f.id}`}><b>{f.title}</b></Link><div className="muted small">/f/{f.slug}</div></td>
                <td>{f.is_open ? <span className="badge badge-ok">открыта</span> : <span className="badge badge-muted">закрыта</span>}</td>
                <td>{counts.get(f.id) ?? 0}</td>
                <td className="row" style={{ justifyContent: "flex-end" }}>
                  <Link className="btn btn-sm btn-ghost" href={`/admin/forms/${f.id}`}>Настроить</Link>
                  <Link className="btn btn-sm btn-ghost" href={`/admin/forms/${f.id}/responses`}>Ответы</Link>
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4} className="muted">Форм пока нет — создайте первую</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
