import { daysLeft } from "@/lib/time";
import { plural } from "./FormListItem";

export function DeadlineChip({ deadline, isOpen }: { deadline: string; isOpen: boolean }) {
  if (!isOpen) return <span className="pill pill-plain">закрыт</span>;
  const d = daysLeft(deadline);
  if (new Date(deadline).getTime() < Date.now()) return <span className="pill pill-warn">срок прошёл</span>;
  if (d === 0) return <span className="pill pill-warn">сдать сегодня</span>;
  return <span className={d <= 3 ? "pill pill-warn" : "pill pill-ok"}>ещё {d} {plural(d, "день", "дня", "дней")}</span>;
}
