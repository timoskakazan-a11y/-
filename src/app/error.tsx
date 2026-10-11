"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container narrow done">
      <h1 style={{ fontSize: "1.5rem" }}>Что-то пошло не так</h1>
      <p className="muted" style={{ margin: "8px 0 24px" }}>Временный сбой. Попробуйте ещё раз через несколько секунд.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={() => reset()}>Попробовать снова</button>
        <a className="btn btn-secondary" href="/">На главную</a>
      </div>
    </main>
  );
}
