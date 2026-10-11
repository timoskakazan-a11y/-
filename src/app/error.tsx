"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container narrow done">
      <h1 style={{ fontSize: "2rem" }}>Плёнку зажевало</h1>
      <p className="form-note" style={{ margin: "8px 0 24px" }}>временный сбой — попробуйте ещё раз через пару секунд</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={() => reset()}>Попробовать снова</button>
        <a className="btn btn-secondary" href="/">На главную</a>
      </div>
    </main>
  );
}
