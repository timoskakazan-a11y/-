import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/data";
import { FormClient } from "./FormClient";
import { RetryButton } from "@/components/RetryButton";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getPublicForm(slug);
  const title = r.status === "ok" ? r.form.title : r.status === "closed" ? r.title : "Форма";
  return { title, robots: { index: false, follow: false } };
}

export default async function FormPage({ params }: Props) {
  const { slug } = await params;
  const r = await getPublicForm(slug);

  if (r.status === "not_found") notFound();

  return (
    <div className="fx-page"><div className="container narrow" style={{ maxWidth: 600 }}>
      {r.status === "ok" && <FormClient form={r.form} />}
      {r.status === "closed" && (
        <div className="fx-hero tile-lilac fx-done">
          <span className="fx-done-icon"><Icon name="lock" size={30} weight={2.6} /></span>
          <h1 className="fx-title">{r.title}</h1>
          <p className="fx-desc">Приём ответов на эту форму закрыт</p>
          <div className="fx-done-actions"><Link href="/" className="fx-glass-chip">На главную</Link></div>
        </div>
      )}
      {r.status === "error" && (
        <div className="fx-hero tile-pink fx-done">
          <span className="fx-done-icon"><Icon name="x" size={30} weight={2.8} /></span>
          <h1 className="fx-title">Не удалось загрузить форму</h1>
          <p className="fx-desc">Похоже, сбой связи. Попробуйте обновить страницу.</p>
          <div className="fx-done-actions"><RetryButton /></div>
        </div>
      )}
    </div></div>
  );
}
