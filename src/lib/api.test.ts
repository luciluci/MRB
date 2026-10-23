import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/state/route";
import { POST } from "../app/api/action/route";

test("state API exposes the seeded store-offer catalogue", async () => {
  const response = await GET();
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(data.stores.length > 0);
  assert.ok(data.offers.some((offer: { storeId: string }) => offer.storeId === data.stores[0].id));
});

test("action API rejects an invalid request", async () => {
  const response = await POST(new Request("http://localhost/api/action", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
  }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Invalid action/);
});
