"use client";
export function RetryButton({ label = "Обновить страницу" }: { label?: string }) {
  return <button className="btn btn-primary" onClick={() => window.location.reload()}>{label}</button>;
}
