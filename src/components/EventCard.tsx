import type { EventItem } from "@/lib/data";
import { safeUrl } from "@/lib/format";

const TZ = "Europe/Moscow";

export function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString("ru-RU", { day: "numeric", timeZone: TZ });
  const month = d.toLocaleDateString("ru-RU", { month: "short", timeZone: TZ }).replace(".", "");
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long", timeZone: TZ });
  const link = safeUrl(e.link_url);
  return (
    <article className="ticket">
      <div className="ticket-stub" aria-hidden>
        <b>{day}</b>
        <span>{month}</span>
        <i>{time}</i>
      </div>
      <div className="ticket-body">
        <h3>{e.title}</h3>
        <div className="ticket-meta">
          {weekday}, {time}
          {e.location ? ` · ${e.location}` : ""}
        </div>
        {e.description && <p>{e.description}</p>}
        {link && (
          <a className="link" href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12 }}>
            Подробнее →
          </a>
        )}
      </div>
    </article>
  );
}
