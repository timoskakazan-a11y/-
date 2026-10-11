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
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="logo" style={{ marginBottom: 16 }}>
          <span className="logo-mark">71</span>
          <span>Админка медиацентра</span>
        </div>
        <ActionForm action={login} className="stack">
          <label className="field">
            <span className="field-label">Пароль</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" autoFocus />
          </label>
          <SubmitButton pendingText="Проверяем…">Войти</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
