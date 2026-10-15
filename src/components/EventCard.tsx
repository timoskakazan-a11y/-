import type { EventItem } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { Icon } from "./Icon";

const TZ = "Europe/Moscow";

export function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString("ru-RU", { day: "numeric", timeZone: TZ });
  const month = d.toLocaleDateString("ru-RU", { month: "long", timeZone: TZ });
  const monthShort = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: TZ }).replace(/^\d+\s/, "");
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long", timeZone: TZ });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const link = safeUrl(e.link_url);
  return (
    <article className="pf-event">
      <div className="pf-event-date" aria-label={`${day} ${monthShort}`}>
        <b>{day}</b>
        <span>{monthShort || month}</span>
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
