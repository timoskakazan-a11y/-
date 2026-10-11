"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container narrow done">
      <h1 style={{ fontSize: 28 }}>Что-то пошло не так</h1>
      <p className="muted" style={{ margin: "8px 0 28px" }}>Временный сбой. Попробуйте ещё раз через пару секунд.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={() => reset()}>Попробовать снова</button>
        <a className="btn" href="/">На главную</a>
      </div>
    </main>
  );
}
