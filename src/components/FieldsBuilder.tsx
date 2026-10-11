"use client";

import { useState } from "react";
import { FIELD_TYPES, LIMITS, type FieldType, type FormField } from "@/lib/forms";

const withOptions = (t: FieldType) => t === "select" || t === "radio" || t === "checkbox";

function nextId(fields: FormField[]) {
  let n = fields.length + 1;
  const ids = new Set(fields.map((f) => f.id));
  while (ids.has(`q${n}`)) n++;
  return `q${n}`;
}

export function FieldsBuilder({ initial }: { initial: FormField[] }) {
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
  const remove = (i: number) => setFields((fs) => fs.filter((_, j) => j !== i));
  const add = () =>
    setFields((fs) => (fs.length >= LIMITS.fields ? fs : [...fs, { id: nextId(fs), type: "text", label: "", required: false }]));

  // Чистим данные перед отправкой на сервер
  const serialized = JSON.stringify(
    fields.map((f) => {
      const out: FormField = { id: f.id, type: f.type, label: f.label.trim(), required: f.required };
      if (f.placeholder?.trim()) out.placeholder = f.placeholder.trim();
      if ((f.type === "text" || f.type === "textarea") && f.maxLength) out.maxLength = f.maxLength;
      if (withOptions(f.type)) out.options = [...new Set((f.options ?? []).map((o) => o.trim()).filter(Boolean))];
      return out;
    }),
  );

  return (
    <div className="stack">
      <input type="hidden" name="fields" value={serialized} />
      {fields.length === 0 && <div className="empty">Нет вопросов — добавьте первый.</div>}
      {fields.map((f, i) => (
        <div key={f.id} className="builder-field form-grid">
          <div className="row">
            <b>Вопрос {i + 1}</b>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">↑</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Ниже">↓</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(i)}>Удалить</button>
          </div>
          <div className="form-grid two">
            <label className="field"><span className="field-label">Текст вопроса*</span>
              <input className="input" value={f.label} maxLength={LIMITS.label} required onChange={(e) => update(i, { label: e.target.value })} /></label>
            <label className="field"><span className="field-label">Тип</span>
              <select className="select" value={f.type} onChange={(e) => update(i, { type: e.target.value as FieldType })}>
                {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
          </div>
          {withOptions(f.type) ? (
            <label className="field"><span className="field-label">Варианты (каждый с новой строки)</span>
              <textarea
                className="textarea"
                style={{ minHeight: 100 }}
                value={(f.options ?? []).join("\n")}
                onChange={(e) => update(i, { options: e.target.value.split("\n").slice(0, LIMITS.options) })}
              /></label>
          ) : (
            <div className="form-grid two">
              <label className="field"><span className="field-label">Подсказка в поле</span>
                <input className="input" value={f.placeholder ?? ""} maxLength={200} onChange={(e) => update(i, { placeholder: e.target.value })} /></label>
              <label className="field"><span className="field-label">Макс. длина ответа</span>
                <input className="input" type="number" min={1} max={f.type === "textarea" ? LIMITS.textarea : LIMITS.text}
                  value={f.maxLength ?? ""} placeholder={String(f.type === "textarea" ? LIMITS.textarea : LIMITS.text)}
                  onChange={(e) => update(i, { maxLength: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })} /></label>
            </div>
          )}
          <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} /> Обязательный вопрос</label>
        </div>
      ))}
      <div><button type="button" className="btn btn-ghost" onClick={add} disabled={fields.length >= LIMITS.fields}>＋ Добавить вопрос</button></div>
    </div>
  );
}
