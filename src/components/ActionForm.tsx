"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { ActionResult } from "@/app/admin/actions";

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  resetOnSuccess?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
};

const Pending = createContext(false);

/**
 * Форма админки. Отправляем вручную (а не через form action), чтобы
 * React не очищал поля после отправки: при ошибке введённое сохраняется.
 */
export function ActionForm({ action, children, confirm, resetOnSuccess, className, style, inline }: Props) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      style={inline ? { display: "inline-flex", gap: 8, alignItems: "center", ...style } : style}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state?.message && (
        <div
          className={`alert ${state.ok ? "alert-ok" : "alert-err"}`}
          role={state.ok ? "status" : "alert"}
          style={inline ? { padding: "4px 10px", fontSize: ".85rem" } : { marginTop: 12 }}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}

export function SubmitButton({ children, className = "btn", pendingText = "Сохраняем…" }: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const pending = useContext(Pending);
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
