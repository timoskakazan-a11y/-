import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { login } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Вход", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="container" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="wordmark" style={{ marginBottom: 28 }}>МЕДИА<b>71</b></div>
        <span className="kicker">Только для редакции</span>
        <h1 style={{ fontSize: "2.2rem", margin: "6px 0 20px" }}>Вход</h1>
        <ActionForm action={login} className="card stack">
          <label className="field">
            <span className="label">Пароль</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" autoFocus />
          </label>
          <SubmitButton className="btn btn-primary btn-lg btn-block" pendingText="Проверяем…">Войти</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
