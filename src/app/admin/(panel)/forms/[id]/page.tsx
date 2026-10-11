import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { deleteRow, saveForm, toggleForm } from "../../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { FieldsBuilder } from "@/components/FieldsBuilder";
import { CopyLink } from "@/components/CopyLink";
import { fieldsSchema } from "@/lib/forms";
import { isoToLocal } from "@/lib/time";

export default async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { data: f, error } = await db().from("forms").select("*").eq("id", id).maybeSingle();
  if (error) return <div className="alert alert-err">Ошибка загрузки: {error.message}</div>;
  if (!f) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${proto}://${host}/f/${f.slug}`;
  const fields = fieldsSchema.safeParse(f.fields);

  return (
    <div className="stack">
      <div className="row">
        <Link href="/admin/forms" className="muted">← Все формы</Link>
        <span className="spacer" />
        <Link href={`/admin/forms/${f.id}/responses`} className="btn btn-sm btn-ghost">Ответы →</Link>
      </div>
      <h1 style={{ fontSize: "2rem", margin: 0 }}>{f.title}</h1>

      <div className="card row">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="muted small">Ссылка для учеников</div>
          <CopyLink url={publicUrl} />
        </div>
        {f.is_open ? <span className="badge badge-ok">приём открыт</span> : <span className="badge badge-muted">приём закрыт</span>}
        <ActionForm action={toggleForm} inline>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="open" value={f.is_open ? "false" : "true"} />
          <SubmitButton className={f.is_open ? "btn btn-sm btn-ghost" : "btn btn-sm"} pendingText="…">
            {f.is_open ? "Закрыть приём" : "Открыть приём"}
          </SubmitButton>
        </ActionForm>
      </div>

      <ActionForm action={saveForm} className="stack">
        <input type="hidden" name="id" value={f.id} />
        <div className="card form-grid">
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Настройки</h2>
          <div className="form-grid two">
            <label className="field"><span className="field-label">Название*</span>
              <input className="input" name="title" required maxLength={200} defaultValue={f.title} /></label>
            <label className="field"><span className="field-label">Адрес ссылки*</span>
              <input className="input" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,60}" defaultValue={f.slug} /></label>
          </div>
          <label className="field"><span className="field-label">Описание</span>
            <textarea className="textarea" name="description" maxLength={3000} defaultValue={f.description} /></label>
          <label className="field"><span className="field-label">Текст после отправки*</span>
            <input className="input" name="success_text" required maxLength={500} defaultValue={f.success_text} /></label>
          <div className="form-grid two">
            <label className="field"><span className="field-label">Закрыть автоматически (Казань)</span>
              <input className="input" type="datetime-local" name="closes_at" defaultValue={isoToLocal(f.closes_at)} /></label>
            <label className="field"><span className="field-label">Максимум ответов</span>
              <input className="input" type="number" min={1} name="max_responses" defaultValue={f.max_responses ?? ""} placeholder="без ограничений" /></label>
          </div>
          <label className="check"><input type="checkbox" name="is_open" defaultChecked={f.is_open} /> Принимать ответы</label>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.3rem" }}>Вопросы</h2>
          {!fields.success && <div className="alert alert-err">Вопросы в базе повреждены — пересоберите их ниже.</div>}
          <FieldsBuilder initial={fields.success ? fields.data : []} />
        </div>

        <div className="row" style={{ position: "sticky", bottom: 12, zIndex: 5 }}>
          <SubmitButton>Сохранить форму</SubmitButton>
        </div>
      </ActionForm>

      <ActionForm action={deleteRow} confirm="Удалить форму ВМЕСТЕ СО ВСЕМИ ОТВЕТАМИ? Это нельзя отменить." style={{ marginTop: 40 }}>
        <input type="hidden" name="table" value="forms" />
        <input type="hidden" name="id" value={f.id} />
        <SubmitButton className="btn btn-sm btn-danger" pendingText="Удаляем…">Удалить форму</SubmitButton>
      </ActionForm>
    </div>
  );
}
