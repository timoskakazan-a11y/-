import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/data";
import { FormClient } from "./FormClient";
import { RetryButton } from "@/components/RetryButton";

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
    <div className="container narrow form-page">
      {r.status === "ok" && <FormClient form={r.form} />}
      {r.status === "closed" && (
        <div className="blank">
          <div className="blank-top"><span>Бланк</span><span>Архив</span></div>
          <div className="done">
            <div className="done-stamp" style={{ color: "var(--blue)", borderColor: "var(--blue)", animation: "none" }}>ЗАКРЫТО</div>
            <p className="form-title" style={{ fontSize: "1.5rem", maxWidth: "none", margin: "28px auto 0" }}>{r.title}</p>
            <p className="form-note" style={{ margin: "6px 0 24px" }}>приём ответов закончился</p>
            <Link href="/" className="btn btn-secondary">На главную</Link>
          </div>
        </div>
      )}
      {r.status === "error" && (
        <div className="blank">
          <div className="done">
            <p className="form-title" style={{ fontSize: "1.6rem", maxWidth: "none" }}>Не удалось загрузить форму</p>
            <p className="form-note" style={{ margin: "8px 0 24px" }}>похоже, сбой связи — обновите страницу</p>
            <RetryButton />
          </div>
        </div>
      )}
    </div>
  );
}
