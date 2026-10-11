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
        <span className="logo-mark" style={{ width: 64, height: 64, borderRadius: 18, fontSize: 24, margin: "0 auto 20px" }}>71</span>
        <h1 style={{ fontSize: 28, textAlign: "center" }}>Медиацентр 71</h1>
        <p className="muted" style={{ textAlign: "center", margin: "6px 0 28px" }}>Вход для редакции</p>
        <ActionForm action={login} className="stack">
          <label className="field">
            <span className="label">Пароль</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" autoFocus />
          </label>
          <SubmitButton className="btn btn-brand btn-lg btn-block" pendingText="Проверяем…">Войти</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
