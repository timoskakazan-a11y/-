import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container narrow done">
        <div className="muted" style={{ fontSize: "3rem", fontWeight: 650, letterSpacing: "-.03em" }}>404</div>
        <h1 style={{ fontSize: "1.5rem", marginTop: 8 }}>Страница не найдена</h1>
        <p className="muted" style={{ margin: "8px 0 24px" }}>Возможно, ссылка устарела или в ней опечатка.</p>
        <Link href="/" className="btn">На главную</Link>
      </main>
      <Footer />
    </>
  );
}
