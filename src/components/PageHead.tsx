import Link from "next/link";
import { Shape, type ShapeName } from "./Shape";

export function PageHead({ title, lead, shape = "star", color = "ig-yellow" }: { title: string; lead?: string; shape?: ShapeName; color?: string }) {
  return (
    <div className="pf-pagehead">
      <div className="container">
        <nav className="pf-crumbs" aria-label="Навигация"><Link href="/">Главная</Link><span>/</span><span>{title}</span></nav>
        <h1>
          {title} <span className={`ig-chip ${color}`} aria-hidden><Shape name={shape} size="0.5em" /></span>
        </h1>
        {lead && <p>{lead}</p>}
      </div>
    </div>
  );
}
