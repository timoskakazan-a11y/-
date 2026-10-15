import type { Album } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { Shape, lookFor } from "./Shape";

export function AlbumCard({ a }: { a: Album; n?: number }) {
  const url = safeUrl(a.url);
  if (!url) return null;
  const cover = safeUrl(a.cover_url);
  const date = a.album_date
    ? new Date(a.album_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const look = lookFor(a.id);
  return (
    <a className="pf-album" href={url} target="_blank" rel="noopener noreferrer">
      <div className={`pf-album-cover ${cover ? "" : look.color}`} style={cover ? { backgroundImage: `url("${cover.replace(/"/g, "%22")}")` } : undefined}>
        {!cover && <Shape name={look.shape} size="46%" />}
      </div>
      <div className="pf-album-body">
        <h3>{a.title}</h3>
        <span>{date ?? "Альбом ВКонтакте"}</span>
      </div>
    </a>
  );
}
