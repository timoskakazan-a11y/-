"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <h1>Временный сбой</h1>
        <p>Обновите страницу через несколько секунд.</p>
        <button onClick={() => reset()}>Попробовать снова</button>
      </body>
    </html>
  );
}
