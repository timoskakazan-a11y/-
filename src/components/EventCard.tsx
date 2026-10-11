import type { EventItem } from "@/lib/data";
import { safeUrl } from "@/lib/format";

const TZ = "Europe/Moscow";

export function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString("ru-RU", { day: "numeric", timeZone: TZ });
  const month = d.toLocaleDateString("ru-RU", { month: "short", timeZone: TZ }).replace(".", "");
  const full = d.toLocaleString("ru-RU", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const link = safeUrl(e.link_url);
  return (
    <article className="card event">
      <div className="event-date" aria-hidden>
        <b>{day}</b>
        <span>{month}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h3>{e.title}</h3>
        <div className="muted small" style={{ marginBottom: 8 }}>
          {full}
          {e.location ? ` · ${e.location}` : ""}
        </div>
        {e.description && <p>{e.description}</p>}
        {link && (
          <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noopener noreferrer">
            Подробнее →
          </a>
        )}
      </div>
    </article>
  );
}
