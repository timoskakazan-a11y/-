import type { EventItem } from "@/lib/data";
import { safeUrl } from "@/lib/format";

const TZ = "Europe/Moscow";

export function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString("ru-RU", { day: "numeric", timeZone: TZ });
  const month = d.toLocaleDateString("ru-RU", { month: "short", timeZone: TZ }).replace(".", "");
  const when = d.toLocaleString("ru-RU", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const link = safeUrl(e.link_url);
  return (
    <article className="event">
      <div className="event-date" aria-hidden>
        <b>{day}</b>
        <span>{month}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h3>{e.title}</h3>
        <div className="meta">
          {when}
          {e.location ? ` · ${e.location}` : ""}
        </div>
        {e.description && <p>{e.description}</p>}
        {link && (
          <a className="link" href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
            Подробнее →
          </a>
        )}
      </div>
    </article>
  );
}
