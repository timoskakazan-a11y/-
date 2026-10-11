import { db } from "@/lib/supabase";
import { deleteRow, saveEvent } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { fmtDateTime, isoToLocal } from "@/lib/time";

type Ev = { id: string; title: string; description: string; starts_at: string; location: string; link_url: string | null; is_published: boolean };

function EventFields({ e }: { e?: Ev }) {
  return (
    <div className="stack">
      {e && <input type="hidden" name="id" value={e.id} />}
      <label className="field"><span className="label">Название</span>
        <input className="input" name="title" required maxLength={200} defaultValue={e?.title} placeholder="Осенний бал" /></label>
      <label className="field"><span className="label">Дата и время</span>
        <input className="input" type="datetime-local" name="starts_at" required defaultValue={isoToLocal(e?.starts_at)} /></label>
      <label className="field"><span className="label">Место</span>
        <input className="input" name="location" maxLength={200} defaultValue={e?.location} placeholder="Актовый зал" /></label>
      <label className="field"><span className="label">Описание</span>
        <textarea className="textarea" name="description" maxLength={5000} defaultValue={e?.description} /></label>
      <label className="field"><span className="label">Ссылка</span>
        <input className="input" type="url" name="link_url" defaultValue={e?.link_url ?? ""} placeholder="https://vk.com/…" />
        <span className="hint">Необязательно — например, пост ВК с подробностями</span></label>
      <label className="switch">
        <span className="label">Показывать на сайте</span>
        <input type="checkbox" name="is_published" defaultChecked={e ? e.is_published : true} />
        <span className="track" />
      </label>
      <SubmitButton className="btn btn-primary">{e ? "Сохранить" : "Добавить"}</SubmitButton>
    </div>
  );
}

export default async function EventsAdmin() {
  const { data, error } = await db()
    .from("events")
    .select("id,title,description,starts_at,location,link_url,is_published")
    .order("starts_at", { ascending: false })
    .limit(300);
  const now = new Date();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><h1>События</h1></div>
      <details className="disclose card">
        <summary className="row" style={{ fontWeight: 550 }}><Icon name="plus" size={18} /> Новое событие</summary>
        <ActionForm action={saveEvent} resetOnSuccess style={{ marginTop: 16 }}><EventFields /></ActionForm>
      </details>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {data?.length === 0 && <div className="empty">Событий пока нет</div>}
      {!!data?.length && (
        <div className="list">
          {(data as Ev[]).map((e) => (
            <details key={e.id} className="disclose">
              <summary className="list-item">
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 550 }}>{e.title}</div>
                  <div className="row xs muted" style={{ marginTop: 4, gap: 8 }}>
                    <span>{fmtDateTime(e.starts_at)}</span>
                    {!e.is_published && <span className="pill pill-plain">скрыто</span>}
                    {new Date(e.starts_at) < now && <span className="pill pill-plain">прошло</span>}
                  </div>
                </div>
                <Icon name="down" className="chev" />
              </summary>
              <div style={{ padding: "0 16px 16px" }}>
                <ActionForm action={saveEvent}><EventFields e={e} /></ActionForm>
                <ActionForm action={deleteRow} confirm="Удалить событие?" style={{ marginTop: 8 }}>
                  <input type="hidden" name="table" value="events" />
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="btn btn-danger btn-block" pendingText="Удаляем…">Удалить</SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
