import Link from "next/link";
import { requireHead } from "@/lib/auth";
import { classReport, isAccepting, listPeriods } from "@/lib/reports";
import { daysLeft, fmtDeadline, fmtDateTime } from "@/lib/time";
import { headLogout } from "./actions";
import { Icon } from "@/components/Icon";
import { Shape } from "@/components/Shape";
import { LogoMark } from "@/components/Logo";
import { plural } from "@/components/FormListItem";

export const dynamic = "force-dynamic";

export default async function HeadHome() {
  const head = await requireHead();
  const periods = await listPeriods(12);
  const withReports = await Promise.all(periods.map(async (p) => ({ p, r: await classReport(p.id, head.class_name) })));
  const open = withReports.filter(({ p }) => isAccepting(p));
  const past = withReports.filter(({ p }) => !isAccepting(p));
  const firstName = head.full_name.split(/\s+/)[1] ?? head.full_name;

  return (
    <main className="kid-page">
      <header className="kid-top">
        <LogoMark height={40} bg="#F4F2EE" fg="#16161B" />
        <div className="grow">
          <b>Привет, {firstName}!</b>
          <span>Староста {head.class_name}</span>
        </div>
        <form action={headLogout}><button className="kid-ghost">Выйти</button></form>
      </header>

      <h1 className="kid-h1">Отчёты класса <span className="ig-chip ig-yellow" aria-hidden><Shape name="star" size="0.5em" /></span></h1>

      {open.length === 0 ? (
        <div className="kid-empty">
          <Icon name="check" size={28} />
          <p>Сейчас сдавать ничего не нужно. Когда учитель откроет новый месяц, он появится здесь.</p>
        </div>
      ) : (
        <div className="kid-periods">
          {open.map(({ p, r }) => {
            const d = daysLeft(p.deadline);
            const sent = r?.status === "submitted";
            const n = r?.items.length ?? 0;
            return (
              <Link key={p.id} href={`/s/${p.id}`} className={`ig-tile kid-period ${sent ? "ig-mint" : "ig-yellow"}`}>
                <Shape name={sent ? "flower" : "burst"} className="ig-tile-shape" size={190} />
                <span className="ig-tile-label">{sent ? "Сдан" : n ? "Черновик" : "Нужно заполнить"}</span>
                <h3>{p.title}</h3>
                <span className="ig-tile-meta">
                  {n ? `${n} ${plural(n, "мероприятие", "мероприятия", "мероприятий")} · ` : ""}
                  сдать до {fmtDeadline(p.deadline)}{d >= 0 && d <= 3 ? ` (${d === 0 ? "сегодня!" : `${d} ${plural(d, "день", "дня", "дней")}`})` : ""}
                </span>
                <span className="kid-tile-btn">{sent ? "Посмотреть или исправить" : n ? "Продолжить" : "Заполнить"} <Icon name="arrowRight" size={18} /></span>
              </Link>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <section className="kid-past">
          <h2>Прошлые месяцы</h2>
          <div className="kid-past-list">
            {past.map(({ p, r }) => (
              <Link key={p.id} href={`/s/${p.id}`} className="kid-past-row">
                <span className="grow"><b>{p.title}</b><span>{r?.status === "submitted" ? `сдан ${fmtDateTime(r.submitted_at)}` : r?.items.length ? "не сдан (черновик)" : "не заполнен"}</span></span>
                <Icon name="chevronRight" size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
