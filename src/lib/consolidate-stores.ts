import type { DemoState } from "./types";

// These are the six original demo shops, not name-based matches between branches.
const legacyStoreIds = ["urban-grocer", "bean-bowl", "volt-lab", "petal-house", "fieldhouse", "pixel-point"];
const canonicalStoreId = (id: string) => legacyStoreIds.includes(id) ? `iasi-${id}` : id;
const canonicalOfferId = (id: string) =>
  legacyStoreIds.some(storeId => id.startsWith(`${storeId}-`)) ? `iasi-${id}` : id;

export function consolidateStores(state: DemoState): DemoState {
  const stores = new Map(state.stores.filter(store => canonicalStoreId(store.id) === store.id).map(store => [store.id, store]));
  for (const old of state.stores.filter(store => canonicalStoreId(store.id) !== store.id)) {
    const id = canonicalStoreId(old.id);
    const current = stores.get(id);
    const preferOld = !current || (old.settingsRevision ?? 0) >= (current.settingsRevision ?? 0);
    stores.set(id, {
      ...(preferOld ? { ...current, ...old } : { ...old, ...current }),
      id,
      // Invalidate forms opened before the records were consolidated.
      settingsRevision: Math.max(old.settingsRevision ?? 0, current?.settingsRevision ?? 0) + 1,
    });
  }
  const offers = new Map(state.offers.filter(offer => canonicalStoreId(offer.storeId) === offer.storeId).map(offer => [offer.id, offer]));
  for (const old of state.offers.filter(offer => canonicalStoreId(offer.storeId) !== offer.storeId)) {
    const id = canonicalOfferId(old.id);
    const current = offers.get(id);
    const preferOld = !current || Date.parse(old.updatedAt) >= Date.parse(current.updatedAt);
    offers.set(id, {
      ...(preferOld ? { ...current, ...old } : { ...old, ...current }),
      id, storeId: canonicalStoreId(old.storeId),
    });
  }
  return {
    ...state,
    stores: [...stores.values()],
    offers: [...offers.values()],
    orders: state.orders.map(order => ({
      ...order,
      storeId: canonicalStoreId(order.storeId),
      items: order.items.map(item => ({ ...item, offerId: canonicalOfferId(item.offerId) })),
    })),
  };
}
