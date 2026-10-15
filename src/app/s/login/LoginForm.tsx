"use client";

import { startTransition, useActionState, useState } from "react";
import { headLogin } from "../actions";
import { Icon } from "@/components/Icon";

export function LoginForm() {
  const [state, run, pending] = useActionState(headLogin, null);
  const [show, setShow] = useState(false);
  return (
    <form
      className="kid-form"
      onSubmit={(e) => {
        // вручную, чтобы при ошибке введённый логин не стирался
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <label className="kid-field">
        <span>Логин</span>
        <input name="login" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="ivanova.5a" inputMode="email" />
      </label>
      <label className="kid-field">
        <span>Пароль</span>
        <div className="kid-pass">
          <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="sova1234" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Скрыть пароль" : "Показать пароль"}>{show ? "Скрыть" : "Показать"}</button>
        </div>
      </label>
      {state?.message && <div className="kid-error" role="alert"><Icon name="x" size={16} /> {state.message}</div>}
      <button className="kid-btn" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
      <p className="kid-hint">Логин и пароль даёт учитель. Если забыл — попроси выдать новый.</p>
    </form>
  );
}
