import { loadForm, FormHeader } from "@/components/FormHeader";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { isoToLocal } from "@/lib/time";
import { deleteRow, saveFormSettings } from "@/app/admin/actions";

export default async function FormSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { form, responses } = await loadForm(id);

  return (
    <div>
      <FormHeader form={form} responses={responses} active="settings" />

      <ActionForm action={saveFormSettings} sticky="Сохранить" className="stack" style={{ gap: 20 }}>
        <input type="hidden" name="id" value={form.id} />

        <div className="card stack">
          <label className="field">
            <span className="label">Название</span>
            <input className="input" name="title" required maxLength={200} defaultValue={form.title} />
          </label>
          <label className="field">
            <span className="label">Описание</span>
            <textarea className="textarea" name="description" maxLength={3000} defaultValue={form.description} placeholder="Что нужно сделать, для чего собираем ответы" />
          </label>
          <label className="field">
            <span className="label">Текст после отправки</span>
            <input className="input" name="success_text" required maxLength={500} defaultValue={form.success_text} />
          </label>
        </div>

        <div className="card stack">
          <label className="switch">
            <span>
              <span className="label" style={{ display: "block" }}>Принимать ответы</span>
              <span className="hint">Если выключить, форма покажет «Приём закрыт»</span>
            </span>
            <input type="checkbox" name="is_open" defaultChecked={form.is_open} />
            <span className="track" />
          </label>
          <label className="field">
            <span className="label">Закрыть автоматически</span>
            <input className="input" type="datetime-local" name="closes_at" defaultValue={isoToLocal(form.closes_at)} />
            <span className="hint">По времени Казани. Пусто — не закрывать.</span>
          </label>
          <label className="field">
            <span className="label">Максимум ответов</span>
            <input className="input" type="number" inputMode="numeric" min={1} name="max_responses" defaultValue={form.max_responses ?? ""} placeholder="Без ограничений" />
          </label>
        </div>

        <div className="card stack">
          <label className="field">
            <span className="label">Адрес ссылки</span>
            <input className="input" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,60}" defaultValue={form.slug} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <span className="hint">Если поменять, старая ссылка перестанет работать.</span>
          </label>
        </div>
      </ActionForm>

      <div className="card stack" style={{ marginTop: 32, borderColor: "color-mix(in srgb, var(--err) 30%, transparent)" }}>
        <div>
          <div className="label">Удалить форму</div>
          <p className="hint" style={{ marginTop: 2 }}>Вместе со всеми ответами ({responses}). Отменить нельзя.</p>
        </div>
        <ActionForm action={deleteRow} confirm="Удалить форму вместе со всеми ответами? Это нельзя отменить.">
          <input type="hidden" name="table" value="forms" />
          <input type="hidden" name="id" value={form.id} />
          <SubmitButton className="btn btn-danger" pendingText="Удаляем…">Удалить форму</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
