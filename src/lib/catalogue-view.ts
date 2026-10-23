import type { Category, Listing } from "./types";

export const CATALOGUE_BATCH_SIZE = 24;
export type CatalogueView = {
  category: "All" | Category;
  sortMode: "fastest" | "cheapest" | "exact";
  search: string;
  selectedSellerId: string | null;
  limit: number;
};
const categories = ["All", "Food", "Groceries", "Electronics", "Flowers", "Sports"];

export function readCatalogueView(search: string): CatalogueView {
  const params = new URLSearchParams(search);
  const limit = Number(params.get("shown"));
  return {
    category: categories.includes(params.get("category") ?? "") ? params.get("category") as CatalogueView["category"] : "All",
    sortMode: params.get("sort") === "exact" ? "exact" : params.get("sort") === "cheapest" ? "cheapest" : "fastest",
    search: params.get("q") ?? "",
    selectedSellerId: params.get("seller") || null,
    limit: Number.isSafeInteger(limit) && limit >= CATALOGUE_BATCH_SIZE && limit <= 24000 && limit % CATALOGUE_BATCH_SIZE === 0 ? limit : CATALOGUE_BATCH_SIZE,
  };
}

export function filterCatalogue(listings: Listing[], view: CatalogueView): Listing[] {
  const sellerExists = listings.some(item => item.store.id === view.selectedSellerId);
  if (view.sortMode === "exact" && !sellerExists) return [];
  const query = view.search.trim().toLowerCase();
  return listings.filter(item => item.available
    && (!sellerExists || item.store.id === view.selectedSellerId)
    && (view.category === "All" || item.product.category === view.category)
    && `${item.product.name} ${item.store.name} ${item.product.description}`.toLowerCase().includes(query))
    .sort((a, b) => view.sortMode === "exact"
      ? a.product.name.localeCompare(b.product.name) || a.offer.id.localeCompare(b.offer.id)
      : view.sortMode === "cheapest"
        ? a.offer.price - b.offer.price || a.etaMinutes - b.etaMinutes
        : a.etaMinutes - b.etaMinutes || a.offer.price - b.offer.price)
    .filter((listing, index, matches) => matches.findIndex(item => item.product.id === listing.product.id && item.store.id === listing.store.id) === index);
}

export function catalogueHref(view: CatalogueView): string {
  const params = new URLSearchParams();
  if (view.search) params.set("q", view.search);
  if (view.category !== "All") params.set("category", view.category);
  if (view.selectedSellerId) params.set("seller", view.selectedSellerId);
  params.set("sort", view.sortMode);
  params.set("shown", String(view.limit));
  return `/?${params}`;
}
