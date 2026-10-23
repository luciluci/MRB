import assert from "node:assert/strict";
import test from "node:test";
import { haversineKm, isStoreOpenAt, listOffers, transitionOrder } from "./domain";
import type { Order, Product, Store } from "./types";

const store: Store = {
  id: "store-1", name: "Test Store", category: "Groceries", address: "Bucharest",
  lat: 44.4268, lng: 26.1025, radiusKm: 5, prepMinutes: 20,
  hours: { 0: [], 1: [["09:00", "18:00"]], 2: [["09:00", "18:00"]], 3: [["09:00", "18:00"]], 4: [["09:00", "18:00"]], 5: [["09:00", "18:00"]], 6: [] },
};

test("distance is zero for identical coordinates and roughly 111 km per latitude degree", () => {
  assert.equal(haversineKm({ lat: 44, lng: 26 }, { lat: 44, lng: 26 }), 0);
  assert.ok(Math.abs(haversineKm({ lat: 44, lng: 26 }, { lat: 45, lng: 26 }) - 111) < 1);
});

test("store schedule uses Bucharest time and excludes the closing boundary", () => {
  assert.equal(isStoreOpenAt(store, new Date("2026-10-19T05:59:00Z")), false);
  assert.equal(isStoreOpenAt(store, new Date("2026-10-19T06:00:00Z")), true);
  assert.equal(isStoreOpenAt(store, new Date("2026-10-19T15:00:00Z")), false);
});

test("listing rejects distant and out-of-stock offers and ranks available offers first", () => {
  const products: Product[] = [{ id: "p1", name: "Milk", category: "Groceries", unit: "1 L", emoji: "🥛", description: "Fresh milk" }];
  const stores = [store, { ...store, id: "store-2", name: "Far Store", lat: 44.7 }];
  const offers = [
    { id: "o1", productId: "p1", storeId: "store-1", price: 8, stock: "in" as const, updatedAt: "2026-10-19T08:00:00Z" },
    { id: "o2", productId: "p1", storeId: "store-2", price: 7, stock: "in" as const, updatedAt: "2026-10-19T08:00:00Z" },
    { id: "o3", productId: "p1", storeId: "store-1", price: 6, stock: "out" as const, updatedAt: "2026-10-19T08:00:00Z" },
  ];
  const result = listOffers(products, offers, stores, { lat: 44.43, lng: 26.10, address: "Home" }, new Date("2026-10-19T08:00:00Z"));
  assert.equal(result[0].offer.id, "o1");
  assert.equal(result[0].available, true);
  assert.equal(result.find(x => x.offer.id === "o2")?.reason, "Outside delivery area");
  assert.equal(result.find(x => x.offer.id === "o3")?.reason, "Out of stock");
});

test("order transitions reject invalid actions and do not mutate the input", () => {
  const order: Order = {
    id: "ord-1", storeId: "store-1", items: [{ offerId: "o1", quantity: 1, unitPrice: 8 }],
    customerAddress: "Home", customerLat: 44.43, customerLng: 26.10,
    status: "placed", subtotal: 8, deliveryFee: 9, platformFee: 0.32, total: 17.32,
    createdAt: "2026-10-19T08:00:00Z", courierId: null,
  };
  assert.equal(transitionOrder(order, { type: "merchantAccept" }).status, "accepted");
  assert.equal(order.status, "placed");
  assert.throws(() => transitionOrder(order, { type: "courierPickup" }), /Cannot/);
  const ready = transitionOrder(transitionOrder(order, { type: "merchantAccept" }), { type: "merchantReady" });
  const assigned = transitionOrder(ready, { type: "courierAccept", courierId: "driver-1" });
  assert.equal(assigned.status, "assigned");
  assert.throws(() => transitionOrder(assigned, { type: "courierAccept", courierId: "driver-2" }), /Cannot/);
});

test("customer discovery respects both the 2 km search limit and the store delivery radius", () => {
  const products: Product[] = [{ id: "p1", name: "Milk", category: "Groceries", unit: "1 L", emoji: "🥛", description: "Fresh milk" }];
  const offers = [{ id: "o1", productId: "p1", storeId: store.id, price: 8, stock: "in" as const, updatedAt: "2026-10-19T08:00:00Z" }];
  const at = new Date("2026-10-19T08:00:00Z");
  const customerAt = (km: number) => ({ address: "Test location", lat: store.lat + km / 6371 * 180 / Math.PI, lng: store.lng });
  const listing = (km: number, radiusKm: number) =>
    listOffers(products, offers, [{ ...store, radiusKm }], customerAt(km), at)[0];
  assert.equal(listing(1.999, 2).available, true);
  assert.equal(listing(2.001, 2).available, false);
  assert.equal(listing(2.001, 5).available, false);
  assert.equal(listing(1.6, 1.5).available, false);
});
