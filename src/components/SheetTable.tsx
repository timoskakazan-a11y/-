"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Icon } from "./Icon";

type Row = { id: string; created: string; cells: string[] };

function colName(i: number) {
  let s = "";
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/**
 * Таблица ответов в духе Google Таблиц: буквы столбцов, номера строк,
 * закреплённая шапка, выделение ячейки, строка просмотра (как строка формул),
 * навигация стрелками, копирование Ctrl/⌘+C и быстрый поиск.
 */
export function SheetTable({ labels, rows, deleteAction }: {
  labels: string[];
  rows: Row[];
  deleteAction: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const columns = useMemo(() => ["Время", ...labels], [labels]);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.cells.some((c) => c.toLowerCase().includes(q)));
  }, [rows, query]);

  const value = (r: number, c: number) => {
    const row = visible[r];
    if (!row) return "";
    return c === 0 ? row.created : row.cells[c - 1] ?? "";
  };
  const selected = sel ? value(sel.r, sel.c) : "";

  useEffect(() => setSel(null), [query]);

  useEffect(() => {
    if (!sel || !wrap.current) return;
    wrap.current.querySelector<HTMLElement>(`[data-cell="${sel.r}:${sel.c}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  function onKey(e: React.KeyboardEvent) {
    if (!sel) return;
    const maxR = visible.length - 1;
    const maxC = columns.length - 1;
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, e.shiftKey ? -1 : 1], Enter: [1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setSel({ r: Math.min(maxR, Math.max(0, sel.r + dr)), c: Math.min(maxC, Math.max(0, sel.c + dc)) });
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      navigator.clipboard?.writeText(selected).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }).catch(() => {});
    } else if (e.key === "Escape") {
      setSel(null);
    }
  }

  return (
    <div className="sheet-box">
      <div className="sheet-tools">
        <label className="sheet-search">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по ответам" aria-label="Поиск по ответам" />
        </label>
        <span className="xs muted tnum">{query ? `Найдено ${visible.length} из ${rows.length}` : `${rows.length} строк`}</span>
      </div>
      <div className="sheet-bar">
        <span className="sheet-ref">{sel ? `${colName(sel.c)}${sel.r + 2}` : ""}</span>
        <span className="sheet-fx-label">fx</span>
        <div className="sheet-fx">{sel ? selected || <span className="tertiary">пусто</span> : <span className="tertiary">Нажмите на ячейку, чтобы увидеть ответ целиком</span>}</div>
        {copied && <span className="xs" style={{ color: "var(--green)", padding: "0 12px", alignSelf: "center" }}>Скопировано</span>}
      </div>
      <div className="sheet" ref={wrap} tabIndex={0} onKeyDown={onKey} role="grid" aria-label="Ответы">
        <table>
          <thead>
            <tr className="sheet-letters">
              <th className="rn corner" aria-hidden />
              {columns.map((_, c) => (
                <th key={c} className={sel?.c === c ? "on" : undefined}>{colName(c)}</th>
              ))}
              <th className="act" aria-hidden />
            </tr>
            <tr className="sheet-labels">
              <th className="rn">1</th>
              {columns.map((l, c) => <th key={c} title={l}>{l}</th>)}
              <th className="act" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row, r) => (
              <tr key={row.id}>
                <td className={sel?.r === r ? "rn on" : "rn"}>{r + 2}</td>
                {[row.created, ...row.cells].map((v, c) => {
                  const on = sel?.r === r && sel?.c === c;
                  return (
                    <td
                      key={c}
                      data-cell={`${r}:${c}`}
                      className={on ? "sc on" : "sc"}
                      title={v.length > 30 ? v : undefined}
                      onClick={() => {
                        setSel({ r, c });
                        wrap.current?.focus({ preventScroll: true });
                      }}
                    >
                      {v}
                    </td>
                  );
                })}
                <td className="act">
                  <ActionForm action={deleteAction} confirm="Удалить этот ответ?" inline>
                    <input type="hidden" name="table" value="form_responses" />
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton className="btn btn-ghost btn-sm btn-icon sheet-del" pendingText="…" title="Удалить ответ">
                      <Icon name="trash" size={15} />
                    </SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td className="rn">2</td><td className="sc muted" colSpan={columns.length}>Ничего не найдено</td><td className="act" /></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="xs muted" style={{ marginTop: 8 }}>Стрелки — перемещение, Ctrl/⌘ + C — скопировать ячейку.</p>
    </div>
  );
}
