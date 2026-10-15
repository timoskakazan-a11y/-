import { requireStaff } from "@/lib/auth";
import Link from "next/link";
import { createForm } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { isAccepting, listFormsWithStats } from "@/lib/admin-data";
import { FormFolder } from "@/components/FormFolder";
import { Icon } from "@/components/Icon";
import { OpenNewOnHash } from "@/components/OpenNewOnHash";

export default async function FormsAdmin({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireStaff("forms");
  const { filter = "all" } = await searchParams;
  const { forms, error } = await listFormsWithStats();
  const open = forms.filter((f) => isAccepting(f, f.responses));
  const closed = forms.filter((f) => !isAccepting(f, f.responses));
  const shown = filter === "open" ? open : filter === "closed" ? closed : forms;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <OpenNewOnHash />
      <h1 className="title-xl" style={{ fontSize: 40 }}>Формы</h1>

      <nav className="chips" aria-label="Фильтр">
        <Link href="?filter=all" className="chip" aria-current={filter === "all" ? "page" : undefined}>Все <span className="count">{forms.length}</span></Link>
        <Link href="?filter=open" className="chip" aria-current={filter === "open" ? "page" : undefined}>Принимают <span className="count">{open.length}</span></Link>
        <Link href="?filter=closed" className="chip" aria-current={filter === "closed" ? "page" : undefined}>Закрыты <span className="count">{closed.length}</span></Link>
      </nav>

      <details id="new" className="disclose card">
        <summary className="row"><Icon name="plus" size={18} weight={2.4} /> Новая форма</summary>
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
      {shown.length === 0 ? (
        <div className="empty">{forms.length === 0 ? "Форм пока нет — создайте первую" : "Здесь пусто"}</div>
      ) : (
        <div className="folders" style={{ marginTop: 8 }}>{shown.map((f) => <FormFolder key={f.id} f={f} />)}</div>
      )}
    </div>
  );
}
