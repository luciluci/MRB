import assert from "node:assert/strict";
import test from "node:test";
import { catalogueHref, readCatalogueView } from "./catalogue-view";
import { filterCatalogue } from "./catalogue-view";
import { createSeedState } from "./seed";
import { listOffers } from "./domain";

test("Exact persists the chosen seller and loaded count in catalogue links", () => {
  const view = { ...readCatalogueView(""), sortMode: "exact" as const, selectedSellerId: "iasi-daily-express", limit: 48 };
  assert.deepEqual(readCatalogueView(catalogueHref(view).split("?")[1]), view);
});

test("Exact only shows the chosen seller, even when other sellers are cheaper or faster", () => {
  const state = createSeedState();
  // Keep both competing sellers within the customer's 2 km search area.
  state.customer = { address: "Iași test location", lat: 47.166, lng: 27.600 };
  const listings = listOffers(state.products, state.offers, state.stores, state.customer, new Date(state.demoTime));
  assert.ok(listings.some(listing => listing.store.id === "iasi-daily-express" && listing.available));
  const view = { ...readCatalogueView(""), sortMode: "exact" as const, selectedSellerId: "iasi-market-value", search: "milk" };
  const matches = filterCatalogue(listings, view);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].store.id, "iasi-market-value");
  assert.equal(filterCatalogue(listings, { ...view, search: "Daily Express" }).length, 0);
});

test("Exact never falls back to another seller when none is chosen, missing, or closed", () => {
  const state = createSeedState();
  const listings = listOffers(state.products, state.offers, state.stores, state.customer, new Date("2026-10-19T16:30:00Z"));
  for (const selectedSellerId of [null, "unknown", "iasi-fieldhouse"]) {
    assert.deepEqual(filterCatalogue(listings, { ...readCatalogueView(""), sortMode: "exact", selectedSellerId }), []);
  }
});

test("catalogue links round-trip search, seller, category, sorting and loaded batches", () => {
  const view = { search: "café & milk", category: "Groceries" as const, selectedSellerId: "iasi-market-value", sortMode: "cheapest" as const, limit: 72 };
  assert.deepEqual(readCatalogueView(catalogueHref(view).split("?")[1]), view);
});

test("invalid or unbounded catalogue URL values fall back to a usable first batch", () => {
  for (const shown of ["-24", "0", "25", "Infinity", "NaN", "1e20", "24.5", "99999999999999999999"]) {
    const view = readCatalogueView(`shown=${shown}&category=unknown&sort=invalid`);
    assert.equal(view.limit, 24);
    assert.equal(view.category, "All");
    assert.equal(view.sortMode, "fastest");
  }
});

test("an empty catalogue URL starts at 24 offers with all categories", () => {
  assert.deepEqual(readCatalogueView(""), { search: "", category: "All", selectedSellerId: null, sortMode: "fastest", limit: 24 });
});
