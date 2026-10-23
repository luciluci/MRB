"use client";

import { useEffect, useState } from "react";
import { CATALOGUE_BATCH_SIZE, catalogueHref, readCatalogueView, type CatalogueView } from "./catalogue-view";

export function useShoppingEntry() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState(false);
  const [initialSearch, setInitialSearch] = useState("");
  const [entryFocus, setEntryFocus] = useState<"seller" | "catalogue" | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 680px)");
    const update = () => setMobile(query.matches);
    update();
    setInitialSearch(readCatalogueView(window.location.search).search);
    // A plain home visit starts again. Catalogue links retain their explicit
    // choice across refresh and returning from a product detail page.
    const mode = new URLSearchParams(window.location.search).get("sort");
    setChosen(mode === "fastest" || mode === "cheapest" || mode === "exact");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function choose(mode: CatalogueView["sortMode"], search: string) {
    const current = readCatalogueView(window.location.search);
    const next = { ...current, sortMode: mode, search, category: "All" as const, selectedSellerId: mode === "exact" ? current.selectedSellerId : null, limit: CATALOGUE_BATCH_SIZE };
    window.history.replaceState(null, "", catalogueHref(next));
    try {
      // This is a fresh entry, not a return from a product detail page.
      sessionStorage.removeItem("mrb-catalogue-position");
    } catch { /* Keep the choice in memory for this visit. */ }
    setEntryFocus(mode === "exact" ? "seller" : "catalogue");
    setChosen(true);
  }

  return { ready: mobile !== null, showWelcome: mobile === true && !chosen, initialSearch, choose, entryFocus, clearEntryFocus: () => setEntryFocus(null) };
}
