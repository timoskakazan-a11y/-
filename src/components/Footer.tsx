import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="pf-footer">
      <div className="container">
        <div className="pf-footer-grid">
          <div className="pf-footer-brand">
            <LogoMark height={52} bg="#FFFFFF" fg="#0B1533" />
            <p>Инициативная группа школы №71.<br />Ученики, которые делают школьную жизнь заметной.</p>
          </div>
          <div>
            <h4>Разделы</h4>
            <ul>
              <li><Link href="/events">События</Link></li>
              <li><Link href="/albums">Фотоархив</Link></li>
              <li><Link href="/about">О нас</Link></li>
            </ul>
          </div>
          <div>
            <h4>Контакты</h4>
            <ul>
              <li>{site.school}</li>
              <li>{site.address}</li>
              {site.links.vk && <li><a href={site.links.vk} target="_blank" rel="noopener noreferrer">Сообщество ВКонтакте</a></li>}
              {site.links.telegram && <li><a href={site.links.telegram} target="_blank" rel="noopener noreferrer">Telegram</a></li>}
            </ul>
          </div>
        </div>
        <div className="pf-footer-bottom">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>Опросы на сайте анонимны: имена и IP-адреса не сохраняются</span>
        </div>
      </div>
    </footer>
  );
}
