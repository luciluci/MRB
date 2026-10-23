import assert from "node:assert/strict";
import test from "node:test";
import { createBlobStateStore, type SnapshotStore } from "./blob-store";
import { createSeedState } from "./seed";
import type { DemoState } from "./types";

// The external storage boundary is simulated; all state transitions use production code.
function memoryStore(): SnapshotStore {
  let data: DemoState | null = null;
  let revision = 0;
  return {
    async getWithMetadata() {
      return data ? { data: structuredClone(data), etag: String(revision) } : null;
    },
    async setJSON(_key, next, options) {
      if ((options.onlyIfNew && data) || (options.onlyIfMatch && options.onlyIfMatch !== String(revision))) {
        return { modified: false };
      }
      data = structuredClone(next);
      return { modified: true, etag: String(++revision) };
    },
  };
}

test("Netlify state starts from sample data and survives a fresh handler instance", async () => {
  const storage = memoryStore();
  const first = createBlobStateStore(storage, state => state);
  assert.equal((await first.read()).courier.online, false);
  await first.update({ type: "setCourierOnline", online: true });
  const second = createBlobStateStore(storage, state => state);
  assert.equal((await second.read()).courier.online, true);
  await second.update({ type: "reset" });
  assert.equal((await first.read()).courier.online, false);
});

test("competing Netlify mutations preserve both updates instead of overwriting", async () => {
  const storage = memoryStore();
  const first = createBlobStateStore(storage, state => state);
  const second = createBlobStateStore(storage, state => state);
  await Promise.all([
    first.update({ type: "setCourierOnline", online: true }),
    second.update({ type: "setDemoTime", iso: "2026-10-19T10:00:00+03:00" }),
  ]);
  const state = await first.read();
  assert.equal(state.courier.online, true);
  assert.equal(state.demoTime, "2026-10-19T07:00:00.000Z");
});

test("Netlify state read applies existing migrations", async () => {
  const store = createBlobStateStore(memoryStore(), state => ({ ...state, demoTime: "upgraded" }));
  assert.equal((await store.read()).demoTime, "upgraded");
});

test("storage failures are surfaced without replacing saved data with seed data", async () => {
  const store = createBlobStateStore({
    ...memoryStore(),
    async getWithMetadata() { throw new Error("storage unavailable"); },
  }, state => state);
  await assert.rejects(store.read(), /storage unavailable/);
  await assert.rejects(store.update({ type: "reset" }), /storage unavailable/);
});

test("repeated conflicts fail explicitly after five attempts", async () => {
  let attempts = 0;
  const store = createBlobStateStore({
    ...memoryStore(),
    async setJSON() { attempts++; return { modified: false }; },
  }, state => state);
  await assert.rejects(store.update({ type: "reset" }), /changed.*retry/i);
  assert.equal(attempts, 5);
});

test("a missing ETag cannot turn an update into an unconditional overwrite", async () => {
  const store = createBlobStateStore({
    ...memoryStore(),
    async getWithMetadata() { return { data: createSeedState() }; },
    async setJSON() { assert.fail("must not write without an ETag"); },
  }, state => state);
  await assert.rejects(store.update({ type: "reset" }), /ETag/);
});

test("conditional write without a resulting ETag is not reported as saved", async () => {
  const store = createBlobStateStore({
    ...memoryStore(),
    async setJSON() { return { modified: true, etag: "" }; },
  }, state => state);
  await assert.rejects(store.update({ type: "reset" }), /confirm.*write/i);
});
