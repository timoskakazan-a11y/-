import type { Metadata } from "next";
import { getAlbums } from "@/lib/data";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { Icon } from "@/components/Icon";
import { PageHead } from "@/components/PageHead";

export const revalidate = 60;
export const metadata: Metadata = { title: "Фотоархив" };

export default async function AlbumsPage() {
  const albums = await getAlbums();
  return (
    <>
      <PageHead title="Фотоархив" lead="Фотографии с мероприятий. Альбомы открываются во ВКонтакте." />
      <div className="container" style={{ paddingBottom: 80 }}>
      <div>
        {albums === null ? (
          <Unavailable />
        ) : albums.length === 0 ? (
          <div className="pf-empty"><Icon name="image" size={28} /><p>Альбомы скоро появятся</p></div>
        ) : (
          <div className="pf-albums">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
        )}
      </div>
    </div>
    </>
  );
}
