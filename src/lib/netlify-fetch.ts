export function fetchBlob(input: RequestInfo | URL, init?: RequestInit, transport: typeof fetch = fetch): Promise<Response> {
  // Next.js deduplicates GETs by teeing the response body. The Blobs SDK awaits
  // cancellation on 404/412, which hangs while the unused tee remains open.
  // An explicit signal opts out of deduplication; no-store also bypasses caching.
  return transport(input, { ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(10_000) });
}