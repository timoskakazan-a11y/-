import { db } from "@/lib/supabase";
import { deleteRow, saveAlbum } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

type Al = { id: string; title: string; url: string; cover_url: string | null; album_date: string | null; is_published: boolean };

function AlbumFields({ a }: { a?: Al }) {
  return (
    <div className="form-grid">
      {a && <input type="hidden" name="id" value={a.id} />}
      <label className="field"><span className="field-label">Название*</span>
        <input className="input" name="title" required maxLength={200} defaultValue={a?.title} placeholder="Последний звонок 2026" /></label>
      <label className="field"><span className="field-label">Ссылка на альбом ВК*</span>
        <input className="input" type="url" name="url" required defaultValue={a?.url} placeholder="https://vk.com/album-..." /></label>
      <div className="form-grid two">
        <label className="field"><span className="field-label">Дата</span>
          <input className="input" type="date" name="album_date" defaultValue={a?.album_date ?? ""} /></label>
        <label className="field"><span className="field-label">Обложка (ссылка на картинку, https://)</span>
          <input className="input" type="url" name="cover_url" defaultValue={a?.cover_url ?? ""} placeholder="https://sun9-...userapi.com/..." /></label>
      </div>
      <label className="check"><input type="checkbox" name="is_published" defaultChecked={a ? a.is_published : true} /> Показывать на сайте</label>
      <div><SubmitButton>{a ? "Сохранить" : "Добавить альбом"}</SubmitButton></div>
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
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Фотоархив</h1>
      <p className="muted">Совет: обложку можно взять, открыв фото в ВК → правый клик → «Копировать адрес изображения».</p>
      <div className="card">
        <h2 style={{ fontSize: "1.2rem" }}>＋ Новый альбом</h2>
        <ActionForm action={saveAlbum} resetOnSuccess><AlbumFields /></ActionForm>
      </div>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {(data as Al[] | null)?.map((a) => (
        <details key={a.id} className="card">
          <summary className="row">
            <span>{a.title}</span>
            {a.album_date && <span className="muted small" style={{ fontWeight: 500 }}>{a.album_date}</span>}
            {!a.is_published && <span className="badge badge-muted">скрыто</span>}
          </summary>
          <ActionForm action={saveAlbum}><AlbumFields a={a} /></ActionForm>
          <ActionForm action={deleteRow} confirm="Удалить альбом?" style={{ marginTop: 12 }}>
            <input type="hidden" name="table" value="albums" />
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton className="btn btn-sm btn-danger" pendingText="Удаляем…">Удалить</SubmitButton>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
