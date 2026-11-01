import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "./actions";
import { createSeedState } from "./seed";
import type { DemoState } from "./types";

const basket = [{ offerId: "iasi-urban-grocer-milk", quantity: 2 }, { offerId: "iasi-bean-bowl-coffee", quantity: 1 }];
const checkout = (s = createSeedState()) => applyAction(s, { type: "placeOrder", operationId: "checkout-1", items: basket } as any);

test("multi-shop checkout snapshots two stops and charges a single route", () => {
  const before = createSeedState();
  const s = checkout(before);
  const o = s.orders[0];
  assert.equal(s.orders.length, 1);
  assert.deepEqual(o.tracking?.stops.map(x => x.storeId), ["iasi-urban-grocer", "iasi-bean-bowl"]);
  assert.equal(o.tracking?.routes.length, 1);
  assert.equal(o.subtotal, 38);
  assert.equal(o.platformFee, 1.52);
  assert.equal(o.deliveryFee, 11);
  assert.equal(o.total, 50.52);
  assert.equal(o.customerAddress, before.customer.address);
  assert.equal(o.tracking?.stops[0].items[0].name, "Fresh milk");
  assert.equal(before.orders.length, 0);
});

test("checkout retries do not create another order or reserve stock twice", () => {
  const s = checkout();
  assert.deepEqual(checkout(s), s);
});

test("checkout reserves known stock across active orders", () => {
  const s = createSeedState();
  s.offers.find(x => x.id === basket[0].offerId)!.quantityAvailable = 3;
  const first = checkout(s);
  assert.throws(() => applyAction(first, { type: "placeOrder", operationId: "checkout-2", items: basket } as any), /stock/i);
});

test("legacy migration preserves history, assignments and exact money for every status", () => {
  for (const status of ["placed", "accepted", "ready", "assigned", "picked_up", "delivered", "rejected"] as const) {
    const s = createSeedState();
    s.orders = [{ id: "legacy", storeId: "iasi-bean-bowl", items: [{ offerId: "iasi-bean-bowl-coffee", quantity: 1, unitPrice: 9 }], customerAddress: "Old address", customerLat: 47.16, customerLng: 27.59, status, subtotal: 9, deliveryFee: 12, platformFee: .36, total: 21.36, createdAt: "2025-01-01T10:00:00Z", courierId: ["assigned", "picked_up", "delivered"].includes(status) ? s.courier.id : null }];
    const migrated = applyAction(s, { type: "setDemoTime", iso: s.demoTime });
    const o = migrated.orders[0];
    assert.equal(o.status, status);
    assert.equal(o.total, 21.36);
    assert.equal(o.tracking?.version, 2);
    assert.equal(o.tracking?.stops[0].items[0].unitPrice, 9);
    assert.equal(o.tracking?.routes[0].courierId, s.orders[0].courierId);
    assert.deepEqual(applyAction(migrated, { type: "setDemoTime", iso: s.demoTime }), migrated);
  }
});

let sequence = 0;
const act = (s: DemoState, action: Record<string, unknown>) => applyAction(s, { operationId: `test-${++sequence}`, ...action } as any);
const tracked = (s: DemoState) => s.orders[0].tracking!;
function ready() {
  let s = checkout();
  s = act(s, { type: "configureCourier", courierId: "courier-alex", online: true, maxUnits: 60, maxActiveRoutes: 2 });
  s = act(s, { type: "configureCourier", courierId: "courier-mara", online: true, maxUnits: 40, maxActiveRoutes: 2 });
  return s;
}
function routeAction(s: DemoState, step: string, index = 0, courierId = "courier-alex") {
  return act(s, { type: "routeStep", orderId: s.orders[0].id, routeId: tracked(s).routes[index].id, courierId, step });
}
function stopAction(s: DemoState, step: string, index = 0) {
  const stop = tracked(s).stops[index];
  return act(s, { type: "merchantStep", orderId: s.orders[0].id, stopId: stop.id, storeId: stop.storeId, step });
}
function quote(s: DemoState, offerId = "iasi-urban-grocer-bread") {
  return act(s, { type: "quoteAddition", orderId: s.orders[0].id, items: [{ offerId, quantity: 1 }] });
}
function decide(s: DemoState, decision: string, role = "customer", actorId?: string) {
  return act(s, { type: "decideAddition", orderId: s.orders[0].id, quoteId: tracked(s).additions.at(-1)!.id, decision, role, actorId });
}

