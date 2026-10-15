"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveReport, type SaveResult } from "../actions";
import { Icon } from "@/components/Icon";
import { Shape } from "@/components/Shape";

type Item = { event_date: string; title: string; participants: number; note: string; event_id: string | null };
type Ev = { id: string; title: string; date: string };
type Props = {
  period: { id: string; title: string; month: string; deadline: string };
  accepting: boolean;
  className: string;
  initial: { items: Item[]; status: "draft" | "submitted" | null; submittedAt: string | null; updatedAt: string | null };
  events: Ev[];
};
type SaveState = "idle" | "saving" | "saved" | "offline" | "error" | "conflict" | "late";

const TZ = "Europe/Moscow";
const dayLabel = (d: string, weekday = false) =>
  new Date(`${d}T12:00:00+03:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", ...(weekday ? { weekday: "short" } : {}), timeZone: TZ });
const deadlineLabel = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const todayLocal = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { min: `${y}-${mm}-01`, max: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
const byDate = (a: Item, b: Item) => a.event_date.localeCompare(b.event_date);

export function ReportEditor({ period, accepting, className, initial, events }: Props) {
  const router = useRouter();
  const backupKey = `ig71-report-${period.id}-${className}`;
  const [items, setItems] = useState<Item[]>(initial.items);
  const [status, setStatus] = useState(initial.status);
  const [submittedAt, setSubmittedAt] = useState(initial.submittedAt);
  const [save, setSave] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(initial.items.length === 0 && accepting ? "new" : null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const expected = useRef(initial.updatedAt);
  const itemsRef = useRef(items);
  const inFlight = useRef(false);
  const again = useRef(false);
  const dirty = useRef(false);
  itemsRef.current = items;

  // Черновик в браузере — на случай, если пропал интернет или закрыли вкладку
  useEffect(() => {
    if (!accepting) return;
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const b = JSON.parse(raw) as { base: string | null; items: Item[] };
      if (b.base === initial.updatedAt && JSON.stringify(b.items) !== JSON.stringify(initial.items)) {
        setItems(b.items);
        dirty.current = true;
        setMessage("Вернули несохранённые записи с этого устройства");
      } else {
        localStorage.removeItem(backupKey);
      }
    } catch {
      /* хранилище недоступно — ничего страшного */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    async (submit: boolean): Promise<boolean> => {
      if (inFlight.current) {
        again.current = true;
        if (!submit) return false;
        // дождёмся текущего сохранения, затем отправим
        while (inFlight.current) await new Promise((r) => setTimeout(r, 150));
      }
      inFlight.current = true;
      setSave("saving");
      const snapshot = itemsRef.current;
      let r: SaveResult;
      try {
        r = await saveReport({ periodId: period.id, items: snapshot, submit, expected: expected.current });
      } catch {
        inFlight.current = false;
        setSave("offline");
        return false;
      }
      inFlight.current = false;
      if (r.status === "ok") {
        expected.current = r.updated_at ?? expected.current;
        if (submit) {
          setStatus("submitted");
          setSubmittedAt(new Date().toISOString());
        } else setStatus((st) => st ?? "draft");
        if (snapshot === itemsRef.current) {
          dirty.current = false;
          try { localStorage.removeItem(backupKey); } catch { /* */ }
        }
        setSave("saved");
        setMessage(null);
      } else if (r.status === "conflict") {
        setSave("conflict");
        setMessage("Отчёт только что изменил второй староста. Загружаем свежую версию — проверь записи.");
        try { localStorage.removeItem(backupKey); } catch { /* */ }
        setTimeout(() => router.refresh(), 1200);
        return false;
      } else if (r.status === "late" || r.status === "closed") {
        setSave("late");
        setMessage(r.status === "late" ? "Срок сдачи прошёл — изменения не сохранились. Обратись к учителю." : "Учитель закрыл приём отчётов. Изменения не сохранились.");
        return false;
      } else if (r.status === "invalid") {
        setSave("error");
        setMessage(r.message ?? "Проверь записи");
        return false;
      } else {
        setSave("error");
        setMessage(r.message ?? "Не получилось сохранить. Попробуй ещё раз.");
        return false;
      }
      if (again.current) {
        again.current = false;
        return persist(false);
      }
      return true;
    },
    [period.id, backupKey, router],
  );

  // Автосохранение через секунду после изменения
  const first = useRef(true);
  useEffect(() => {
    if (first.current && !dirty.current) {
      first.current = false;
      return;
    }
    first.current = false;
    if (!accepting) return;
    dirty.current = true;
    try { localStorage.setItem(backupKey, JSON.stringify({ base: expected.current, items })); } catch { /* */ }
    const t = setTimeout(() => void persist(false), 900);
    return () => clearTimeout(t);
  }, [items, accepting, backupKey, persist]);

  // Появился интернет — досохраняем
  useEffect(() => {
    const on = () => { if (dirty.current) void persist(false); };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [persist]);

  // Не даём закрыть страницу с несохранёнными изменениями
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current || inFlight.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const submitReport = async () => {
    if (items.length === 0) return;
    setEditing(null);
    if (await persist(true)) setDone(true);
  };

  const total = items.reduce((s, i) => s + i.participants, 0);
  const late = !accepting;

  if (done) {
    return (
      <section className="ig-tile ig-mint kid-done" role="status">
        <Shape name="flower" className="ig-tile-shape" size={260} />
        <span className="kid-done-icon"><Icon name="check" size={40} weight={3} /></span>
        <h1>Отчёт сдан!</h1>
        <p>{period.title} · {className} · {items.length} {items.length === 1 ? "мероприятие" : items.length < 5 ? "мероприятия" : "мероприятий"}. Учитель уже видит его.</p>
        <p>Если что-то забыл — можно исправить до {deadlineLabel(period.deadline)}.</p>
        <div className="kid-row">
          <a href="/s" className="kid-btn kid-btn-dark">Готово</a>
          <button type="button" className="kid-btn kid-btn-ghost" onClick={() => setDone(false)}>Исправить</button>
        </div>
      </section>
    );
  }

  return (
    <div className="kid-editor">
      <header className="kid-report-head">
        <span className="class-badge">{className}</span>
        <h1>{period.title}</h1>
        <p>{late ? "Приём отчётов закрыт" : `Сдать до ${deadlineLabel(period.deadline)}`}</p>
      </header>

      {status === "submitted" && !late && (
        <div className="kid-note kid-note-ok"><Icon name="check" size={18} /> Отчёт сдан{submittedAt ? ` ${dayLabel(submittedAt.slice(0, 10))}` : ""}. Исправления тоже сохраняются сами.</div>
      )}
      {late && <div className="kid-note">Сейчас отчёт можно только посмотреть. Если нужно что-то поправить — скажи учителю.</div>}
      {message && <div className={save === "saved" ? "kid-note kid-note-ok" : "kid-note kid-note-err"} role="alert">{message}</div>}

      {!late && editing === "new" && (
        <ItemForm
          key="new"
          month={period.month}
          events={events}
          used={items}
          onCancel={items.length ? () => setEditing(null) : undefined}
          onSave={(it) => { setItems((xs) => [...xs, it].sort(byDate)); setEditing(null); }}
        />
      )}

      {items.length > 0 && (
        <ol className="kid-items">
          {items.map((it, i) =>
            editing === i ? (
              <li key={i} className="kid-item-edit">
                <ItemForm
                  month={period.month}
                  events={events}
                  used={items}
                  value={it}
                  onCancel={() => setEditing(null)}
                  onSave={(v) => { setItems((xs) => xs.map((x, j) => (j === i ? v : x)).sort(byDate)); setEditing(null); }}
                />
              </li>
            ) : (
              <li key={i} className="kid-item">
                <div className="kid-item-date"><b>{Number(it.event_date.slice(8))}</b><span>{dayLabel(it.event_date).replace(/^\d+\s/, "")}</span></div>
                <div className="kid-item-body">
                  <b>{it.title}</b>
                  <span>{it.participants} чел. из класса{it.note ? ` · ${it.note}` : ""}</span>
                </div>
                {!late && (removing === i ? (
                  <div className="kid-item-confirm">
                    <button type="button" className="kid-mini kid-mini-danger" onClick={() => { setItems((xs) => xs.filter((_, j) => j !== i)); setRemoving(null); }}>Удалить</button>
                    <button type="button" className="kid-mini" onClick={() => setRemoving(null)}>Нет</button>
                  </div>
                ) : (
                  <div className="kid-item-actions">
                    <button type="button" className="kid-icon" onClick={() => { setEditing(i); setRemoving(null); }} aria-label={`Изменить «${it.title}»`}><Icon name="pen" size={18} /></button>
                    <button type="button" className="kid-icon" onClick={() => setRemoving(i)} aria-label={`Удалить «${it.title}»`}><Icon name="trash" size={18} /></button>
                  </div>
                ))}
              </li>
            ),
          )}
        </ol>
      )}

      {!late && editing === null && (
        <button type="button" className="kid-add" onClick={() => setEditing("new")}>
          <Icon name="plus" size={22} weight={2.6} /> Добавить мероприятие
        </button>
      )}

      {late && items.length === 0 && <div className="kid-empty"><p>В этом месяце ничего не записано.</p></div>}

      {!late && (
        <div className="kid-dock">
          <div className="kid-dock-in">
            <span className={`kid-save kid-save-${save}`} aria-live="polite">
              {save === "saving" ? "Сохраняем…" : save === "saved" ? "✓ Сохранено" : save === "offline" ? "Нет интернета — сохраним позже" : save === "error" ? "Не сохранилось" : save === "conflict" ? "Обновляем…" : save === "late" ? "Не сохранилось" : items.length ? `${items.length} · ${total} чел.` : "Пока пусто"}
            </span>
            {save === "offline" || save === "error" ? (
              <button type="button" className="kid-btn kid-btn-sm" onClick={() => void persist(false)}>Повторить</button>
            ) : (
              <button type="button" className="kid-btn kid-btn-sm" disabled={items.length === 0 || editing !== null || save === "saving"} onClick={submitReport}>
                {status === "submitted" ? "Сдать ещё раз" : "Сдать отчёт"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemForm({ month, events, used, value, onSave, onCancel }: {
  month: string;
  events: Ev[];
  used: Item[];
  value?: Item;
  onSave: (v: Item) => void;
  onCancel?: () => void;
}) {
  const b = monthBounds(month);
  const today = todayLocal();
  const [title, setTitle] = useState(value?.title ?? "");
  const [date, setDate] = useState(value?.event_date ?? (today >= b.min && today <= b.max ? today : ""));
  const [count, setCount] = useState(value?.participants ?? 1);
  const [note, setNote] = useState(value?.note ?? "");
  const [eventId, setEventId] = useState<string | null>(value?.event_id ?? null);
  const [err, setErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const usedIds = useMemo(() => new Set(used.filter((u) => u !== value).map((u) => u.event_id).filter(Boolean)), [used, value]);
  const free = events.filter((e) => !usedIds.has(e.id));

  const pick = (e: Ev) => {
    setTitle(e.title);
    setDate(e.date);
    setEventId(e.id);
    setErr(null);
  };

  const submit = () => {
    const t = title.trim();
    if (!t) { setErr("Напиши, что это было за мероприятие"); titleRef.current?.focus(); return; }
    if (!date) { setErr("Выбери дату"); return; }
    if (date < b.min || date > b.max) { setErr("Дата должна быть из этого месяца"); return; }
    if (!Number.isInteger(count) || count < 1 || count > 60) { setErr("Сколько человек ходило? От 1 до 60"); return; }
    onSave({ title: t.slice(0, 200), event_date: date, participants: count, note: note.trim().slice(0, 500), event_id: eventId });
  };

  return (
    <div className="kid-form-card" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); submit(); } }}>
      <h2>{value ? "Изменить запись" : "Куда ходил класс?"}</h2>

      {free.length > 0 && (
        <div className="kid-step">
          <span className="kid-step-label">Выбери из школьных мероприятий</span>
          <div className="kid-picks">
            {free.map((e) => (
              <button type="button" key={e.id} className={`kid-pick${eventId === e.id ? " on" : ""}`} onClick={() => pick(e)} aria-pressed={eventId === e.id}>
                <b>{e.title}</b><span>{dayLabel(e.date)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="kid-field">
        <span>{free.length ? "…или напиши сам" : "Название мероприятия"}</span>
        <input ref={titleRef} value={title} maxLength={200} placeholder="Например: экскурсия в Кремль" onChange={(e) => { setTitle(e.target.value); setEventId(null); setErr(null); }} />
      </label>

      <div className="kid-two">
        <label className="kid-field">
          <span>Когда</span>
          <input type="date" value={date} min={b.min} max={b.max} onChange={(e) => { setDate(e.target.value); setErr(null); }} />
        </label>
        <div className="kid-field">
          <span id="cnt-label">Сколько человек</span>
          <div className="kid-stepper" role="group" aria-labelledby="cnt-label">
            <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Меньше" disabled={count <= 1}>−</button>
            <input inputMode="numeric" value={count} aria-label="Количество человек" onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); setCount(Number.isFinite(n) ? Math.min(60, n) : 0); }} />
            <button type="button" onClick={() => setCount((c) => Math.min(60, c + 1))} aria-label="Больше" disabled={count >= 60}>+</button>
          </div>
        </div>
      </div>

      <label className="kid-field">
        <span>Комментарий <i>— если нужно</i></span>
        <input value={note} maxLength={500} placeholder="Например: заняли 2 место" onChange={(e) => setNote(e.target.value)} />
      </label>

      {err && <div className="kid-error" role="alert"><Icon name="x" size={16} /> {err}</div>}

      <div className="kid-row">
        <button type="button" className="kid-btn" onClick={submit}>{value ? "Сохранить" : "Добавить"}</button>
        {onCancel && <button type="button" className="kid-btn kid-btn-ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </div>
  );
}
