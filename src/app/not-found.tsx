import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container section">
        <div className="card success">
          <div style={{ fontSize: "4rem", fontWeight: 800, color: "var(--accent)" }}>404</div>
          <h1 style={{ fontSize: "1.8rem" }}>Такой страницы нет</h1>
          <p className="muted">Возможно, ссылка устарела или в ней опечатка.</p>
          <Link href="/" className="btn">На главную</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
