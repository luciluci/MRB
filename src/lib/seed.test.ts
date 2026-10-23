import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "./actions";
import { listOffers } from "./domain";
import { createSeedState } from "./seed";

test("an Iași browser position finds deliverable sample products", () => {
  const state = applyAction(createSeedState(), {
    type: "setCustomerLocation", address: "GPS · 47.1603, 27.5957", lat: 47.1603, lng: 27.5957,
  });
  const available = listOffers(state.products, state.offers, state.stores, state.customer, new Date(state.demoTime)).filter(x => x.available);
  assert.match(createSeedState().customer.address, /Iași/);
  assert.ok(available.length > 0);
  assert.ok(available.every(x => x.store.address.includes("Iași")));
});
