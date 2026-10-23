import test from "node:test";
import assert from "node:assert/strict";
import { getStore } from "@netlify/blobs";
import { createDedupeFetch } from "next/dist/server/lib/dedupe-fetch";
import { fetchBlob } from "./netlify-fetch";

test("an empty blob store resolves through Next.js fetch without hanging on response cancellation", async () => {
  const transport = createDedupeFetch(async () => new Response("Not found", { status: 404 }));
  const store = getStore({ name: "test", siteID: "test", token: "test", edgeURL: "https://example.test", uncachedEdgeURL: "https://example.test", fetch: (input, init) => fetchBlob(input, init, transport) });
  let timer: ReturnType<typeof setTimeout>;
  try {
    const result = await Promise.race([
      store.getWithMetadata("state", { type: "json", consistency: "strong" }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Missing blob request hung")), 500); }),
    ]);
    assert.equal(result, null);
  } finally { clearTimeout(timer!); }
});