"use client";

import { useEffect, useRef, useState } from "react";
import { maxLen, validateAnswers, type Answers, type FormField, type PublicForm } from "@/lib/forms";

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
      <div className="card success" role="status">
        <div className="success-icon">✓</div>
        <h1 style={{ fontSize: "1.8rem" }}>{form.title}</h1>
        <p>{form.success_text}</p>
        <button className="btn btn-ghost" onClick={again}>Отправить ещё один ответ</button>
      </div>
    );
  }

  const busy = phase === "sending" || phase === "retrying" || phase === "offline";

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-head">
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>{form.title}</h1>
        {form.description && <p className="muted" style={{ whiteSpace: "pre-line", margin: 0 }}>{form.description}</p>}
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          🔒 Форма анонимная: мы не спрашиваем имя и не сохраняем ваш IP-адрес.
        </p>
      </div>

      {/* Скрытое поле-ловушка для ботов */}
      <div className="visually-hidden" aria-hidden>
        <label>
          Не заполняйте это поле
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="stack">
        {form.fields.map((f) => (
          <div key={f.id} className="card">
            <Field field={f} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f.id, v)} disabled={busy} />
          </div>
        ))}
      </div>

      {message && <div className="alert alert-err" role="alert" style={{ marginTop: 16 }}>{message}</div>}
      {phase === "retrying" && <div className="alert" style={{ marginTop: 16, background: "var(--accent-soft)" }}>Связь нестабильна, пробуем отправить ещё раз…</div>}
      {phase === "offline" && <div className="alert" style={{ marginTop: 16, background: "var(--accent-soft)" }}>Нет интернета. Ответ отправится автоматически, как только связь появится.</div>}

      <div className="row" style={{ marginTop: 20 }}>
        <button type="submit" className="btn" disabled={busy} style={{ minWidth: 180 }}>
          {busy ? "Отправляем…" : "Отправить"}
        </button>
        <span className="small muted"><span className="req">*</span> — обязательные вопросы</span>
      </div>
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
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
    "aria-required": f.required || undefined,
    disabled,
  };
  const label = (
    <span className="field-label">
      {f.label}
      {f.required && <span className="req" aria-hidden>*</span>}
    </span>
  );
  const err = error ? <div id={errId} className="field-error">{error}</div> : null;
  const str = typeof value === "string" ? value : "";

  if (f.type === "text" || f.type === "textarea") {
    const limit = maxLen(f);
    return (
      <label className="field" htmlFor={id}>
        {label}
        {f.type === "text" ? (
          <input {...common} className="input" value={str} maxLength={limit} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <textarea {...common} className="textarea" value={str} maxLength={limit} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {str.length > limit * 0.8 && <div className="counter">{str.length} / {limit}</div>}
        {err}
      </label>
    );
  }

  if (f.type === "select") {
    return (
      <label className="field" htmlFor={id}>
        {label}
        <select {...common} className="select" value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">— выберите —</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {err}
      </label>
    );
  }

  const multi = f.type === "checkbox";
  const arr = Array.isArray(value) ? value : [];
  return (
    <fieldset id={id} style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={error ? errId : undefined} tabIndex={-1}>
      <legend style={{ padding: 0 }}>{label}</legend>
      {f.options?.map((o) => (
        <label key={o} className="choice">
          <input
            type={multi ? "checkbox" : "radio"}
            name={f.id}
            value={o}
            disabled={disabled}
            checked={multi ? arr.includes(o) : str === o}
            onChange={(e) => {
              if (!multi) return onChange(o);
              onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o));
            }}
          />
          <span>{o}</span>
        </label>
      ))}
      {err}
    </fieldset>
  );
}
