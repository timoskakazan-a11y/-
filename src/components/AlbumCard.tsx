import type { Album } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { Icon } from "./Icon";

export function AlbumCard({ a, n }: { a: Album; n: number }) {
  const url = safeUrl(a.url);
  const cover = safeUrl(a.cover_url);
  if (!url) return null;
  const date = a.album_date
    ? new Date(a.album_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "альбом ВКонтакте";
  const frame = String(n + 1).padStart(2, "0");
  return (
    <a className="frame" href={url} target="_blank" rel="noopener noreferrer">
      <div className="frame-strip">
        <div className={cover ? "frame-img has-cover" : "frame-img"} style={cover ? { backgroundImage: `url("${cover.replace(/"/g, "%22")}")` } : undefined}>
          {!cover && <Icon name="image" size={32} />}
        </div>
        <div className="frame-edge"><span>▸ {frame}A</span><span>MEDIA 71 · 400</span><span>{frame}</span></div>
      </div>
      <h3>{a.title}</h3>
      <span className="kicker">{date}</span>
    </a>
  );
}
