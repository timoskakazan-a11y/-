import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { isAccepting, listHeads, listPeriods } from "@/lib/reports";
import { inScope } from "@/lib/people";
import { fmtDeadline } from "@/lib/time";
import { createPeriod } from "@/app/admin/people-actions";
import { PeopleForm } from "@/components/PeopleForm";
import { SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { Disclose } from "@/components/Disclose";
import { HeadsNav } from "@/components/HeadsNav";
import { plural } from "@/components/FormListItem";
import { DeadlineChip } from "@/components/DeadlineChip";

export const metadata: Metadata = { title: "Отчёты старост" };

function defaults() {
  // по умолчанию — текущий месяц по Казани и срок в последний день месяца, 18:00
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mm = String(m + 1).padStart(2, "0");
  return { month: `${y}-${mm}`, deadline: `${y}-${mm}-${String(last).padStart(2, "0")}T18:00` };
}

export default async function ReportsPage() {
  const actor = await requireStaff("reports");
  const [periods, heads] = await Promise.all([listPeriods(), listHeads(actor.classes)]);
  const classes = new Set(heads.filter((h) => h.is_active).map((h) => h.class_name));
  const { data: reps } = periods.length
    ? await db().from("class_reports").select("period_id,class_name,status").in("period_id", periods.map((p) => p.id))
    : { data: [] };
  const d = defaults();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="adm-head">
        <h1>Отчёты старост</h1>
        <p>Каждый месяц старосты отмечают, на какие мероприятия ходил класс. Создайте месяц и срок — у старост сразу появится отчёт.</p>
      </header>
      <HeadsNav actor={actor} active="reports" />

      <Disclose initialOpen={periods.length === 0} summary={<><Icon name="plus" size={18} /> Новый отчётный месяц</>}>
        <PeopleForm action={createPeriod} loginUrl="" className="stack">
          <div className="grid-2" style={{ marginTop: 16 }}>
            <label className="field"><span className="label">Месяц</span>
              <input className="input" type="month" name="month" required defaultValue={d.month} /></label>
            <label className="field"><span className="label">Сдать до</span>
              <input className="input" type="datetime-local" name="deadline" required defaultValue={d.deadline} /></label>
          </div>
          <label className="field"><span className="label">Название</span>
            <input className="input" name="title" maxLength={120} placeholder="По умолчанию — «Октябрь 2026»" /></label>
          <SubmitButton className="btn btn-primary" pendingText="Создаём…">Создать</SubmitButton>
        </PeopleForm>
      </Disclose>

      {periods.length === 0 ? (
        <div className="empty">Отчётных месяцев пока нет</div>
      ) : (
        <div className="period-grid">
          {periods.map((p) => {
            const mine = (reps ?? []).filter((r) => r.period_id === p.id && inScope(actor.classes, r.class_name));
            const total = new Set([...classes, ...mine.map((r) => r.class_name)]).size;
            const sent = mine.filter((r) => r.status === "submitted").length;
            const pct = total ? Math.round((sent / total) * 100) : 0;
            return (
              <Link key={p.id} href={`/admin/reports/${p.id}`} className="period-card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3>{p.title}</h3>
                  <DeadlineChip deadline={p.deadline} isOpen={p.is_open} />
                </div>
                <p className="xs muted">Срок: {fmtDeadline(p.deadline)}{isAccepting(p) ? "" : " · приём закрыт"}</p>
                <div className="period-progress">
                  <b>{sent}<span> / {total}</span></b>
                  <span className="bar"><i style={{ width: `${pct}%` }} /></span>
                </div>
                <span className="xs muted">{plural(sent, "класс сдал", "класса сдали", "классов сдали")}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
