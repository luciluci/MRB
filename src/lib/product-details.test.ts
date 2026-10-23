import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyAction } from "./actions";
import { listOffers } from "./domain";
import { createSeedState } from "./seed";
import { readState } from "./store";

test("known store quantities prevent overselling, including repeated basket lines", () => {
  const state = structuredClone(createSeedState());
  const offer = state.offers.find(o => o.id === "iasi-volt-lab-headphones")!;
  offer.quantityAvailable = 2;
  assert.throws(() => applyAction(state, { type: "placeOrder", items: [
    { offerId: offer.id, quantity: 3 },
  ] }), /quantity|stock/i);
  assert.throws(() => applyAction(state, { type: "placeOrder", items: [
    { offerId: offer.id, quantity: 2 }, { offerId: offer.id, quantity: 1 },
  ] }), /quantity|stock/i);
  assert.equal(applyAction(state, { type: "placeOrder", items: [{ offerId: offer.id, quantity: 2 }] }).orders[0].items[0].quantity, 2);
});

test("zero quantity disables an otherwise in-stock offer; unknown quantity still permits purchase", () => {
  const state = structuredClone(createSeedState());
  const offer = state.offers.find(o => o.id === "iasi-volt-lab-headphones")!;
  offer.quantityAvailable = 0;
  assert.equal(listOffers(state.products, [offer], state.stores, state.customer, new Date(state.demoTime))[0].available, false);
  delete offer.quantityAvailable;
  assert.equal(listOffers(state.products, [offer], state.stores, state.customer, new Date(state.demoTime))[0].available, true);
});

test("a chosen colour stays tied to its seller, price and stock through checkout", () => {
  const state = createSeedState();
  const sand = state.offers.find(o => o.productId === "headphones" && o.storeId === "iasi-volt-lab" && o.colorId === "sand");
  assert.ok(sand, "the demo needs a selectable colour offer");
  const order = applyAction(state, { type: "placeOrder", items: [{ offerId: sand.id, quantity: 1 }] }).orders[0];
  assert.equal(order.items[0].offerId, sand.id);
  assert.equal(order.storeId, "iasi-volt-lab");
  assert.equal(order.items[0].unitPrice, sand.price);
  const soldOut = state.offers.find(o => o.productId === "headphones" && o.storeId === "iasi-volt-lab" && o.colorId === "sage")!;
  assert.throws(() => applyAction(state, { type: "placeOrder", items: [{ offerId: soldOut.id, quantity: 1 }] }), /unavailable/i);
});

test("existing demo state gains optional details without replacing saved stock, descriptions or orders", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mrb-details-"));
  try {
    const path = join(dir, "state.json");
    const state = structuredClone(createSeedState());
    const product = state.products.find(p => p.id === "headphones")!;
    delete product.colors;
    delete product.specifications;
    product.description = "My existing description";
    const offer = state.offers.find(o => o.id === "iasi-volt-lab-headphones")!;
    offer.quantityAvailable = 1;
    await writeFile(path, JSON.stringify(state));
    const upgraded = await readState(path);
    assert.ok(upgraded.products.find(p => p.id === product.id)!.colors?.length);
    assert.equal(upgraded.products.find(p => p.id === product.id)!.description, "My existing description");
    assert.equal(upgraded.offers.find(o => o.id === offer.id)!.quantityAvailable, 1);
    assert.equal(await readFile(path, "utf8"), JSON.stringify(state), "reading must not rewrite saved state");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
