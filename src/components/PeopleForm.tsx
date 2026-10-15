"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { Cred, PeopleResult } from "@/app/admin/people-actions";
import { Icon } from "./Icon";

type Props = {
  action: (prev: PeopleResult, fd: FormData) => Promise<PeopleResult>;
  children: React.ReactNode;
  /** Где входить: для карточек старост и сотрудников */
  loginUrl: string;
  confirm?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Компактная форма-кнопка: сообщение об успехе не показываем, только данные входа */
  inline?: boolean;
};

/**
 * Форма для команды и старост. Если действие вернуло данные входа
 * (код или пароль), показывает их один раз — с копированием и печатью.
 */
export function PeopleForm({ action, children, loginUrl, confirm, className, resetOnSuccess, inline }: Props) {
  const [state, run, pending] = useActionState(action, null);
  const [asking, setAsking] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  const submit = () => {
    if (!ref.current) return;
    const fd = new FormData(ref.current);
    startTransition(() => run(fd));
  };

  return (
    <>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm) setAsking(true);
          else submit();
        }}
        aria-busy={pending}
      >
        <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "contents" }}>{children}</fieldset>
        {asking && (
          <div className="confirm-row" role="alertdialog" aria-label={confirm}>
            <span>{confirm}</span>
            <button type="button" className="btn btn-sm" onClick={() => setAsking(false)}>Отмена</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => { setAsking(false); submit(); }}>Да</button>
          </div>
        )}
        {state && state.message && !(inline && state.ok && !state.creds) && (
          <div className={state.ok ? "alert alert-ok" : "alert alert-err"} role={state.ok ? "status" : "alert"} style={{ marginTop: 12 }}>
            {state.message}
          </div>
        )}
      </form>
      {state?.creds && state.creds.length > 0 && <CredSheet creds={state.creds} loginUrl={loginUrl} />}
    </>
  );
}

function CredSheet({ creds, loginUrl }: { creds: Cred[]; loginUrl: string }) {
  const [copied, setCopied] = useState(false);
  const text = creds
    .map((c) => (c.kind === "code"
      ? `${c.name}\nВход: ${loginUrl}\nКод: ${c.secret}`
      : `${c.cls} · ${c.name}\nВход: ${loginUrl}\nЛогин: ${c.login}\nПароль: ${c.secret}`))
    .join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="creds" aria-label="Данные для входа">
      <div className="creds-head">
        <div>
          <h3>Данные для входа</h3>
          <p>Сохраните или распечатайте сейчас: потом {creds[0].kind === "code" ? "код" : "пароль"} увидеть нельзя, только выдать новый.</p>
        </div>
        <div className="creds-actions">
          <button type="button" className="btn btn-sm" onClick={copy}><Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Скопировано" : "Скопировать"}</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}><Icon name="download" size={16} /> Печать</button>
        </div>
      </div>
      <div className="creds-grid print-area">
        {creds.map((c, i) => (
          <article key={i} className="cred-card">
            <div className="cred-top">
              <span className="cred-kicker">{c.kind === "code" ? "Код доступа сотрудника" : `Староста · ${c.cls}`}</span>
              <b>{c.name}</b>
            </div>
            <dl>
              <div><dt>Сайт</dt><dd>{loginUrl}</dd></div>
              {c.login && <div><dt>Логин</dt><dd className="mono">{c.login}</dd></div>}
              <div><dt>{c.kind === "code" ? "Код" : "Пароль"}</dt><dd className="mono">{c.secret}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