test("courier must acknowledge, head, arrive, close and collect each stop before delivery", () => {
  let s = ready();
  assert.throws(() => routeAction(s, "deliver"), /acknowledge|assigned/i);
  s = routeAction(s, "acknowledge");
  assert.throws(() => routeAction(s, "collect"), /shopping|closed/i);
  assert.throws(() => routeAction(s, "head", 0, "courier-mara"), /assigned|another courier/i);
  for (const step of ["head", "arrive", "finish", "collect"]) s = routeAction(s, step);
  assert.equal(tracked(s).stops[0].progress, "collected");
  assert.throws(() => routeAction(s, "deliver"), /collect/i);
  for (const step of ["head", "arrive", "finish"]) s = routeAction(s, step);
  assert.throws(() => routeAction(s, "collect"), /ready/i);
  s = stopAction(s, "accept", 1);
  s = stopAction(s, "ready", 1);
  s = routeAction(s, "collect");
  s = routeAction(s, "deliver");
  assert.equal(s.orders[0].status, "delivered");
  assert.equal(s.couriers?.[0].completed, 1);
  assert.throws(() => quote(s), /active|delivered/i);
});

test("current and upcoming shop additions have zero delivery fee and enter totals only after approvals", () => {
  let s = routeAction(ready(), "acknowledge");
  s = routeAction(routeAction(s, "head"), "arrive");
  const total = s.orders[0].total;
  s = quote(s);
  assert.equal(tracked(s).additions[0].deliveryFee, 0);
  s = decide(s, "approve");
  assert.equal(s.orders[0].total, total);
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(s.orders[0].total, moneyLiteral(total + 18.72));
  assert.equal(tracked(s).stops[0].items.at(-1)?.addedBy, tracked(s).additions[0].id);
  s = quote(s, "iasi-bean-bowl-croissant");
  assert.equal(tracked(s).additions[1].deliveryFee, 0);
  s = decide(s, "approve");
  s = decide(s, "approve", "merchant", "iasi-bean-bowl");
  assert.equal(tracked(s).additions[1].status, "pending");
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[1].status, "accepted");
});
const moneyLiteral = (n: number) => Number(n.toFixed(2));

test("shopping cutoff expires a pending free addition without charging it", () => {
  let s = routeAction(ready(), "acknowledge");
  s = routeAction(routeAction(s, "head"), "arrive");
  s = decide(quote(s), "approve");
  const total = s.orders[0].total;
  s = routeAction(s, "finish");
  assert.equal(tracked(s).additions[0].status, "expired");
  assert.equal(s.orders[0].total, total);
  s = quote(s);
  assert.ok(tracked(s).additions[1].deliveryFee > 0);
  assert.equal(tracked(s).additions[1].targetStopId, null);
});

test("kitchen cutoff is independent of arrival and invalidates either approval order", () => {
  let s = routeAction(ready(), "acknowledge");
  s = decide(quote(s, "iasi-bean-bowl-coffee"), "approve");
  s = decide(s, "approve", "courier", "courier-alex");
  s = stopAction(s, "close", 1);
  assert.equal(tracked(s).additions[0].status, "expired");
  assert.equal(tracked(s).stops[1].progress, "upcoming");
  s = quote(s, "iasi-bean-bowl-coffee");
  assert.ok(tracked(s).additions[1].deliveryFee > 0);
});

test("extra collection decline offers another courier and requires renewed customer approval", () => {
  let s = routeAction(ready(), "acknowledge");
  s = quote(s, "iasi-volt-lab-charger");
  const total = s.orders[0].total;
  assert.equal(tracked(s).additions[0].courierId, "courier-alex");
  s = decide(s, "approve");
  s = decide(s, "decline", "courier", "courier-alex");
  assert.equal(tracked(s).additions[0].courierId, "courier-mara");
  assert.equal(tracked(s).additions[0].customerApproved, false);
  assert.equal(s.orders[0].total, total);
  assert.throws(() => decide(s, "approve", "courier", "courier-mara"), /customer/i);
  s = decide(s, "approve");
  s = decide(s, "approve", "courier", "courier-mara");
  assert.equal(tracked(s).routes.length, 2);
  assert.equal(tracked(s).routes[1].courierId, "courier-mara");
  assert.equal(tracked(s).stops[0].progress, "upcoming");
});

test("quote acceptance rechecks prices, stock and fixed delivery address", () => {
  let s = routeAction(ready(), "acknowledge");
  s = quote(s);
  s = act(s, { type: "setCustomerLocation", address: "Elsewhere", lat: 0, lng: 0 });
  s = decide(s, "approve"); // delivery still goes to the original address
  s.offers = s.offers.map(o => o.id.endsWith("urban-grocer-bread") ? { ...o, price: o.price + 1 } : o);
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[0].status, "expired");
  assert.equal(s.orders[0].total, 50.52);
});

