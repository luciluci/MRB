import type { Store } from "./types";

export type StoreLocation = Pick<Store, "id" | "name" | "address" | "lat" | "lng">;

export function groupStoreLocations(stores: StoreLocation[]) {
  const groups = new Map<string, { lat: number; lng: number; stores: StoreLocation[] }>();
  for (const store of stores) {
    const key = `${store.lat},${store.lng}`;
    const group = groups.get(key) ?? { lat: store.lat, lng: store.lng, stores: [] };
    group.stores.push(store);
    groups.set(key, group);
  }
  return [...groups.values()];
}
