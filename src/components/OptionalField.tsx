"use client";
import { useState } from "react";

/** Строка-переключатель как в «Напоминаниях» iOS: включил — появилось поле, выключил — значение пустое. */
// завтра в 18:00 по Казани в формате datetime-local
function defaultDate() {
  const d = new Date(Date.now() + 3 * 3600 * 1000 + 24 * 3600 * 1000);
  return d.toISOString().slice(0, 11) + "18:00";
}

export function OptionalField({ label, name, type, defaultValue, placeholder, min }: {
  label: string;
  name: string;
  type: "datetime-local" | "number";
  defaultValue: string;
  placeholder?: string;
  min?: number;
}) {
  const [on, setOn] = useState(defaultValue !== "");
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <label className="cell cell-inline switch">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            if (e.target.checked && !value) setValue(type === "number" ? "100" : defaultDate());
          }}
        />
        <span className="track" />
      </label>
      {on ? (
        <div className="cell">
          <input
            className="input-bare cell-input"
            type={type}
            name={name}
            value={value}
            min={min}
            inputMode={type === "number" ? "numeric" : undefined}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            required
            aria-label={label}
          />
        </div>
      ) : (
        <input type="hidden" name={name} value="" />
      )}
    </>
  );
}
