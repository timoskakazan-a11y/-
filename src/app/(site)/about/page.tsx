import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Icon, type IconName } from "@/components/Icon";

export const metadata: Metadata = { title: "О нас" };

const directions: { icon: IconName; t: string; d: string }[] = [
  { icon: "camera", t: "Фото", d: "Репортажи с праздников и линеек" },
  { icon: "asterisk", t: "События", d: "Праздники, акции, дискотеки" },
  { icon: "mic", t: "Тексты", d: "Новости, интервью, посты" },
  { icon: "music", t: "Музыка", d: "Плейлисты из ваших заявок" },
];

export default function AboutPage() {
  return (
    <div className="container page">
      <h1 className="title-xl">Кто мы</h1>
      <p className="page-lead">
        Ученики школы №71, которые придумывают и проводят школьные события и рассказывают о них — так, чтобы школу хотелось запомнить.
      </p>

      <div className="tiles" style={{ marginTop: 32 }}>
        {directions.map((x, i) => (
          <div key={x.t} className={`tile ${["tile-yellow", "tile-sky", "tile-lilac", "tile-pink"][i]}`}>
            <div><h3>{x.t}</h3><p>{x.d}</p></div>
            <Icon name={x.icon} size={44} weight={2.8} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h2>Хочешь в команду?</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Неважно, умеешь ли ты снимать — научим. Подойди к нам на перемене или напиши в сообщество.
        </p>
        <p className="xs muted" style={{ marginTop: 16 }}>{site.address}</p>
      </div>
    </div>
  );
}
