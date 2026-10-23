import assert from "node:assert/strict";
import test from "node:test";
import { consolidateStores } from "./consolidate-stores";
import { createSeedState } from "./seed";

test("duplicate demo shops merge saved settings and stock without dropping colour offers", () => {
  const state = structuredClone(createSeedState());
  const store = state.stores[0];
  state.stores.push({ ...store, id: "urban-grocer", prepMinutes: 37, acceptingOrders: false, settingsRevision: 2 });
  const milk = state.offers.find(offer => offer.id === "iasi-urban-grocer-milk")!;
  state.offers.push({ ...milk, id: "urban-grocer-milk", storeId: "urban-grocer", quantityAvailable: 6, updatedAt: "2026-10-19T16:30:00Z" });
  const result = consolidateStores(state);
  assert.equal(result.stores.length, 16);
  assert.equal(result.offers.length, createSeedState().offers.length);
  assert.equal(result.stores.find(s => s.id === store.id)?.prepMinutes, 37);
  assert.equal(result.stores.find(s => s.id === store.id)?.acceptingOrders, false);
  assert.equal(result.offers.find(o => o.id === milk.id)?.quantityAvailable, 6);
  assert.deepEqual(result.offers.filter(o => o.colorId), state.offers.filter(o => o.colorId));
  assert.deepEqual(consolidateStores(result), result);
});

test("newer canonical inventory and settings win, and unrelated same-name branches remain", () => {
  const state = structuredClone(createSeedState());
  state.stores[0] = { ...state.stores[0], acceptingOrders: false, settingsRevision: 3 };
  state.stores.push({ ...state.stores[0], id: "urban-grocer", acceptingOrders: true, settingsRevision: 1 });
  state.stores.push({ ...state.stores[0], id: "different-branch" });
  const milk = state.offers.find(offer => offer.id === "iasi-urban-grocer-milk")!;
  milk.quantityAvailable = null;
  milk.updatedAt = "2026-10-19T17:00:00Z";
  state.offers.push({ ...milk, id: "urban-grocer-milk", storeId: "urban-grocer", quantityAvailable: 6, updatedAt: "2026-10-19T16:30:00Z" });
  const result = consolidateStores(state);
  assert.equal(result.stores.length, 17);
  assert.equal(result.stores.find(s => s.id === "iasi-urban-grocer")?.acceptingOrders, false);
  assert.equal(result.offers.find(o => o.id === milk.id)?.quantityAvailable, null);
});
