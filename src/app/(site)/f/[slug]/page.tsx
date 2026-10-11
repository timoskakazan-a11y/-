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
        <div className="done">
          <h1 className="form-title">{r.title}</h1>
          <p className="muted" style={{ margin: "8px 0 24px" }}>Приём ответов на эту форму закрыт.</p>
          <Link href="/" className="btn btn-secondary">На главную</Link>
        </div>
      )}
      {r.status === "error" && (
        <div className="done">
          <h1 className="form-title">Не удалось загрузить форму</h1>
          <p className="muted" style={{ margin: "8px 0 24px" }}>Похоже, временный сбой связи. Попробуйте обновить страницу.</p>
          <RetryButton />
        </div>
      )}
    </div>
  );
}
