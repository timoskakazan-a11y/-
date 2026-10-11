"use client";
import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="row" style={{ marginTop: 4 }}>
      <a className="copy" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? "Скопировано ✓" : "Копировать"}
      </button>
    </div>
  );
}
