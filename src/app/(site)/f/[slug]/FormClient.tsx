"use client";

import { useEffect, useRef, useState } from "react";
import { maxLen, validateAnswers, type Answers, type FormField, type PublicForm } from "@/lib/forms";
import { Icon } from "@/components/Icon";

type Phase = "idle" | "sending" | "retrying" | "offline" | "done";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function newToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // запасной вариант для старых браузеров
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
}

export function FormClient({ form }: { form: PublicForm }) {
  const draftKey = `mc71:draft:${form.slug}`;
  const tokenKey = `mc71:token:${form.slug}`;

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  // Восстанавливаем черновик — ответ не потеряется при случайном обновлении страницы
  useEffect(() => {
    try {
      const raw = store("local")?.getItem(draftKey);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
    loaded.current = true;
  }, [draftKey]);

  useEffect(() => {
    if (!loaded.current || phase === "done") return;
    try {
      store("local")?.setItem(draftKey, JSON.stringify(answers));
    } catch {}
  }, [answers, draftKey, phase]);

  function token() {
    const s = store("session");
    let t = s?.getItem(tokenKey);
    if (!t) {
      t = newToken();
      s?.setItem(tokenKey, t);
    }
    return t;
  }

  function set(id: string, v: string | string[]) {
    setAnswers((a) => ({ ...a, [id]: v }));
    if (errors[id]) setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (phase === "sending" || phase === "retrying") return;
    setMessage(null);

    const check = validateAnswers(form.fields, answers);
    if (!check.ok) {
      setErrors(check.errors);
      const first = form.fields.find((f) => check.errors[f.id]);
      if (first) document.getElementById(`f-${first.id}`)?.focus();
      return;
    }

    // Один и тот же token на все повторы: сервер не создаст дубль
    const payload = JSON.stringify({ token: token(), answers: check.data, website: honeypot.current?.value ?? "" });
    setPhase("sending");

    const MAX_ATTEMPTS = 6;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setPhase("offline");
        await new Promise<void>((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
        setPhase("retrying");
      }
      try {
        const res = await fetch(`/api/forms/${encodeURIComponent(form.slug)}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: AbortSignal.timeout(20_000),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.ok) {
          try {
            store("local")?.removeItem(draftKey);
            store("session")?.removeItem(tokenKey);
          } catch {}
          setPhase("done");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (res.status === 422 && body.fields) {
          setErrors(body.fields);
          setPhase("idle");
          return;
        }
        if (res.status < 500 && res.status !== 408) {
          // 4xx — повтор не поможет (форма закрыта, лимит и т.п.)
          setMessage(body.error || "Не удалось отправить ответ.");
          setPhase("idle");
          return;
        }
      } catch {
        // сеть оборвалась или таймаут — пробуем ещё раз
      }
      if (attempt < MAX_ATTEMPTS) {
        setPhase("retrying");
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 10_000));
      }
    }
    setPhase("idle");
    setMessage("Не получилось отправить из-за проблем со связью. Ваши ответы сохранены — нажмите «Отправить» ещё раз.");
  }

  function again() {
    setAnswers({});
    setErrors({});
    setMessage(null);
    setPhase("idle");
  }

  if (phase === "done") {
    return (
      <div className="fx-card fx-done" role="status">
        <div className="fx-done-icon"><Icon name="check" size={30} weight={2.6} /></div>
        <h1 className="fx-title" style={{ textAlign: "center" }}>{form.success_text}</h1>
        <p className="fx-desc" style={{ textAlign: "center" }}>{form.title}</p>
        <button className="fx-submit fx-submit-ghost" onClick={again}>Отправить ещё один ответ</button>
      </div>
    );
  }

  const busy = phase === "sending" || phase === "retrying" || phase === "offline";
  const hasAnswers = Object.values(answers).some((v) => (Array.isArray(v) ? v.length : v));

  return (
    <form onSubmit={onSubmit} noValidate className="fx-card">
      <div className="fx-bar">
        <span className="fx-bar-item"><Icon name="lock" size={15} /> Анонимно</span>
        {hasAnswers && !busy && (
          <button type="button" className="fx-bar-item fx-bar-btn" onClick={again}>
            <Icon name="eraser" size={16} /> Очистить
          </button>
        )}
      </div>

      <h1 className="fx-title">{form.title}</h1>
      {form.description && <p className="fx-desc">{form.description}</p>}

      {/* Скрытое поле-ловушка для ботов */}
      <div className="visually-hidden" aria-hidden>
        <label>
          Не заполняйте это поле
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="fx-fields">
        {form.fields.map((f) => (
          <Field key={f.id} field={f} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f.id, v)} disabled={busy} />
        ))}
      </div>

      {message && <div className="alert alert-err" role="alert" style={{ marginTop: 20 }}>{message}</div>}
      {phase === "retrying" && <div className="alert alert-info" style={{ marginTop: 20 }}>Связь нестабильна — пробуем отправить ещё раз…</div>}
      {phase === "offline" && <div className="alert alert-info" style={{ marginTop: 20 }}>Нет интернета. Ответ отправится сам, когда связь появится.</div>}

      <button type="submit" className="fx-submit" disabled={busy}>
        {busy ? "Отправляем…" : "Отправить"}
      </button>
      <p className="fx-note">Имя и IP-адрес не сохраняются</p>
    </form>
  );
}

function Field({ field: f, value, error, onChange, disabled }: {
  field: FormField;
  value: string | string[] | undefined;
  error?: string;
  onChange: (v: string | string[]) => void;
  disabled: boolean;
}) {
  const id = `f-${f.id}`;
  const errId = `${id}-err`;
  const str = typeof value === "string" ? value : "";
  const legend = (
    <span className="fx-legend">
      {f.label}
      {f.required && <span className="req" aria-hidden>*</span>}
    </span>
  );
  const err = error ? <div id={errId} className="fx-error">{error}</div> : null;
  const aria = {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
    "aria-required": f.required || undefined,
  };

  // текст: поле с рамкой и подписью, врезанной в рамку
  if (f.type === "text" || f.type === "textarea") {
    const limit = maxLen(f);
    return (
      <div className="fx-item">
        <label className={`fx-box${error ? " invalid" : ""}`} htmlFor={id}>
          <span className="fx-main">
          {legend}
          {f.type === "text" ? (
            <input id={id} {...aria} disabled={disabled} className="fx-input" value={str} maxLength={limit}
              placeholder={f.placeholder ?? "Ваш ответ"} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <textarea id={id} {...aria} disabled={disabled} className="fx-input fx-textarea" value={str} maxLength={limit}
              placeholder={f.placeholder ?? "Ваш ответ"} onChange={(e) => onChange(e.target.value)} />
          )}
          </span>
          {str && !disabled && (
            <button type="button" className="fx-clear" onClick={(e) => { e.preventDefault(); onChange(""); }} aria-label="Очистить поле"><Icon name="x" size={14} weight={2.6} /></button>
          )}
        </label>
        {str.length > limit * 0.8 && <div className="counter">{str.length} / {limit}</div>}
        {err}
      </div>
    );
  }

  // выпадающий список: выбранное значение — чипсом, нативный выбор поверх
  if (f.type === "select") {
    return (
      <div className="fx-item">
        <div className={`fx-box fx-select${error ? " invalid" : ""}`}>
          <span className="fx-main">
            {legend}
            <span className="fx-value">
              {str ? <span className="fx-tag">{str}</span> : <span className="fx-placeholder">Выберите</span>}
            </span>
          </span>
          {str && !disabled && (
            <button type="button" className="fx-clear" onClick={() => onChange("")} aria-label="Сбросить выбор"><Icon name="x" size={14} weight={2.6} /></button>
          )}
          <span className="fx-chevron" aria-hidden><Icon name="down" size={18} /></span>
          <select id={id} {...aria} disabled={disabled} className="fx-native" value={str} onChange={(e) => onChange(e.target.value)}>
            <option value="">Выберите</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {err}
      </div>
    );
  }

  // варианты: контурные капсулы, выбранные — голубые с галочкой
  const multi = f.type === "checkbox";
  const arr = Array.isArray(value) ? value : [];
  return (
    <fieldset id={id} className={`fx-item fx-group${error ? " invalid" : ""}`} aria-describedby={error ? errId : undefined} tabIndex={-1}>
      <legend className="fx-group-label">
        {f.label}
        {f.required && <span className="req" aria-hidden>*</span>}
        {multi && <span className="fx-hint"> · можно несколько</span>}
      </legend>
      <div className="fx-pills">
        {f.options?.map((o) => {
          const checked = multi ? arr.includes(o) : str === o;
          return (
            <label key={o} className={`fx-pill${checked ? " on" : ""}`}>
              <input type={multi ? "checkbox" : "radio"} name={f.id} value={o} disabled={disabled} checked={checked}
                onChange={(e) => (multi ? onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o)) : onChange(o))} />
              {checked && <Icon name="check" size={16} weight={2.6} />}
              <span>{o}</span>
            </label>
          );
        })}
      </div>
      {err}
    </fieldset>
  );
}
