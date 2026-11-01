import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readState, updateState } from "./store";
import { createSeedState } from "./seed";

test("local state survives a subsequent read and reset restores the seed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mrb-demo-"));
  const path = join(dir, "state.json");
  try {
    await updateState({ type: "setCourierOnline", online: true }, path);
    assert.equal((await readState(path)).courier.online, true);
    await updateState({ type: "reset" }, path);
    assert.equal((await readState(path)).courier.online, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("older Bucharest stores move to Iași while retaining settings, offers and orders", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mrb-demo-"));
  const path = join(dir, "state.json");
  const legacy = createSeedState();
  legacy.stores = legacy.stores.slice(0, 6).map(store => ({
    ...store, id: store.id.replace("iasi-", ""), address: "București · old sample location",
    lat: 44.4456, lng: 26.1000, prepMinutes: 37, acceptingOrders: false,
    acceptedPaymentMethods: ["cash"], settingsRevision: 3,
  }));
  legacy.offers = [{ ...legacy.offers.find(offer => offer.id === "iasi-volt-lab-charger")!, id: "volt-lab-charger", storeId: "volt-lab" }];
  legacy.customer = { address: "Piața Universității, București", lat: 44.4355, lng: 26.1022 };
  legacy.orders = [{ id: "MRB-OLD", storeId: "volt-lab", items: [{ offerId: "volt-lab-charger", quantity: 1, unitPrice: 72 }], customerAddress: legacy.customer.address, customerLat: legacy.customer.lat, customerLng: legacy.customer.lng, status: "placed", subtotal: 72, deliveryFee: 11, platformFee: 2.88, total: 85.88, createdAt: legacy.demoTime, courierId: null }];
  try {
    await writeFile(path, JSON.stringify(legacy));
    const migrated = await readState(path);
    const { tracking, ...legacyFields } = migrated.orders[0];
    assert.deepEqual(legacyFields, { ...legacy.orders[0], storeId: "iasi-volt-lab", items: [{ ...legacy.orders[0].items[0], offerId: "iasi-volt-lab-charger" }] });
    assert.equal(tracking?.stops[0].items[0].unitPrice, 72);
    assert.equal(tracking?.stops[0].storeId, "iasi-volt-lab");
    assert.deepEqual(migrated.offers.find(o => o.id === "iasi-volt-lab-charger"), { ...legacy.offers[0], id: "iasi-volt-lab-charger", storeId: "iasi-volt-lab" });
    for (const oldStore of legacy.stores) {
      const destination = createSeedState().stores.find(s => s.id === `iasi-${oldStore.id}`)!;
      assert.deepEqual(migrated.stores.find(s => s.id === destination.id), {
        ...oldStore, id: destination.id, address: destination.address, lat: destination.lat, lng: destination.lng, settingsRevision: 4,
      });
    }
    assert.equal(migrated.stores.length, createSeedState().stores.length);
    assert.ok(migrated.stores.every(s => s.address.includes("Iași")));
    assert.ok(migrated.stores.some(s => s.id === "iasi-urban-grocer"));
    assert.ok(migrated.offers.some(o => o.id === "iasi-urban-grocer-milk"));
    assert.match(migrated.customer.address, /Iași/);
    await writeFile(path, JSON.stringify(migrated));
    assert.deepEqual(await readState(path), migrated);
    // A later custom location must not be reset on every read.
    migrated.stores[0] = { ...migrated.stores[0], address: "Custom Iași pickup", lat: 47.17, lng: 27.58 };
    await writeFile(path, JSON.stringify(migrated));
    assert.deepEqual((await readState(path)).stores[0], migrated.stores[0]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
