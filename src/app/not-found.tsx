import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container narrow done">
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--blue)" }}>404</div>
        <h1 style={{ fontSize: 28, marginTop: 8 }}>Страница не найдена</h1>
        <p className="muted" style={{ margin: "8px 0 28px" }}>Возможно, ссылка устарела или в ней опечатка.</p>
        <Link href="/" className="btn btn-primary">На главную</Link>
      </main>
      <Footer />
    </>
  );
}