test("partial rejection removes only that shop's goods, retains shown delivery and all cancellation reverses total", () => {
  let s = ready();
  s = stopAction(s, "reject");
  assert.equal(s.orders[0].subtotal, 16);
  assert.equal(s.orders[0].platformFee, .64);
  assert.equal(s.orders[0].deliveryFee, 11);
  assert.notEqual(s.orders[0].status, "rejected");
  s = stopAction(s, "reject", 1);
  assert.equal(s.orders[0].status, "rejected");
  assert.equal(s.orders[0].total, 0);
});

test("capacity prevents overcommit and no courier means no charge", () => {
  let s = routeAction(ready(), "acknowledge");
  for (const courierId of ["courier-alex", "courier-mara"]) s = act(s, { type: "configureCourier", courierId, online: true, maxUnits: 3, maxActiveRoutes: 1 });
  s = quote(s, "iasi-volt-lab-charger");
  assert.equal(tracked(s).additions[0].courierId, "courier-mara");
  s = decide(s, "approve");
  s = decide(s, "decline", "courier", "courier-mara");
  assert.equal(tracked(s).additions[0].status, "unavailable");
  assert.equal(s.orders[0].total, 50.52);
});

test("legacy pickup endpoint cannot skip the physical shop sequence", () => {
  const s = routeAction(ready(), "acknowledge");
  assert.throws(() => act(s, { type: "courierPickup", orderId: s.orders[0].id }), /sequence|closed|shopping/i);
});

test("accepted extra route keeps parent active after original delivery, while pending extra is released", () => {
  for (const accepted of [true, false]) {
    let s = routeAction(ready(), "acknowledge");
    s = decide(quote(s, "iasi-volt-lab-charger"), "approve");
    if (accepted) s = decide(s, "approve", "courier", "courier-alex");
    s = stopAction(stopAction(s, "accept", 1), "ready", 1);
    for (let i = 0; i < 2; i++) for (const step of ["head", "arrive", "finish", "collect"]) s = routeAction(s, step);
    s = routeAction(s, "deliver");
    if (accepted) {
      assert.notEqual(s.orders[0].status, "delivered");
      for (const step of ["head", "arrive", "finish", "collect", "deliver"]) s = routeAction(s, step, 1);
      assert.equal(s.orders[0].status, "delivered");
    } else {
      assert.equal(s.orders[0].status, "delivered");
      assert.equal(tracked(s).additions[0].status, "expired");
    }
  }
});

test("duplicate approval is idempotent and reused operation IDs cannot change payload", () => {
  let s = decide(quote(routeAction(ready(), "acknowledge")), "approve");
  const command = { type: "decideAddition", operationId: "one-approval", orderId: s.orders[0].id, quoteId: tracked(s).additions[0].id, role: "courier", actorId: "courier-alex", decision: "approve" };
  s = act(s, command);
  assert.deepEqual(act(s, command), s);
  assert.throws(() => act(s, { ...command, decision: "decline" }), /already used/i);
});

test("pending additions cannot collectively exceed remaining stock", () => {
  let s = routeAction(ready(), "acknowledge");
  s.offers.find(x => x.id === "iasi-urban-grocer-bread")!.quantityAvailable = 1;
  s = decide(quote(s), "approve");
  const first = tracked(s).additions[0].id;
  s = decide(quote(s), "approve");
  s = act(s, { type: "decideAddition", orderId: s.orders[0].id, quoteId: first, role: "courier", actorId: "courier-alex", decision: "approve" });
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[1].status, "expired");
  assert.equal(s.orders[0].total, 69.24);
});

test("merchant can approve after courier and cancellation releases pending total", () => {
  let s = decide(quote(routeAction(ready(), "acknowledge"), "iasi-bean-bowl-coffee"), "approve");
  s = decide(s, "approve", "courier", "courier-alex");
  s = decide(s, "approve", "merchant", "iasi-bean-bowl");
  assert.equal(tracked(s).additions[0].status, "accepted");
  const total = s.orders[0].total;
  s = decide(quote(s), "approve");
  s = decide(s, "cancel");
  assert.equal(s.orders[0].total, total);
  assert.equal(tracked(s).additions[1].status, "cancelled");
});

test("quote expires after the demo clock advances and paused shops reject additions", () => {
  let s = quote(routeAction(ready(), "acknowledge"));
  s = act(s, { type: "setDemoTime", iso: "2026-10-19T10:16:00Z" });
  assert.equal(tracked(s).additions[0].status, "expired");
  assert.throws(() => decide(s, "approve"), /resolved/);
  s.stores.find(x => x.id === "iasi-urban-grocer")!.acceptingOrders = false;
  assert.throws(() => quote(s), /unavailable/);
});

test("selected professional location is validated and does not move another courier", () => {
  const s = ready();
  const moved = act(s, { type: "configureCourier", courierId: "courier-mara", online: true, maxUnits: 40, maxActiveRoutes: 2, lat: 48, lng: 28 });
  assert.equal(moved.couriers![1].lat, 48);
  assert.equal(moved.courier.lat, s.courier.lat);
  assert.throws(() => act(s, { type: "configureCourier", courierId: "courier-mara", online: true, maxUnits: 40, maxActiveRoutes: 2, lat: 999, lng: 0 }), /location/i);
});

