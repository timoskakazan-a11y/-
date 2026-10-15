import Link from "next/link";

export function PageHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="pf-pagehead">
      <div className="container">
        <nav className="pf-crumbs" aria-label="Навигация"><Link href="/">Главная</Link><span>/</span><span>{title}</span></nav>
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
    </div>
  );
}
