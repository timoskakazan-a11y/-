import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Directions, JoinBanner } from "@/components/Sections";
import { PageHead } from "@/components/PageHead";

export const metadata: Metadata = { title: "О нас" };

export default function AboutPage() {
  return (
    <>
      <PageHead shape="star" color="ig-mint" title="О нас" lead="Мы — ученики школы №71, которые придумывают и проводят школьные события и рассказывают о них так, чтобы школу хотелось запомнить." />
      <section style={{ paddingBottom: 16 }}>
        <div className="container">
          <div className="pf-section-head"><h2>Направления</h2></div>
          <Directions />
        </div>
      </section>
      <div className="container">
        <div className="pf-info">
          <div><span className="pf-label">Где нас найти</span><p>{site.school}<br />{site.address}</p></div>
          <div><span className="pf-label">Как вступить</span><p>Подойди к нам на перемене или напиши в сообщество ВКонтакте</p></div>
        </div>
      </div>
      <div className="container" style={{ paddingBottom: 80 }}>
        <JoinBanner />
      </div>
    </>
  );
}
