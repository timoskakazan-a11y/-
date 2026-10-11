import { loadForm, FormHeader } from "@/components/FormHeader";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { OptionalField } from "@/components/OptionalField";
import { isoToLocal } from "@/lib/time";
import { deleteRow, saveFormSettings } from "@/app/admin/actions";

export default async function FormSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { form, responses } = await loadForm(id);

  return (
    <div className="narrow-admin">
      <FormHeader form={form} responses={responses} active="settings" />

      <ActionForm action={saveFormSettings} saveBar="Сохранить" className="groups">
        <input type="hidden" name="id" value={form.id} />

        <section>
          <div className="group-title">Форма</div>
          <div className="list">
            <label className="cell cell-field">
              <span className="cell-caption">Название</span>
              <input className="input-bare cell-input" name="title" required maxLength={200} defaultValue={form.title} />
            </label>
            <label className="cell cell-field">
              <span className="cell-caption">Описание</span>
              <textarea className="input-bare cell-input cell-textarea" name="description" maxLength={3000} defaultValue={form.description} placeholder="Для чего собираем ответы" rows={3} />
            </label>
            <label className="cell cell-field">
              <span className="cell-caption">Текст после отправки</span>
              <input className="input-bare cell-input" name="success_text" required maxLength={500} defaultValue={form.success_text} />
            </label>
          </div>
        </section>

        <section>
          <div className="group-title">Приём ответов</div>
          <div className="list">
            <label className="cell cell-inline switch">
              <span>Принимать ответы</span>
              <input type="checkbox" name="is_open" defaultChecked={form.is_open} />
              <span className="track" />
            </label>
            <OptionalField label="Закрыть по дате" name="closes_at" type="datetime-local" defaultValue={isoToLocal(form.closes_at)} />
            <OptionalField label="Лимит ответов" name="max_responses" type="number" min={1} defaultValue={form.max_responses ? String(form.max_responses) : ""} placeholder="Например, 100" />
          </div>
          <p className="group-foot">Когда приём закрыт, по ссылке будет написано «Приём ответов закрыт». Время — по Казани.</p>
        </section>

        <section>
          <div className="group-title">Ссылка</div>
          <div className="list">
            <label className="cell cell-inline">
              <span className="tertiary" style={{ flex: "none" }}>/f/</span>
              <input className="input-bare cell-input" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,60}" defaultValue={form.slug} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Адрес ссылки" />
            </label>
          </div>
          <p className="group-foot">Латиница, цифры и дефис. Если поменять адрес, старая ссылка перестанет работать.</p>
        </section>
      </ActionForm>

      <section style={{ marginTop: 28 }}>
        <div className="list">
          <ActionForm action={deleteRow} confirm={`Удалить форму вместе со всеми ответами (${responses})? Это нельзя отменить.`}>
            <input type="hidden" name="table" value="forms" />
            <input type="hidden" name="id" value={form.id} />
            <SubmitButton className="cell cell-button danger" pendingText="Удаляем…">Удалить форму</SubmitButton>
          </ActionForm>
        </div>
        <p className="group-foot">Форма удалится вместе со всеми ответами. Скачайте Excel заранее, если ответы нужны.</p>
      </section>
    </div>
  );
}
