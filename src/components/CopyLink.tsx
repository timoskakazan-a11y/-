"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function CopyLink({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  return (
    <div className="share">
      <div className="share-url">{url}</div>
      <div className="row">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Скопировано" : "Копировать"}
        </button>
        {canShare && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigator.share({ title, url }).catch(() => {})}>
            <Icon name="share" size={16} /> Поделиться
          </button>
        )}
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={16} /> Открыть
        </a>
      </div>
    </div>
  );
}
