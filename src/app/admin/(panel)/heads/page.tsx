import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listHeads, type HeadRow } from "@/lib/reports";
import { siteHost } from "@/lib/host";
import { fmtDateTime } from "@/lib/time";
import { createHeads, deleteHead, resetHeadPassword, updateHead } from "@/app/admin/people-actions";
import { PeopleForm } from "@/components/PeopleForm";
import { SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { Disclose } from "@/components/Disclose";
import { HeadsNav } from "@/components/HeadsNav";
import { plural } from "@/components/FormListItem";

export const metadata: Metadata = { title: "Старосты" };

function HeadItem({ h, loginUrl }: { h: HeadRow; loginUrl: string }) {
  return (
    <details className="disclose">
      <summary className="list-item">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="truncate" style={{ fontWeight: 600 }}>{h.full_name}</div>
          <div className="row xs muted" style={{ marginTop: 2, gap: 8 }}>
            <span className="mono">{h.login}</span>
            <span>·</span>
            <span>{h.last_login_at ? `входил ${fmtDateTime(h.last_login_at)}` : "ещё не входил"}</span>
            {!h.is_active && <span className="pill pill-warn">отключён</span>}
          </div>
        </div>
        <Icon name="down" className="chev" />
      </summary>
      <div style={{ padding: "0 16px 16px" }} className="stack">
        <PeopleForm action={updateHead} loginUrl={loginUrl} className="stack">
          <input type="hidden" name="id" value={h.id} />
          <div className="grid-2">
            <label className="field"><span className="label">ФИО</span>
              <input className="input" name="full_name" required maxLength={120} defaultValue={h.full_name} /></label>
            <label className="field"><span className="label">Класс</span>
              <input className="input" name="class_name" required maxLength={4} defaultValue={h.class_name} /></label>
          </div>
          <label className="switch">
            <span className="label">Может входить</span>
            <input type="checkbox" name="is_active" defaultChecked={h.is_active} />
            <span className="track" />
          </label>
          <SubmitButton className="btn btn-primary">Сохранить</SubmitButton>
        </PeopleForm>
        <PeopleForm action={resetHeadPassword} loginUrl={loginUrl} confirm="Выдать новый пароль? Старый перестанет работать." inline>
          <input type="hidden" name="id" value={h.id} />
          <SubmitButton className="btn btn-block" pendingText="Создаём…">Новый пароль</SubmitButton>
        </PeopleForm>
        <PeopleForm action={deleteHead} loginUrl={loginUrl} confirm="Удалить старосту? Его отчёты останутся." inline>
          <input type="hidden" name="id" value={h.id} />
          <SubmitButton className="btn btn-danger btn-block" pendingText="Удаляем…">Удалить</SubmitButton>
        </PeopleForm>
      </div>
    </details>
  );
}

export default async function HeadsPage() {
  const actor = await requireStaff("heads");
  const host = await siteHost();
  const loginUrl = `${host}/s`;
  const heads = await listHeads(actor.classes);
  const groups = new Map<string, HeadRow[]>();
  for (const h of heads) groups.set(h.class_name, [...(groups.get(h.class_name) ?? []), h]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="adm-head">
        <h1>Старосты</h1>
        <p>Старосты входят на <b>{loginUrl}</b> по логину и паролю и заполняют отчёт о мероприятиях класса.
          {actor.classes && <> Ваши классы: <b>{actor.classes.join(", ")}</b>.</>}</p>
      </header>
      <HeadsNav actor={actor} active="heads" />

      <Disclose initialOpen={heads.length === 0} summary={<><Icon name="plus" size={18} /> Добавить старост</>}>
        <PeopleForm action={createHeads} loginUrl={loginUrl} resetOnSuccess className="stack">
          <label className="field" style={{ marginTop: 16 }}>
            <span className="label">Класс и ФИО — по одному на строку</span>
            <textarea className="textarea mono" name="list" required rows={6} placeholder={"5А Иванова Мария\n5Б Петров Артём\n6А Сидорова Ева"} />
            <span className="hint">Можно вставить список из таблицы. Логины и пароли придумаются сами — их сразу можно распечатать и раздать.</span>
          </label>
          <SubmitButton className="btn btn-primary" pendingText="Создаём…">Создать и показать пароли</SubmitButton>
        </PeopleForm>
      </Disclose>

      {heads.length === 0 ? (
        <div className="empty">Старост пока нет</div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          <p className="xs muted">{groups.size} {plural(groups.size, "класс", "класса", "классов")} · {heads.length} {plural(heads.length, "староста", "старосты", "старост")}</p>
          {[...groups].map(([cls, list]) => (
            <section key={cls}>
              <div className="group-title"><span className="class-badge">{cls}</span></div>
              <div className="list">{list.map((h) => <HeadItem key={h.id} h={h} loginUrl={loginUrl} />)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
