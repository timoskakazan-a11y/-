import { db } from "@/lib/supabase";
import { deleteRow, saveEvent } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { fmtDateTime, isoToLocal } from "@/lib/time";

type Ev = { id: string; title: string; description: string; starts_at: string; location: string; link_url: string | null; is_published: boolean };

function EventFields({ e }: { e?: Ev }) {
  return (
    <div className="form-grid">
      {e && <input type="hidden" name="id" value={e.id} />}
      <label className="field"><span className="field-label">Название*</span>
        <input className="input" name="title" required maxLength={200} defaultValue={e?.title} /></label>
      <div className="form-grid two">
        <label className="field"><span className="field-label">Дата и время (Казань)*</span>
          <input className="input" type="datetime-local" name="starts_at" required defaultValue={isoToLocal(e?.starts_at)} /></label>
        <label className="field"><span className="field-label">Место</span>
          <input className="input" name="location" maxLength={200} defaultValue={e?.location} placeholder="Актовый зал" /></label>
      </div>
      <label className="field"><span className="field-label">Описание</span>
        <textarea className="textarea" name="description" maxLength={5000} defaultValue={e?.description} /></label>
      <label className="field"><span className="field-label">Ссылка (необязательно, https://)</span>
        <input className="input" type="url" name="link_url" defaultValue={e?.link_url ?? ""} placeholder="https://vk.com/..." /></label>
      <label className="check"><input type="checkbox" name="is_published" defaultChecked={e ? e.is_published : true} /> Показывать на сайте</label>
      <div><SubmitButton>{e ? "Сохранить" : "Добавить мероприятие"}</SubmitButton></div>
    </div>
  );
}

export default async function EventsAdmin() {
  const { data, error } = await db()
    .from("events")
    .select("id,title,description,starts_at,location,link_url,is_published")
    .order("starts_at", { ascending: false })
    .limit(300);

  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Мероприятия</h1>
      <div className="card">
        <h2 style={{ fontSize: "1.2rem" }}>＋ Новое мероприятие</h2>
        <ActionForm action={saveEvent} resetOnSuccess><EventFields /></ActionForm>
      </div>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {(data as Ev[] | null)?.map((e) => (
        <details key={e.id} className="card">
          <summary className="row">
            <span>{e.title}</span>
            <span className="muted small" style={{ fontWeight: 500 }}>{fmtDateTime(e.starts_at)}</span>
            {!e.is_published && <span className="badge badge-muted">скрыто</span>}
            {new Date(e.starts_at) < new Date() && <span className="badge badge-muted">прошло</span>}
          </summary>
          <ActionForm action={saveEvent}><EventFields e={e} /></ActionForm>
          <ActionForm action={deleteRow} confirm="Удалить мероприятие?" style={{ marginTop: 12 }}>
            <input type="hidden" name="table" value="events" />
            <input type="hidden" name="id" value={e.id} />
            <SubmitButton className="btn btn-sm btn-danger" pendingText="Удаляем…">Удалить</SubmitButton>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
