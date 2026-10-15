import type { EventItem } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { Icon } from "./Icon";
import { Shape, lookFor } from "./Shape";

const TZ = "Europe/Moscow";

export function eventDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("ru-RU", { day: "numeric", timeZone: TZ }),
    month: d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: TZ }).replace(/^\d+\s/, ""),
    weekday: d.toLocaleDateString("ru-RU", { weekday: "long", timeZone: TZ }),
    time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ }),
  };
}

export function EventCard({ e }: { e: EventItem }) {
  const { day, month, weekday, time } = eventDate(e.starts_at);
  const look = lookFor(e.id);
  const link = safeUrl(e.link_url);
  return (
    <article className="pf-event">
      <div className={`pf-event-date ${look.color}`} aria-label={`${day} ${month}`}>
        <Shape name={look.shape} className="pf-event-shape" size={88} />
        <b>{day}</b>
        <span>{month}</span>
      </div>
      <div className="pf-event-body">
        <span className="pf-label">{weekday}</span>
        <h3>{e.title}</h3>
        <ul className="pf-meta">
          <li><Icon name="clock" size={16} /> {time}</li>
          {e.location && <li><Icon name="pin" size={16} /> {e.location}</li>}
        </ul>
        {e.description && <p className="pf-event-desc">{e.description}</p>}
        {link && (
          <a className="pf-more" href={link} target="_blank" rel="noopener noreferrer">
            Подробнее <Icon name="arrowRight" size={16} />
          </a>
        )}
      </div>
    </article>
  );
}
