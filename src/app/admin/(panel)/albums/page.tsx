import { db } from "@/lib/supabase";
import { deleteRow, saveAlbum } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { safeUrl } from "@/lib/format";

type Al = { id: string; title: string; url: string; cover_url: string | null; album_date: string | null; is_published: boolean };

function AlbumFields({ a }: { a?: Al }) {
  return (
    <div className="stack">
      {a && <input type="hidden" name="id" value={a.id} />}
      <label className="field"><span className="label">Название</span>
        <input className="input" name="title" required maxLength={200} defaultValue={a?.title} placeholder="Последний звонок 2026" /></label>
      <label className="field"><span className="label">Ссылка на альбом ВК</span>
        <input className="input" type="url" name="url" required defaultValue={a?.url} placeholder="https://vk.com/album-…" /></label>
      <label className="field"><span className="label">Дата</span>
        <input className="input" type="date" name="album_date" defaultValue={a?.album_date ?? ""} /></label>
      <label className="field"><span className="label">Обложка</span>
        <input className="input" type="url" name="cover_url" defaultValue={a?.cover_url ?? ""} placeholder="https://…" />
        <span className="hint">Ссылка на картинку: откройте фото в ВК → долгое нажатие → «Копировать адрес изображения»</span></label>
      <label className="switch">
        <span className="label">Показывать на сайте</span>
        <input type="checkbox" name="is_published" defaultChecked={a ? a.is_published : true} />
        <span className="track" />
      </label>
      <SubmitButton className="btn btn-primary">{a ? "Сохранить" : "Добавить"}</SubmitButton>
    </div>
  );
}

export default async function AlbumsAdmin() {
  const { data, error } = await db()
    .from("albums")
    .select("id,title,url,cover_url,album_date,is_published")
    .order("album_date", { ascending: false, nullsFirst: false })
    .limit(500);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><h1>Альбомы</h1></div>
      <details className="disclose card">
        <summary className="row" style={{ fontWeight: 550 }}><Icon name="plus" size={18} /> Новый альбом</summary>
        <ActionForm action={saveAlbum} resetOnSuccess style={{ marginTop: 16 }}><AlbumFields /></ActionForm>
      </details>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {data?.length === 0 && <div className="empty">Альбомов пока нет</div>}
      {!!data?.length && (
        <div className="list">
          {(data as Al[]).map((a) => {
            const cover = safeUrl(a.cover_url);
            return (
              <details key={a.id} className="disclose">
                <summary className="list-item">
                  <div
                    style={{ width: 48, height: 36, flex: "none", borderRadius: 6, background: `var(--subtle) center/cover no-repeat`, backgroundImage: cover ? `url("${cover.replace(/"/g, "%22")}")` : undefined, display: "grid", placeItems: "center", color: "var(--muted)" }}
                  >
                    {!cover && <Icon name="image" size={16} />}
                  </div>
                  <div className="grow">
                    <div className="truncate" style={{ fontWeight: 550 }}>{a.title}</div>
                    <div className="row xs muted" style={{ marginTop: 4, gap: 8 }}>
                      {a.album_date && <span>{new Date(a.album_date + "T12:00:00").toLocaleDateString("ru-RU")}</span>}
                      {!a.is_published && <span className="pill pill-plain">скрыто</span>}
                    </div>
                  </div>
                  <Icon name="down" className="chev" />
                </summary>
                <div style={{ padding: "0 16px 16px" }}>
                  <ActionForm action={saveAlbum}><AlbumFields a={a} /></ActionForm>
                  <ActionForm action={deleteRow} confirm="Удалить альбом?" style={{ marginTop: 8 }}>
                    <input type="hidden" name="table" value="albums" />
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="btn btn-danger btn-block" pendingText="Удаляем…">Удалить</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
