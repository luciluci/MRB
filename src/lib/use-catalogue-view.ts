"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { CATALOGUE_BATCH_SIZE, catalogueHref, readCatalogueView, type CatalogueView } from "./catalogue-view";

const storageKey = "mrb-catalogue-position";
type Position = { href: string; context: string; y: number };
function readPosition(): Position | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (saved && typeof saved.href === "string" && saved.href.startsWith("/?")
      && typeof saved.context === "string" && Number.isFinite(saved.y) && saved.y >= 0) {
      return { ...saved, href: catalogueHref(readCatalogueView(saved.href.slice(2))) };
    }
  } catch { /* Browsing remains available without session storage. */ }
  return null;
}
function savePosition(position: Position) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(position)); } catch { /* Storage is optional. */ }
}

// URL settings survive refresh/Back; session storage only remembers the return
// link and scroll position. Detail pages must never overwrite the catalogue.
export function useCatalogueView(enabled: boolean, context: string) {
  const [view, setView] = useState(() => readCatalogueView(""));
  const [ready, setReady] = useState(false);
  const [backHref, setBackHref] = useState("/");
  const previousContext = useRef(context);
  const restoreY = useRef<number | null>(null);
  const resetScroll = useRef(false);

  useLayoutEffect(() => {
    const saved = readPosition();
    setBackHref(saved?.href ?? "/");
    if (!enabled) {
      if (saved) setView(readCatalogueView(saved.href.slice(2)));
      setReady(false);
      return;
    }
    function restore() {
      const position = readPosition();
      const next = readCatalogueView(window.location.search);
      if (position && position.context !== previousContext.current) next.limit = CATALOGUE_BATCH_SIZE;
      restoreY.current = position?.href === catalogueHref(next) && position.context === previousContext.current && !window.location.hash ? position.y : null;
      setView(next);
      setReady(true);
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
    // Context changes below reset batches without re-reading stale URL settings.
  }, [enabled]);

  useLayoutEffect(() => {
    if (previousContext.current === context) return;
    previousContext.current = context;
    restoreY.current = null;
    resetScroll.current = true;
    setView(current => ({ ...current, limit: CATALOGUE_BATCH_SIZE }));
  }, [context]);

  useLayoutEffect(() => {
    if (!enabled || !ready) return;
    const href = catalogueHref(view);
    // An earlier "Explore nearby" anchor must not override the position when
    // returning from details after loading/filtering the catalogue.
    window.history.replaceState(null, "", href);
    setBackHref(href);
    if (resetScroll.current) {
      resetScroll.current = false;
      const section = document.querySelector(".products-section");
      if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: "start" });
    }
    const y = restoreY.current;
    restoreY.current = null;
    if (y !== null) window.scrollTo({ top: y, behavior: "instant" });
    savePosition({ href, context, y: y ?? window.scrollY });
  }, [enabled, ready, view, context]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const remember = () => savePosition({ href: catalogueHref(view), context, y: window.scrollY });
    window.addEventListener("pagehide", remember);
    window.addEventListener("beforeunload", remember);
    return () => {
      window.removeEventListener("pagehide", remember);
      window.removeEventListener("beforeunload", remember);
    };
  }, [enabled, ready, view, context]);

  function updateFilters(patch: Partial<Omit<CatalogueView, "limit">>) {
    if (Object.entries(patch).every(([key, value]) => view[key as keyof CatalogueView] === value)) return;
    resetScroll.current = true;
    setView(current => ({ ...current, ...patch, limit: CATALOGUE_BATCH_SIZE }));
  }
  function rememberProductNavigation(event: MouseEvent) {
    const link = (event.target as Element).closest("a");
    if (enabled && link?.getAttribute("href")?.startsWith("/products/")) {
      const href = catalogueHref(view);
      if (window.location.hash) window.history.replaceState(null, "", href);
      savePosition({ href, context, y: window.scrollY });
    }
  }
  return {
    ...view, ready, backHref, updateFilters, rememberProductNavigation,
    loadMore: () => setView(current => ({ ...current, limit: current.limit + CATALOGUE_BATCH_SIZE })),
  };
}
