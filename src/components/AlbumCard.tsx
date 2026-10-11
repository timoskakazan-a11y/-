import type { Album } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { Icon } from "./Icon";

export function AlbumCard({ a }: { a: Album; n?: number }) {
  const url = safeUrl(a.url);
  const cover = safeUrl(a.cover_url);
  if (!url) return null;
  const date = a.album_date
    ? new Date(a.album_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "ВКонтакте";
  return (
    <a className="album" href={url} target="_blank" rel="noopener noreferrer">
      <div
        className={cover ? "album-cover" : "album-cover placeholder"}
        style={cover ? { backgroundImage: `url("${cover.replace(/"/g, "%22")}")` } : undefined}
      >
        {!cover && <Icon name="image" size={30} />}
      </div>
      <div className="album-info">
        <h3>{a.title}</h3>
        <span>{date}</span>
      </div>
    </a>
  );
}
