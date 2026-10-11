import Link from "next/link";
import { db } from "@/lib/supabase";
import { fmtDateTime } from "@/lib/time";

export default async function Dashboard() {
  const [forms, stats, events, albums] = await Promise.all([
    db().from("forms").select("id,slug,title,is_open").order("created_at", { ascending: false }),
    db().from("form_stats").select("form_id,responses,last_response_at"),
    db().from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    db().from("albums").select("id", { count: "exact", head: true }),
  ]);
  const err = forms.error || stats.error;
  const statMap = new Map((stats.data ?? []).map((s) => [s.form_id, s]));

  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Обзор</h1>
      {err && <div className="alert alert-err">Ошибка загрузки: {err.message}</div>}
      <div className="grid">
        <div className="card"><div className="muted small">Формы</div><div style={{ fontSize: "2rem", fontWeight: 800 }}>{forms.data?.length ?? "—"}</div></div>
        <div className="card"><div className="muted small">Предстоящие мероприятия</div><div style={{ fontSize: "2rem", fontWeight: 800 }}>{events.count ?? "—"}</div></div>
        <div className="card"><div className="muted small">Альбомы</div><div style={{ fontSize: "2rem", fontWeight: 800 }}>{albums.count ?? "—"}</div></div>
      </div>
      <h2 style={{ marginTop: 32 }}>Формы и ответы</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Форма</th><th>Статус</th><th>Ответов</th><th>Последний ответ</th><th></th></tr></thead>
          <tbody>
            {(forms.data ?? []).map((f) => {
              const s = statMap.get(f.id);
              return (
                <tr key={f.id}>
                  <td><Link href={`/admin/forms/${f.id}`}>{f.title}</Link><div className="muted small">/f/{f.slug}</div></td>
                  <td>{f.is_open ? <span className="badge badge-ok">открыта</span> : <span className="badge badge-muted">закрыта</span>}</td>
                  <td><b>{s?.responses ?? 0}</b></td>
                  <td className="small">{fmtDateTime(s?.last_response_at)}</td>
                  <td><Link className="btn btn-sm btn-ghost" href={`/admin/forms/${f.id}/responses`}>Ответы</Link></td>
                </tr>
              );
            })}
            {forms.data?.length === 0 && <tr><td colSpan={5} className="muted">Форм пока нет</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
