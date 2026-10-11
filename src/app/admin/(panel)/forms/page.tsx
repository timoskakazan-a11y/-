import { createForm } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { listFormsWithStats } from "@/lib/admin-data";
import { FormListItem } from "@/components/FormListItem";
import { Icon } from "@/components/Icon";

export default async function FormsAdmin() {
  const { forms, error } = await listFormsWithStats();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><h1>Формы</h1></div>

      <details className="disclose card" open={forms.length === 0}>
        <summary className="row" style={{ fontWeight: 550 }}>
          <Icon name="plus" size={18} /> Новая форма
        </summary>
        <ActionForm action={createForm} className="stack" style={{ marginTop: 16 }}>
          <label className="field">
            <span className="label">Название</span>
            <input className="input" name="title" required maxLength={200} placeholder="Песни для новогодней дискотеки" />
          </label>
          <label className="field">
            <span className="label">Адрес ссылки</span>
            <input className="input" name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,60}" placeholder="new-year" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <span className="hint">Латиница, цифры и дефис. Ссылка будет: сайт/f/new-year</span>
          </label>
          <SubmitButton className="btn btn-primary" pendingText="Создаём…">Создать</SubmitButton>
        </ActionForm>
      </details>

      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {forms.length > 0 && <div className="list">{forms.map((f) => <FormListItem key={f.id} f={f} />)}</div>}
    </div>
  );
}
