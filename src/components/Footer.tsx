import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div>
          <strong style={{ color: "var(--ink)" }}>{site.name}</strong>
          <div>{site.school}</div>
          <div>{site.address}</div>
        </div>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <Link href="/events">Мероприятия</Link>
          <Link href="/albums">Фотоархив</Link>
          <Link href="/about">О медиацентре</Link>
        </div>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          {site.links.vk && <a href={site.links.vk} target="_blank" rel="noopener noreferrer">ВКонтакте</a>}
          {site.links.telegram && <a href={site.links.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>}
          <span>© {new Date().getFullYear()} Медиацентр 71</span>
        </div>
      </div>
    </footer>
  );
}
