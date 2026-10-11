"use client";
export function RetryButton({ label = "Обновить страницу" }: { label?: string }) {
  return <button className="btn" onClick={() => window.location.reload()}>{label}</button>;
}
