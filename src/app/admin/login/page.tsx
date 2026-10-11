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
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark">71</span>
          <span>Медиацентр 71</span>
        </div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 20 }}>Вход в админку</h1>
        <ActionForm action={login} className="stack">
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
