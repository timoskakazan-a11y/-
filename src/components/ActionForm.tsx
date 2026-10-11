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
  /** Компактная форма (кнопка удаления и т.п.) — сообщение об успехе не показываем */
  inline?: boolean;
  /** Панель сохранения сверху (как «Готово» в iOS) с этой подписью кнопки */
  saveBar?: string;
};

const Pending = createContext(false);

/**
 * Форма админки. Отправляем вручную (а не через form action), чтобы
 * React не очищал поля после отправки: при ошибке введённое сохраняется.
 */
export function ActionForm({ action, children, confirm, resetOnSuccess, className, style, inline, saveBar }: Props) {
  const [state, run, pending] = useActionState(action, null);
  const [visible, setVisible] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    setVisible(true);
    if (state.ok) {
      setDirty(false);
      if (resetOnSuccess) ref.current?.reset();
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state, resetOnSuccess]);

  // предупреждение при уходе со страницы с несохранёнными изменениями
  useEffect(() => {
    if (!saveBar || !dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, saveBar]);

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
      onInput={() => saveBar && setDirty(true)}
      onChange={() => saveBar && setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <Pending.Provider value={pending}>
        {saveBar && (
          <div className="savebar">
            <span className="savebar-status">
              {msg ?? (dirty ? <span className="savebar-dirty">Есть несохранённые изменения</span> : <span className="tertiary">Все изменения сохранены</span>)}
            </span>
            <SubmitButton className={dirty ? "btn btn-primary btn-sm" : "btn btn-sm"}>{saveBar}</SubmitButton>
          </div>
        )}
        {children}
        {!saveBar && msg && <div style={{ marginTop: inline ? 6 : 12 }}>{msg}</div>}
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
