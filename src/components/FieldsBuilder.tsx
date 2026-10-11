"use client";

import { useState } from "react";
import { FIELD_TYPES, LIMITS, type FieldType, type FormField } from "@/lib/forms";
import { Icon } from "./Icon";

const withOptions = (t: FieldType) => t === "select" || t === "radio" || t === "checkbox";

function nextId(fields: FormField[]) {
  let n = fields.length + 1;
  const ids = new Set(fields.map((f) => f.id));
  while (ids.has(`q${n}`)) n++;
  return `q${n}`;
}

export function FieldsBuilder({ initial, hasResponses }: { initial: FormField[]; hasResponses?: boolean }) {
  const [fields, setFields] = useState<FormField[]>(initial);

  const update = (i: number, patch: Partial<FormField>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const j = i + d;
      if (j < 0 || j >= fs.length) return fs;
      const c = [...fs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const remove = (i: number) => {
    if (hasResponses && !window.confirm("Удалить вопрос? Уже собранные ответы на него останутся в выгрузке, но пропадут из сводки.")) return;
    setFields((fs) => fs.filter((_, j) => j !== i));
  };
  const add = () =>
    setFields((fs) => (fs.length >= LIMITS.fields ? fs : [...fs, { id: nextId(fs), type: "text", label: "", required: false }]));

  const setType = (i: number, type: FieldType) => {
    const f = fields[i];
    update(i, { type, options: withOptions(type) ? (f.options?.length ? f.options : ["Вариант 1"]) : f.options });
  };
  const setOption = (i: number, k: number, v: string) =>
    update(i, { options: (fields[i].options ?? []).map((o, j) => (j === k ? v : o)) });
  const addOption = (i: number) => {
    const opts = fields[i].options ?? [];
    if (opts.length < LIMITS.options) update(i, { options: [...opts, `Вариант ${opts.length + 1}`] });
  };
  const removeOption = (i: number, k: number) =>
    update(i, { options: (fields[i].options ?? []).filter((_, j) => j !== k) });

  // Чистим данные перед отправкой на сервер
  const serialized = JSON.stringify(
    fields.map((f) => {
      const out: FormField = { id: f.id, type: f.type, label: f.label.trim(), required: f.required };
      if (f.placeholder?.trim() && !withOptions(f.type)) out.placeholder = f.placeholder.trim();
      if ((f.type === "text" || f.type === "textarea") && f.maxLength) out.maxLength = f.maxLength;
      if (withOptions(f.type)) out.options = [...new Set((f.options ?? []).map((o) => o.trim()).filter(Boolean))];
      return out;
    }),
  );

  return (
    <div className="stack" style={{ gap: 12 }}>
      <input type="hidden" name="fields" value={serialized} />
      {fields.length === 0 && <div className="empty">Нет вопросов — добавьте первый</div>}

      {fields.map((f, i) => (
        <div key={f.id} className="qcard">
          <div className="qcard-top">
            <span className="qcard-head"><span className="qnum">{i + 1}</span>Вопрос</span>
            <select className="type-select" value={f.type} aria-label="Тип ответа" onChange={(e) => setType(i, e.target.value as FieldType)}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <textarea
            className="input-bare qcard-title"
            value={f.label}
            maxLength={LIMITS.label}
            rows={1}
            placeholder="Текст вопроса"
            aria-label={`Текст вопроса ${i + 1}`}
            onChange={(e) => update(i, { label: e.target.value.replace(/\n/g, " ") })}
          />

          {withOptions(f.type) ? (
            <div className="opts">
              {(f.options ?? []).map((o, k) => (
                <div key={k} className="opt">
                  <span className={`opt-mark ${f.type === "checkbox" ? "sq" : ""}`} aria-hidden />
                  <input
                    className="input-bare opt-input"
                    value={o}
                    maxLength={LIMITS.option}
                    placeholder={`Вариант ${k + 1}`}
                    aria-label={`Вариант ${k + 1}`}
                    onChange={(e) => setOption(i, k, e.target.value)}
                  />
                  <button type="button" className="opt-remove" onClick={() => removeOption(i, k)} aria-label="Удалить вариант" title="Удалить вариант">
                    <Icon name="x" size={14} weight={2.6} />
                  </button>
                </div>
              ))}
              <button type="button" className="opt opt-add" onClick={() => addOption(i)} disabled={(f.options ?? []).length >= LIMITS.options}>
                <span className="opt-mark add" aria-hidden><Icon name="plus" size={14} weight={2.6} /></span>
                Добавить вариант
              </button>
            </div>
          ) : (
            <div className="answer-preview">{f.type === "textarea" ? "Развёрнутый ответ…" : "Короткий ответ…"}</div>
          )}

          <div className="qcard-foot">
            <label className="switch" style={{ gap: 10, justifyContent: "flex-start" }}>
              <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} />
              <span className="track" />
              <span style={{ fontSize: 15 }}>Обязательный</span>
            </label>
            <span className="spacer" />
            <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше" title="Выше"><Icon name="up" size={20} /></button>
            <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Ниже" title="Ниже"><Icon name="down" size={20} /></button>
            <button type="button" className="icon-btn danger" onClick={() => remove(i)} aria-label="Удалить вопрос" title="Удалить вопрос"><Icon name="trash" size={19} /></button>
          </div>
        </div>
      ))}

      <button type="button" className="add-question" onClick={add} disabled={fields.length >= LIMITS.fields}>
        <Icon name="plus" size={18} weight={2.4} /> Добавить вопрос
      </button>
    </div>
  );
}
