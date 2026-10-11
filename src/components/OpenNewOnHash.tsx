"use client";
import { useEffect } from "react";
/** Открывает блок «Новая форма», если пришли по ссылке #new */
export function OpenNewOnHash() {
  useEffect(() => {
    if (window.location.hash === "#new") (document.getElementById("new") as HTMLDetailsElement | null)?.setAttribute("open", "");
  }, []);
  return null;
}
