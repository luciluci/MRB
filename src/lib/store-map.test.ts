import assert from "node:assert/strict";
import test from "node:test";
import { groupStoreLocations } from "./store-map";
import { createSeedState } from "./seed";

test("stores sharing pickup coordinates remain individually accessible on the map", () => {
  const stores = createSeedState().stores;
  const legacy = { ...stores[0], id: "urban-grocer" };
  const groups = groupStoreLocations([...stores, legacy]);
  assert.equal(groups.length, stores.length);
  assert.deepEqual(groups[0].stores.map(store => store.id), [stores[0].id, legacy.id]);
  assert.equal(groups.reduce((count, group) => count + group.stores.length, 0), stores.length + 1);
  assert.deepEqual(groupStoreLocations([]), []);
});
