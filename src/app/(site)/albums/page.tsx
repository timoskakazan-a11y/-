import type { Metadata } from "next";
import { getAlbums } from "@/lib/data";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "Плёнка" };

export default async function AlbumsPage() {
  const albums = await getAlbums();
  return (
    <div className="container page">
      <span className="kicker">Раздел 02</span>
      <h1 style={{ marginTop: 8 }}>Плёнка</h1>
      <p className="hero-lead" style={{ marginTop: 12 }}>Фотографии с мероприятий. Нажмите на кадр — откроется альбом ВКонтакте.</p>
      <div style={{ marginTop: 36 }}>
        {albums === null ? (
          <Unavailable />
        ) : albums.length === 0 ? (
          <div className="empty">плёнка ещё проявляется…</div>
        ) : (
          <div className="film">{albums.map((a, i) => <AlbumCard key={a.id} a={a} n={i} />)}</div>
        )}
      </div>
    </div>
  );
}
