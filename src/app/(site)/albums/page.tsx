import type { Metadata } from "next";
import { getAlbums } from "@/lib/data";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "Фотоархив" };

export default async function AlbumsPage() {
  const albums = await getAlbums();
  return (
    <div className="container page">
      <h1>Фотоархив</h1>
      <p className="lead">Фотографии с мероприятий — в альбомах ВКонтакте.</p>
      <div style={{ marginTop: 28 }}>
        {albums === null ? (
          <Unavailable />
        ) : albums.length === 0 ? (
          <div className="empty">Альбомы скоро появятся</div>
        ) : (
          <div className="grid">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
        )}
      </div>
    </div>
  );
}
