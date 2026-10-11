import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <span>{site.school} · {site.address}</span>
          <span className="row" style={{ gap: 20 }}>
            {site.links.vk && <a href={site.links.vk} target="_blank" rel="noopener noreferrer">ВКонтакте</a>}
            {site.links.telegram && <a href={site.links.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>}
            <span>© {new Date().getFullYear()}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
