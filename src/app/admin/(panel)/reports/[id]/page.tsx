import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { getPeriod, listHeads, reportsForPeriod, type ClassReport } from "@/lib/reports";
import { byClass } from "@/lib/people";
import { fmtDay, fmtDeadline, fmtDateTime, fmtShort, isoToLocal } from "@/lib/time";
import { deletePeriod, reopenReport, updatePeriod } from "@/app/admin/people-actions";
import { PeopleForm } from "@/components/PeopleForm";
import { SubmitButton } from "@/components/ActionForm";
import { SheetTable } from "@/components/SheetTable";
import { Icon } from "@/components/Icon";
import { DeadlineChip } from "@/components/DeadlineChip";
import { plural } from "@/components/FormListItem";

export const metadata: Metadata = { title: "Отчёт за месяц" };

type View = "classes" | "table" | "events";

function StatusPill({ r }: { r?: ClassReport }) {
  if (!r) return <span className="pill pill-plain">не начат</span>;
  if (r.status === "submitted") return <span className="pill pill-ok">сдан</span>;
  return <span className="pill pill-warn">черновик</span>;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[«»"'.!]/g, "").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export default async function PeriodPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const actor = await requireStaff("reports");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const view: View = sp.view === "table" ? "table" : sp.view === "events" ? "events" : "classes";

  const period = await getPeriod(id);
  if (!period) notFound();
  const [reports, heads] = await Promise.all([reportsForPeriod(id, actor.classes), listHeads(actor.classes)]);

  const byCls = new Map(reports.map((r) => [r.class_name, r]));
  const headsBy = new Map<string, string[]>();
  for (const h of heads.filter((x) => x.is_active)) headsBy.set(h.class_name, [...(headsBy.get(h.class_name) ?? []), h.full_name]);
  const classes = [...new Set([...headsBy.keys(), ...byCls.keys()])].sort(byClass);
  const sent = reports.filter((r) => r.status === "submitted").length;
  const rows = reports.flatMap((r) => r.items.map((it, i) => ({ r, it, i })));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link href="/admin/reports" className="back"><Icon name="chevronLeft" size={20} /> Отчёты</Link>
      <header className="adm-head">
        <div className="row" style={{ gap: 10 }}><h1>{period.title}</h1><DeadlineChip deadline={period.deadline} isOpen={period.is_open} /></div>
        <p>Сдать до {fmtDeadline(period.deadline)} · сдали {sent} из {classes.length} · {rows.length} {plural(rows.length, "запись", "записи", "записей")}</p>
      </header>

      <div className="row" style={{ gap: 10 }}>
        <nav className="segmented" style={{ marginBottom: 0, flex: "1 1 300px", maxWidth: 440 }} aria-label="Вид">
          <Link href="?view=classes" aria-current={view === "classes" ? "page" : undefined}>Классы</Link>
          <Link href="?view=table" aria-current={view === "table" ? "page" : undefined}>Таблица</Link>
          <Link href="?view=events" aria-current={view === "events" ? "page" : undefined}>Мероприятия</Link>
        </nav>
        <span className="spacer" />
        <a className="btn btn-secondary btn-sm" style={{ height: 36 }} href={`/api/admin/reports/${id}/export`}><Icon name="download" size={16} /> Скачать Excel</a>
      </div>

      {view === "classes" && (
        classes.length === 0 ? <div className="empty">Нет классов: добавьте старост в разделе «Старосты и пароли»</div> : (
          <div className="list">
            {classes.map((cls) => {
              const r = byCls.get(cls);
              const people = r ? r.items.reduce((s, x) => s + x.participants, 0) : 0;
              return (
                <details key={cls} className="disclose">
                  <summary className="list-item">
                    <span className="class-badge">{cls}</span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600 }}>{(headsBy.get(cls) ?? ["староста не назначен"]).join(", ")}</div>
                      <div className="row xs muted" style={{ marginTop: 4, gap: 8 }}>
                        <StatusPill r={r} />
                        {r && <span>{r.items.length} {plural(r.items.length, "мероприятие", "мероприятия", "мероприятий")} · {people} чел.</span>}
                        {r?.submitted_at && <span>· {fmtDateTime(r.submitted_at)}</span>}
                      </div>
                    </div>
                    <Icon name="down" className="chev" />
                  </summary>
                  <div style={{ padding: "0 16px 16px" }} className="stack">
                    {!r || r.items.length === 0 ? <p className="small muted">Пока ничего не заполнено</p> : (
                      <ol className="report-lines">
                        {r.items.map((it, i) => (
                          <li key={i}>
                            <span className="report-date">{fmtDay(it.event_date)}</span>
                            <span className="grow"><b>{it.title}</b>{it.note && <span className="xs muted"> — {it.note}</span>}</span>
                            <span className="report-count">{it.participants} чел.</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {r?.status === "submitted" && (
                      <PeopleForm action={reopenReport} loginUrl="" confirm="Вернуть отчёт старосте на доработку?" inline>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="btn btn-sm" pendingText="…">Вернуть на доработку</SubmitButton>
                      </PeopleForm>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )
      )}

      {view === "table" && (
        rows.length === 0 ? <div className="empty">Записей пока нет</div> : (
          <SheetTable
            firstLabel="Класс"
            labels={["Дата", "Мероприятие", "Участников", "Комментарий", "Статус", "Обновлено"]}
            rows={rows.map(({ r, it, i }) => ({
              id: `${r.id}-${i}`,
              created: r.class_name,
              cells: [fmtDay(it.event_date), it.title, String(it.participants), it.note, r.status === "submitted" ? "сдан" : "черновик", fmtShort(r.updated_at)],
            }))}
          />
        )
      )}

      {view === "events" && (() => {
        const groups = new Map<string, { title: string; classes: Set<string>; people: number; dates: Set<string> }>();
        for (const { r, it } of rows) {
          const k = norm(it.title);
          const g = groups.get(k) ?? { title: it.title, classes: new Set(), people: 0, dates: new Set() };
          g.classes.add(r.class_name);
          g.people += it.participants;
          g.dates.add(it.event_date);
          groups.set(k, g);
        }
        const list = [...groups.values()].sort((a, b) => b.classes.size - a.classes.size || b.people - a.people);
        return list.length === 0 ? <div className="empty">Записей пока нет</div> : (
          <div className="list">
            {list.map((g) => (
              <div key={g.title} className="list-item" style={{ alignItems: "flex-start" }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{g.title}</div>
                  <div className="xs muted" style={{ marginTop: 4 }}>{[...g.dates].sort().map((d) => fmtDay(d)).join(", ")} · {[...g.classes].sort(byClass).join(", ")}</div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <b className="tnum">{g.classes.size}</b> <span className="xs muted">{plural(g.classes.size, "класс", "класса", "классов")}</span>
                  <div className="xs muted tnum">{g.people} чел.</div>
                </div>
              </div>
            ))}
            <p className="xs muted" style={{ padding: "8px 16px" }}>Одинаковые названия объединены. Если старосты написали по-разному, мероприятие будет в списке несколько раз.</p>
          </div>
        );
      })()}

      <details className="disclose card">
        <summary className="row" style={{ fontWeight: 600 }}><Icon name="pen" size={18} /> Настройки месяца</summary>
        <PeopleForm action={updatePeriod} loginUrl="" className="stack">
          <input type="hidden" name="id" value={period.id} />
          <div className="grid-2" style={{ marginTop: 16 }}>
            <label className="field"><span className="label">Название</span>
              <input className="input" name="title" required maxLength={120} defaultValue={period.title} /></label>
            <label className="field"><span className="label">Сдать до</span>
              <input className="input" type="datetime-local" name="deadline" required defaultValue={isoToLocal(period.deadline)} /></label>
          </div>
          <label className="switch">
            <span className="label">Принимать отчёты</span>
            <input type="checkbox" name="is_open" defaultChecked={period.is_open} />
            <span className="track" />
          </label>
          <p className="hint">Чтобы дать опоздавшим время — просто перенесите срок.</p>
          <SubmitButton className="btn btn-primary">Сохранить</SubmitButton>
        </PeopleForm>
        {actor.role === "owner" && (
          <PeopleForm action={deletePeriod} loginUrl="" confirm="Удалить месяц вместе со всеми отчётами классов?" inline>
            <input type="hidden" name="id" value={period.id} />
            <SubmitButton className="btn btn-danger btn-block" pendingText="Удаляем…">Удалить месяц</SubmitButton>
          </PeopleForm>
        )}
      </details>
    </div>
  );
}
