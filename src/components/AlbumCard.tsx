import type { Album } from "@/lib/data";
import { safeUrl } from "@/lib/format";
import { colorFor } from "@/lib/palette";
import { Folder } from "./Folder";

export function AlbumCard({ a }: { a: Album; n?: number }) {
  const url = safeUrl(a.url);
  if (!url) return null;
  const date = a.album_date
    ? new Date(a.album_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "ВКонтакте";
  return <Folder href={url} external color={colorFor(a.id)} title={a.title} sub={date} icon="camera" cover={safeUrl(a.cover_url)} />;
}
