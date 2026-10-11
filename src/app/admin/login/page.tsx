import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { login } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LogoFull } from "@/components/Logo";

export const metadata: Metadata = { title: "Вход", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="container" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><LogoFull height={150} /></div>
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
