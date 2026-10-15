import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { PERMS, PERM_KEYS, type Perm } from "@/lib/people";
import { siteHost } from "@/lib/host";
import { fmtDateTime } from "@/lib/time";
import { createStaff, deleteStaff, regenerateCode, updateStaff } from "@/app/admin/people-actions";
import { PeopleForm } from "@/components/PeopleForm";
import { SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { Disclose } from "@/components/Disclose";

export const metadata: Metadata = { title: "Команда" };

type Staff = { id: string; full_name: string; position: string; permissions: string[]; classes: string[]; is_active: boolean; last_login_at: string | null };

function StaffFields({ s }: { s?: Staff }) {
  const has = (p: Perm) => (s ? s.permissions.includes(p) : p === "reports" || p === "heads");
  return (
    <div className="stack">
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="field"><span className="label">ФИО</span>
        <input className="input" name="full_name" required maxLength={120} defaultValue={s?.full_name} placeholder="Петрова Анна Сергеевна" autoComplete="off" /></label>
      <label className="field"><span className="label">Должность или задача</span>
        <input className="input" name="position" maxLength={120} defaultValue={s?.position} placeholder="Педагог-организатор, куратор 5-х классов" /></label>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">Что можно делать</legend>
        <div className="perm-grid">
          {PERM_KEYS.map((p) => (
            <label key={p} className="perm">
              <input type="checkbox" name="perm" value={p} defaultChecked={has(p)} />
              <span>{PERMS[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field"><span className="label">Классы</span>
        <input className="input" name="classes" defaultValue={s?.classes.join(", ")} placeholder="Все классы" />
        <span className="hint">Пусто — видит все классы. Например: «5А, 5Б» или «5, 6» — целые параллели.</span></label>
      {s && (
        <label className="switch">
          <span className="label">Доступ включён</span>
          <input type="checkbox" name="is_active" defaultChecked={s.is_active} />
          <span className="track" />
        </label>
      )}
      <SubmitButton className="btn btn-primary">{s ? "Сохранить" : "Добавить и получить код"}</SubmitButton>
    </div>
  );
}

export default async function TeamPage() {
  await requireOwner();
  const host = await siteHost();
  const loginUrl = `${host}/admin/login`;
  const { data, error } = await db()
    .from("staff")
    .select("id,full_name,position,permissions,classes,is_active,last_login_at")
    .order("created_at", { ascending: true });
  const staff = (data ?? []) as Staff[];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="adm-head">
        <h1>Команда</h1>
        <p>Педагоги и кураторы входят на <b>{loginUrl}</b> по личному коду. Вы решаете, какие разделы и классы им видны.</p>
      </header>

      <Disclose initialOpen={staff.length === 0} summary={<><Icon name="plus" size={18} /> Добавить сотрудника</>}>
        <PeopleForm action={createStaff} loginUrl={loginUrl} resetOnSuccess className="stack" >
          <div style={{ marginTop: 16 }}><StaffFields /></div>
        </PeopleForm>
      </Disclose>

      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      {staff.length > 0 && (
        <div className="list">
          {staff.map((s) => (
            <details key={s.id} className="disclose">
              <summary className="list-item">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 600 }}>{s.full_name}</div>
                  <div className="xs muted truncate" style={{ marginTop: 2 }}>{s.position || "Без должности"}</div>
                  <div className="tagline">
                    {!s.is_active && <span className="pill pill-warn">отключён</span>}
                    {s.permissions.map((p) => <span key={p} className="pill pill-plain">{PERMS[p as Perm] ?? p}</span>)}
                    <span className="pill pill-plain">{s.classes.length ? `Классы: ${s.classes.join(", ")}` : "Все классы"}</span>
                  </div>
                  <div className="xs muted" style={{ marginTop: 6 }}>{s.last_login_at ? `Входил ${fmtDateTime(s.last_login_at)}` : "Ещё не входил"}</div>
                </div>
                <Icon name="down" className="chev" />
              </summary>
              <div style={{ padding: "0 16px 16px" }} className="stack">
                <PeopleForm action={updateStaff} loginUrl={loginUrl}><StaffFields s={s} /></PeopleForm>
                <PeopleForm action={regenerateCode} loginUrl={loginUrl} confirm="Выдать новый код? Старый перестанет работать." inline>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton className="btn btn-block" pendingText="Создаём…">Выдать новый код</SubmitButton>
                </PeopleForm>
                <PeopleForm action={deleteStaff} loginUrl={loginUrl} confirm="Удалить сотрудника?" inline>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton className="btn btn-danger btn-block" pendingText="Удаляем…">Удалить</SubmitButton>
                </PeopleForm>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
