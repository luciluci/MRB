import test from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "./actions";
import { createSeedState } from "./seed";
import { listOffers } from "./domain";
import type { StoreSettings } from "./store-settings";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, updateState } from "./store";

function settings(): StoreSettings {
  const state = createSeedState();
  return { storeId: "iasi-urban-grocer", baseRevision: 0, hours: state.stores[0].hours, prepMinutes: 15, acceptingOrders: true, acceptedPaymentMethods: ["card"], offers: [{ offerId: "iasi-urban-grocer-milk", stock: "in", quantityAvailable: 4, stockConfidence: "confirmed" }] };
}
test("store settings update only the selected store and offers, preserving orders", () => {
  const state = applyAction(createSeedState(), { type: "placeOrder", items: [{ offerId: "iasi-urban-grocer-bread", quantity: 1 }] });
  const next = applyAction(state, { type: "updateStoreSettings", ...settings() });
  assert.deepEqual(next.orders, state.orders);
  assert.equal(next.stores[1], state.stores[1]);
  assert.equal(next.offers.find(o => o.id === "iasi-urban-grocer-milk")?.stockConfidence, "confirmed");
  assert.equal(next.offers.find(o => o.id === "iasi-urban-grocer-milk")?.quantityAvailable, 4);
  assert.equal(state.offers.find(o => o.id === "iasi-urban-grocer-milk")?.quantityAvailable, undefined);
});
test("invalid schedules and cross-store inventory edits are rejected atomically", () => {
  const state = createSeedState();
  const invalidHours: StoreSettings["hours"][] = [
    { ...settings().hours, 1: [["20:00", "09:00"]] },
    { ...settings().hours, 1: [["09:00", "13:00"], ["12:00", "18:00"]] },
    { ...settings().hours, 1: [["99:00", "24:00"]] },
  ];
  for (const hours of invalidHours) assert.throws(() => applyAction(state, { type: "updateStoreSettings", ...settings(), hours }), /hours|overlap/i);
  assert.throws(() => applyAction(state, { type: "updateStoreSettings", ...settings(), offers: [{ ...settings().offers[0], offerId: "iasi-bean-bowl-coffee" }] }), /store/i);
  assert.throws(() => applyAction(state, { type: "updateStoreSettings", ...settings(), prepMinutes: -1 }), /preparation/i);
  assert.throws(() => applyAction(state, { type: "updateStoreSettings", ...settings(), offers: [{ ...settings().offers[0], quantityAvailable: -1 }] }), /quantity/i);
});
test("hours, readiness and known payment refusal affect discovery and checkout", () => {
  for (const patch of [{ acceptingOrders: false }, { acceptedPaymentMethods: [] }, { hours: { ...settings().hours, 1: [] } }]) {
    const state = applyAction(createSeedState(), { type: "updateStoreSettings", ...settings(), ...patch });
    const listing = listOffers(state.products, state.offers, state.stores, state.customer, new Date(state.demoTime)).find(x => x.offer.id === "iasi-urban-grocer-milk")!;
    assert.equal(listing.available, false);
    assert.throws(() => applyAction(state, { type: "placeOrder", items: [{ offerId: listing.offer.id, quantity: 1 }] }), /unavailable/);
  }
});
test("midnight closing and split hours are supported; unknown payment and quantity stay unknown", () => {
  const known = applyAction(createSeedState(), { type: "updateStoreSettings", ...settings() });
  const next = applyAction(known, { type: "updateStoreSettings", ...settings(), baseRevision: 1, hours: { ...settings().hours, 1: [["08:00", "12:00"], ["13:00", "24:00"]] }, acceptedPaymentMethods: null, offers: [{ ...settings().offers[0], quantityAvailable: null, stockConfidence: "unverified" }] });
  assert.equal(next.stores[0].acceptedPaymentMethods, undefined);
  assert.equal(next.offers.find(o => o.id === "iasi-urban-grocer-milk")?.quantityAvailable, null);
});

test("stale settings cannot reopen a paused store or overwrite newer inventory", () => {
  const paused = applyAction(createSeedState(), { type: "updateStoreSettings", ...settings(), acceptingOrders: false });
  assert.throws(() => applyAction(paused, { type: "updateStoreSettings", ...settings(), prepMinutes: 40 }), /changed since/);
});

test("saved store hours and explicitly unknown quantities survive state migration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mrb-store-settings-"));
  const path = join(directory, "state.json");
  try {
    await updateState({
      type: "updateStoreSettings", ...settings(), storeId: "iasi-volt-lab",
      hours: { ...settings().hours, 1: [] },
      offers: [{ offerId: "iasi-volt-lab-headphones", stock: "in", quantityAvailable: null, stockConfidence: "probable" }],
    }, path);
    const restored = await readState(path);
    assert.deepEqual(restored.stores.find(store => store.id === "iasi-volt-lab")?.hours[1], []);
    const offer = restored.offers.find(offer => offer.id === "iasi-volt-lab-headphones")!;
    assert.equal(offer.quantityAvailable, null);
    assert.equal(offer.stockConfidence, "probable");
  } finally {
    await unlink(path).catch(() => {});
    await rmdir(directory);
  }
});