test("marking a courier-shopping pickup ready does not close its shopping window", () => {
  let s = stopAction(ready(), "accept");
  s = stopAction(s, "ready");
  s = quote(s);
  assert.equal(tracked(s).additions[0].deliveryFee, 0);
});

test("existing pickup approval follows its fulfillment snapshot, and new quotes expire if mode changes", () => {
  let s = routeAction(ready(), "acknowledge");
  s.stores.find(x => x.id === "iasi-bean-bowl")!.fulfillmentMode = "courier_shops";
  s = decide(quote(s, "iasi-bean-bowl-coffee"), "approve");
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[0].status, "pending");
  assert.equal(tracked(s).additions[0].merchantApproved, false);
  s = decide(s, "approve", "merchant", "iasi-bean-bowl");
  assert.equal(tracked(s).additions[0].status, "accepted");
  s = decide(quote(s, "iasi-volt-lab-charger"), "approve");
  s.stores.find(x => x.id === "iasi-volt-lab")!.fulfillmentMode = "merchant_prepared";
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[1].status, "expired");
  assert.equal(tracked(s).routes.length, 1);
});

test("advancing demo time releases expired authorizations and capacity automatically", () => {
  let s = routeAction(ready(), "acknowledge");
  s = act(s, { type: "configureCourier", courierId: "courier-mara", online: false, maxUnits: 40, maxActiveRoutes: 2 });
  s = decide(quote(s, "iasi-volt-lab-charger"), "approve");
  s = act(s, { type: "setDemoTime", iso: "2026-10-19T10:16:00Z" });
  assert.equal(tracked(s).additions[0].status, "expired");
  assert.equal(tracked(s).additions[0].customerApproved, false);
  s = quote(s, "iasi-volt-lab-charger");
  assert.equal(tracked(s).additions[1].courierId, "courier-alex");
});

test("parallel stop additions require a refreshed estimate instead of overwriting accumulated time", () => {
  let s = routeAction(ready(), "acknowledge");
  s = decide(quote(s), "approve");
  const first = tracked(s).additions[0].id;
  s = decide(quote(s, "iasi-bean-bowl-croissant"), "approve");
  s = act(s, { type: "decideAddition", orderId: s.orders[0].id, quoteId: first, role: "courier", actorId: "courier-alex", decision: "approve" });
  const eta = tracked(s).routes[0].etaMinutes;
  s = decide(s, "approve", "merchant", "iasi-bean-bowl");
  assert.equal(tracked(s).additions[1].status, "expired");
  s = decide(quote(s, "iasi-bean-bowl-croissant"), "approve");
  s = decide(s, "approve", "courier", "courier-alex");
  s = decide(s, "approve", "merchant", "iasi-bean-bowl");
  assert.equal(tracked(s).routes[0].etaMinutes, eta + 1);
});

test("extra collection must be reapproved if courier workload changes its ETA", () => {
  let s = routeAction(ready(), "acknowledge");
  s = act(s, { type: "configureCourier", courierId: "courier-alex", online: true, maxUnits: 60, maxActiveRoutes: 3 });
  s = decide(quote(s, "iasi-volt-lab-charger"), "approve");
  const originalOrder = s.orders[0].id;
  s = act(s, { type: "placeOrder", items: [{ offerId: "iasi-urban-grocer-milk", quantity: 1 }] });
  s = routeAction(s, "acknowledge");
  s.orders = [s.orders.find(o => o.id === originalOrder)!, ...s.orders.filter(o => o.id !== originalOrder)];
  s = decide(s, "approve", "courier", "courier-alex");
  assert.equal(tracked(s).additions[0].status, "expired");
});

test("reset response is immediately compatible with professional and order views", () => {
  const s = act(ready(), { type: "reset" });
  assert.equal(s.couriers?.length, 2);
  assert.equal(s.couriers?.find(c => c.id === s.courier.id)?.online, false);
  assert.equal(s.orders.length, 0);
});

test("legacy ready and assigned shopping visits remain open to free additions until checkout", () => {
  for (const status of ["ready", "assigned"] as const) {
    let s = applyAction(createSeedState(), { type: "placeOrder", items: [{ offerId: "iasi-urban-grocer-milk", quantity: 1 }] });
    delete s.orders[0].tracking;
    s.orders[0].status = status;
    s.orders[0].courierId = status === "assigned" ? s.courier.id : null;
    s = quote(s);
    assert.equal(tracked(s).additions[0].deliveryFee, 0);
    assert.equal(tracked(s).stops[0].progress, "upcoming");
  }
});

