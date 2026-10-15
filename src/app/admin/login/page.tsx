import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { login, loginWithCode } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "Вход для команды", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await getActor()) redirect("/admin");
  const mode = (await searchParams).mode === "password" ? "password" : "code";
  return (
    <main className="auth-page adm">
      <div className="auth-card">
        <LogoMark height={56} bg="#F4F2EE" fg="#16161B" />
        <h1>Вход для команды</h1>
        <p className="muted">Инициативная группа школы №71</p>
        <nav className="segmented" aria-label="Способ входа">
          <Link href="?mode=code" replace aria-current={mode === "code" ? "page" : undefined}>По коду</Link>
          <Link href="?mode=password" replace aria-current={mode === "password" ? "page" : undefined}>Администратор</Link>
        </nav>
        {mode === "code" ? (
          <ActionForm action={loginWithCode} className="stack">
            <label className="field">
              <span className="label">Код доступа</span>
              <input className="input code-input" name="code" required autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-2345" maxLength={12} autoFocus />
              <span className="hint">Код выдаёт администратор. Он личный — не передавайте его.</span>
            </label>
            <SubmitButton className="btn btn-primary btn-lg btn-block" pendingText="Проверяем…">Войти</SubmitButton>
          </ActionForm>
        ) : (
          <ActionForm action={login} className="stack">
            <label className="field">
              <span className="label">Пароль администратора</span>
              <input className="input" type="password" name="password" required autoComplete="current-password" autoFocus />
            </label>
            <SubmitButton className="btn btn-primary btn-lg btn-block" pendingText="Проверяем…">Войти</SubmitButton>
          </ActionForm>
        )}
        <p className="auth-foot">Староста? <Link href="/s/login">Вход для старост</Link></p>
      </div>
    </main>
  );
}
