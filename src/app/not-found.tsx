import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container narrow done">
        <div className="done-stamp" style={{ animation: "none" }}>404</div>
        <h1 style={{ fontSize: "2rem", marginTop: 28 }}>Кадр потерялся</h1>
        <p className="form-note" style={{ margin: "8px 0 24px" }}>такой страницы нет — возможно, ссылка устарела</p>
        <Link href="/" className="btn">На главную</Link>
      </main>
      <Footer />
    </>
  );
}
