import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./NavLinks";

function issue() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+now - +start) / 86400000 + start.getUTCDay() + 1) / 7);
  const date = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Moscow" });
  return { week, date };
}

export function Header() {
  const { week, date } = issue();
  return (
    <header className="masthead">
      <div className="masthead-top">
        <div className="container kicker">
          <span>Выпуск № {week} · {date}</span>
          <span className="hide-sm">Казань · Волгоградская</span>
          <span>Школа №71</span>
        </div>
      </div>
      <div className="masthead-main">
        <div className="container">
          <Link href="/" className="wordmark" aria-label={site.name}>
            МЕДИА<b>71</b>
          </Link>
          <NavLinks />
        </div>
      </div>
    </header>
  );
}
