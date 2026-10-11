"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container section">
      <div className="card success">
        <h1 style={{ fontSize: "1.8rem" }}>Что-то пошло не так</h1>
        <p className="muted">Временный сбой. Попробуйте ещё раз через несколько секунд.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => reset()}>Попробовать снова</button>
          <a className="btn btn-ghost" href="/">На главную</a>
        </div>
      </div>
    </main>
  );
}
