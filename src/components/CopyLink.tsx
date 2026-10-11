"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function CopyLink({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  return (
    <div className="list">
      <div className="cell cell-inline">
        <span className="share-link truncate">{url.replace(/^https?:\/\//, "")}</span>
        <a className="btn btn-ghost btn-sm btn-icon" href={url} target="_blank" rel="noopener noreferrer" title="Открыть" aria-label="Открыть форму">
          <Icon name="external" size={18} />
        </a>
      </div>
      <div className="cell" style={{ gap: 8, paddingTop: 10, paddingBottom: 12 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Скопировано" : "Скопировать"}
        </button>
        {canShare && (
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => navigator.share({ title, url }).catch(() => {})}>
            <Icon name="share" size={16} /> Поделиться
          </button>
        )}
      </div>
    </div>
  );
}
