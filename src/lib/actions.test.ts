import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "./actions";
import { createSeedState } from "./seed";

test("checkout creates one priced order for one store", () => {
  const state = createSeedState();
  const next = applyAction(state, { type: "placeOrder", items: [
    { offerId: "iasi-urban-grocer-milk", quantity: 2 }, { offerId: "iasi-urban-grocer-bread", quantity: 1 },
  ] });
  assert.equal(next.orders.length, 1);
  assert.equal(next.orders[0].storeId, "iasi-urban-grocer");
  assert.equal(next.orders[0].subtotal, 40);
  assert.ok(next.orders[0].total > 40);
  assert.equal(state.orders.length, 0);
});

test("checkout refuses mixed stores and unavailable offers", () => {
  const state = createSeedState();
  assert.throws(() => applyAction(state, { type: "placeOrder", items: [
    { offerId: "iasi-urban-grocer-milk", quantity: 1 }, { offerId: "iasi-bean-bowl-coffee", quantity: 1 },
  ] }), /one store/);
  assert.throws(() => applyAction(state, { type: "placeOrder", items: [
    { offerId: "iasi-urban-grocer-detergent", quantity: 1 },
  ] }), /unavailable/);
});

test("checkout rejects a basket after the customer moves beyond the 2 km search radius", () => {
  const state = createSeedState();
  const store = state.stores.find(s => s.id === "iasi-urban-grocer")!;
  state.stores = state.stores.map(s => s.id === store.id ? { ...s, radiusKm: 5 } : s);
  const moved = applyAction(state, {
    type: "setCustomerLocation", address: "Just outside range",
    lat: store.lat + 2.01 / 6371 * 180 / Math.PI, lng: store.lng,
  });
  assert.throws(() => applyAction(moved, {
    type: "placeOrder", items: [{ offerId: "iasi-urban-grocer-milk", quantity: 1 }],
  }), /unavailable/);
  assert.equal(moved.orders.length, 0);
});

test("only an online nearby courier can accept a ready mission once", () => {
  let state = createSeedState();
  state = applyAction(state, { type: "placeOrder", items: [{ offerId: "iasi-urban-grocer-milk", quantity: 1 }] });
  const id = state.orders[0].id;
  state = applyAction(state, { type: "merchantAccept", orderId: id });
  state = applyAction(state, { type: "merchantReady", orderId: id });
  assert.throws(() => applyAction(state, { type: "courierAccept", orderId: id }), /online/);
  state = applyAction(state, { type: "setCourierOnline", online: true });
  state = applyAction(state, { type: "courierAccept", orderId: id });
  assert.equal(state.orders[0].status, "assigned");
  assert.throws(() => applyAction(state, { type: "courierAccept", orderId: id }), /active mission/);
});

test("preparing the sample courier keeps existing orders and makes a nearby ready mission available", () => {
  let state = createSeedState();
  state = applyAction(state, { type: "placeOrder", items: [{ offerId: "iasi-volt-lab-charger", quantity: 1 }] });
  const id = state.orders[0].id;
  state = applyAction(state, { type: "merchantAccept", orderId: id });
  state = applyAction(state, { type: "merchantReady", orderId: id });
  state = applyAction(state, { type: "setCourierLocation", lat: 47.1603, lng: 27.5957 });

  const prepared = applyAction(state, { type: "prepareDemoCourier" });
  assert.equal(prepared.courier.online, true);
  assert.equal(prepared.courier.lastLocationAt, state.demoTime);
  assert.equal(prepared.orders[0].id, id);
  assert.equal(prepared.orders[0].status, "ready");
  assert.equal(applyAction(prepared, { type: "courierAccept", orderId: id }).orders[0].status, "assigned");
});

test("customer, merchant, and professional complete one delivery", () => {
  let state = createSeedState();
  state = applyAction(state, { type: "placeOrder", items: [{ offerId: "iasi-bean-bowl-coffee", quantity: 2 }] });
  const id = state.orders[0].id;
  for (const type of ["merchantAccept", "merchantReady"] as const) state = applyAction(state, { type, orderId: id });
  state = applyAction(state, { type: "setCourierOnline", online: true });
  for (const type of ["courierAccept", "courierPickup", "courierDeliver"] as const) state = applyAction(state, { type, orderId: id });
  assert.equal(state.orders[0].status, "delivered");
  assert.equal(state.orders[0].courierId, state.courier.id);
  assert.equal(state.courier.completed, 1);
});
