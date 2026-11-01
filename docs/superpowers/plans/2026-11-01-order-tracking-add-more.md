# My Order and Add More implementation

> Execute inline using executing-plans under the user's approved design.

**Goal:** Deliver multi-shop ordering, live order progress and the complete quoted Add More flow in the existing MRB demo.

**Spec:** ../specs/2026-11-01-order-tracking-add-more-design.md (approved November 1, 2026).

**Architecture:** Extend persisted orders with versioned stops, routes, quotes and event snapshots. Keep pricing and state transitions in a pure domain module behind the existing atomic state store. Shared client state and dedicated order/operations components consume the same API. Preserve legacy fields for existing admin/catalogue compatibility.

**Stack:** Next 16, React 19, TypeScript, node:test, Netlify Blobs.

**Global constraints:** Preserve production data and storage fixes. Use operation IDs for retry safety. All quotes and transitions validated server-side. No real payment/authentication claims. No automatic repricing after approval.

### Task 1: Order model, migration and checkout
Files: src/lib/types.ts, order-flow.ts, order-flow.test.ts, actions.ts, store.ts, consolidate-stores.ts.
Interfaces: Order gains optional tracking V2; migrateOrders returns compatible DemoState; order commands use stable operationId. Existing catalogue/settings actions remain compatible.
Write failing tests for two-shop totals, address snapshots, stock/quantity and migration of every legacy status. Implement versioned migration and checkout. Run npm test (expected all green).

### Task 2: Stops, quotes and approvals
Files: order-flow.ts, order-flow.test.ts, actions.ts, store-settings.ts, blob-store.test.ts.
Interfaces: flow actions accept orderId, routeId/stopId/quoteId and actor IDs. Quotes snapshot prices, stop revisions, ETA and assignment. Atomic mutation returns complete state.
Write failing tests for explicit stop sequence, kitchen cutoff, free current/upcoming additions, paid revisits/new shops, customer/courier/merchant approvals, capacity fallback, cancellation, stock reservation and idempotency. Implement commands and revalidation; extend CAS tests. Run npm test (expected all green).

### Task 3: Customer and operational UI
Files: src/components/OrderTracking.tsx, OrderOperations.tsx, src/lib/use-demo.ts, src/app/orders/page.tsx, src/app/orders/[orderId]/page.tsx, src/app/page.tsx, globals.css, StoreDetails.tsx.
Interfaces: components consume tracking V2 and same server action discriminants; checkout navigates using returned order ID, operation IDs survive retries. My Orders is explicitly shared demo.
Integrate grouped basket, quote review, persistent Add More, stop history, merchant controls and professional selector. Verify rendered routes and guided actions in browser; npm test and npm run build expected pass.

### Task 4: Review and deploy
Fresh whole-branch review, focusing on mutation validation, old-state migration, concurrent approvals, terminal lifecycle, quote price changes, stock and non-happy-path UI. Fix important issues with regression tests. Verify preview full two-shop flow and narrow viewport. Publish to existing deployment branch after checks; verify live app and WordPress without resetting production state.

**Review focus:** malformed API input, stale polling, other-courier mutations, capacity overcommit, late stock changes, orphan routes/quotes, legacy IDs and totals, state-store retries, declined work releasing authorizations, merchant state versus physical progress.
