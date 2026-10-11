"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/app/admin/actions";

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  resetOnSuccess?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Компактная форма в одну строку (кнопка удаления и т.п.) — сообщение об успехе не показываем */
  inline?: boolean;
  /** Липкая панель сохранения внизу экрана с этой кнопкой */
  sticky?: React.ReactNode;
};

const Pending = createContext(false);

/**
 * Форма админки. Отправляем вручную (а не через form action), чтобы
 * React не очищал поля после отправки: при ошибке введённое сохраняется.
 */
export function ActionForm({ action, children, confirm, resetOnSuccess, className, style, inline, sticky }: Props) {
  const [state, run, pending] = useActionState(action, null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    setVisible(true);
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.ok) {
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state, resetOnSuccess]);

  const msg = visible && state?.message && !(inline && state.ok) ? (
    <div className={`alert ${state.ok ? "alert-ok" : "alert-err"}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </div>
  ) : null;

  return (
    <form
      ref={ref}
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <Pending.Provider value={pending}>
        {children}
        {sticky ? (
          <div className="sticky-save" style={{ marginTop: 16 }}>
            {msg ?? <span className="spacer" />}
            <SubmitButton className="btn btn-primary">{sticky}</SubmitButton>
          </div>
        ) : (
          msg && <div style={{ marginTop: inline ? 6 : 12 }}>{msg}</div>
        )}
      </Pending.Provider>
    </form>
  );
}

export function SubmitButton({ children, className = "btn", pendingText = "Сохраняем…", title }: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  title?: string;
}) {
  const pending = useContext(Pending);
  return (
    <button type="submit" className={className} disabled={pending} title={title} aria-label={title}>
      {pending ? pendingText : children}
    </button>
  );
}
