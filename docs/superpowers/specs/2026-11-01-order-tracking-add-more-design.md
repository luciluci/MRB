# My Order and Add More

Status: approved by the user on November 1, 2026; implementation in progress.

## Request and source

Create a dedicated customer order page, track courier acknowledgement and each shop visit, and allow products to be added to the current or upcoming shops without another delivery fee. The user explicitly chose to include the full Add More flow: new shops and revisits to completed shops with an approved extra delivery charge.

Reference: `C:/Users/Lucian/MRB/MRB_GO_Delivery_Operating_Flow.pdf`, especially pages 19, 21, and 22 ("I want Add More to stay one tap away"), with multi-shop context on pages 17 and 18.

## Current system and approach

Extend the existing Next.js/TypeScript demonstration and deploy through its existing Netlify project. WordPress continues embedding the same app; this is an application route, not a second static WordPress page.

The current basket rejects mixed-store items. Orders have a single store and a single delivery status. The new implementation must change checkout, customer tracking, merchant queues, courier actions, admin summaries, and persisted-state migration together. Existing orders and the Netlify storage fixes must be preserved.

Approaches considered:

1. **Extend the current demo end to end (recommended).** One coordinated order with per-shop stops and explicit courier actions. This makes the requested flow usable and testable in the deployed app.
2. **Build only a tracking screen.** Smaller, but cannot demonstrate multi-shop checkout or correctly enforce additions; it does not satisfy the request.
3. **Build production dispatch and payments.** Requires accounts, payment credentials, verified inventory, routing and operational integrations absent from this demo. This is outside the requested change.

The proposed approach is option 1. Keep the current visual style and sample Iași catalogue. All payment approvals, fees, dispatch assignments and time estimates remain visibly illustrative; no real money is collected. Explicit courier actions, rather than GPS proximity alone, determine shopping and checkout status. These are implementation proposals, not claims that the user specified these details.

## Customer experience

- A single basket may contain products from multiple shops, grouped by seller. Switching shops keeps the basket.
- Checkout shows goods by seller, the planned pickup order, one delivery address, estimated arrival and an itemized total before the customer confirms.
- On successful checkout navigate to `/orders/[orderId]`. A My Orders link opens the customer's demonstration order list; each entry links to its details. The existing app has sample roles rather than real authentication, so this remains a shared demo and must not imply private customer accounts.
- The detail page shows order number, the current delivery summary, each shop by name, items grouped by pickup, totals, delivery address and a timestamped activity history. Newly added items are identified separately.
- Show a stop count such as "Shopping at Daily Express · stop 1 of 2". With several couriers, show progress by collection route so simultaneous stops are not misleadingly presented as sequential.
- Keep a prominent Add More control visible while the order is active, including on narrow screens. It opens an in-page panel or sheet while preserving tracking context.
- In Add More, prioritize "Current shop", "Upcoming shops", then "Another shop / a completed shop". Show which additions have no extra delivery fee and which require a new quote.
- The addition review shows seller, quantities, goods subtotal, platform fee, additional delivery fee, revised illustrative ETA and intended courier/assignment status. The customer explicitly confirms the additional amount before a request is sent.
- Until a courier accepts, show "Awaiting courier confirmation"; the original order remains visible and is not silently replaced. Accepted additions update the active shopping list and order history. Declined/unavailable additions are not added to the payable total.
- Delivered or cancelled orders remain viewable but cannot accept additions. A normal new-order link is available.

## Delivery and shop progress

Customer summary states:

1. Order placed / awaiting courier.
2. Order acknowledged by a courier.
3. Courier heading to the first/next shop.
4. Courier at [shop name] / shopping now.
5. Shopping finished at [shop name] / pickup closed to same-visit additions.
6. Items collected; next stop, or on the way to the customer.
7. Delivered (only when all accepted collection routes have delivered).

Each pickup has a unique stop ID, even when a shop is revisited, and progresses through upcoming, shopping, checkout complete, collected, delivered; rejection/cancellation is represented explicitly. Collection order is immutable for completed stops. New work creates new stops rather than reopening completed ones.

The professional view provides guided actions: acknowledge route, arrive at next shop, finish shopping, confirm pickup, deliver. Server validation prevents skipping stops, delivering uncollected items, or completing another courier's assigned work. Merchant preparation is tracked per stop, separately from the courier's position. Merchant accept/reject/ready applies only to that shop's part of the order. Readiness does not itself mean the courier has arrived or completed shopping.

Courier acknowledgement can happen before shops are ready. A merchant-prepared pickup requires readiness before collection. For shopping visits, the courier performs shopping and checkout. Add a per-store fulfillment mode with sample defaults: existing food/restaurant stores use merchant preparation; grocery, flower, electronics and sports shops use courier shopping. Display the distinction and allow editing it with store settings.

For prepared food, the merchant's "Close additions" action is the kitchen cutoff; marking ready also closes additions. Before cutoff, additions require merchant confirmation and the courier's acceptance where assigned. After cutoff, quote a fresh collection if the shop is still open and accepting orders. This is distinct from the courier-shopping cutoff.

## Addition eligibility and pricing

- **Current shopping stop:** no extra delivery charge while shopping is open and the requested items fit the same visit.
- **Upcoming stop already in the accepted route:** no extra delivery charge if that stop still accepts additions.
- **Checkout complete, collected or delivered stop:** a new pickup is required; never send a courier back or reopen the old stop automatically.
- **A new shop:** quote a new stop with extra route time and an explicit added delivery charge. This first demo treats a newly introduced shop as an extra pickup rather than claiming to optimize away its cost.
- **Kitchen cutoff passed:** new accepted preparation/pickup, with added delivery quoted before approval.
- Check current product availability, remaining stock where known, quantity bounds, shop hours, pickup eligibility and the order's fixed delivery address on quote and again on acceptance. Unknown stock remains labelled unverified.
- Demonstration routing preserves first-added shop order, with new stops appended to the unfinished work. Display this as a planned sequence, not live traffic optimization. Existing Fastest/Cheapest/Exact browsing behavior stays intact; no claim that it optimizes multi-stop routes.
- Proposed demo fee formula: for an initial route, `8 RON + ceil(2 × route kilometres)`, where route kilometres is consecutive shop-to-shop distance plus last shop-to-customer distance. A one-shop order therefore retains the existing formula. An extra collection uses the same formula for its proposed pickup route, shown separately. Same-visit additions add exactly zero delivery fee. All currency calculations round to cents.
- Keep the existing 4% platform fee on goods, including newly accepted goods. The customer sees this independently from the zero additional delivery charge. Courier earnings displays must not imply that this platform fee is courier earnings.
- Proposed ETA uses existing preparation estimates plus distance-based travel and a small clearly labelled per-added-unit shopping allowance. It is an estimate, not a promised deadline. Store the approved estimate and show revisions; no real GPS/traffic inference is implied.
- Quote/addition IDs and client operation IDs are stable across retries. A confirmed quote cannot be applied twice. Recheck the affected stop's revision, item price/stock and fee conditions atomically. An unrelated order update need not invalidate the quote.
- If a courier closes shopping or a merchant closes the kitchen while an addition is pending, expire that addition and show a fresh paid-pickup option for customer approval. Never silently turn a free addition into a charged one.
- Customer approval is a simulated authorization; only mutually accepted additions enter the committed order total. Cancellation, rejection or expiry releases that pending authorization. No fake payment success or actual card entry.

## Courier and merchant acceptance

Original multi-shop checkout creates one planned collection route offered to an available sample professional. Provide at least two sample professionals and a selector in the Professional view so alternative collection is demonstrable without real dispatch integration. Preserve Alex and migrate existing assignments.

Same-stop and upcoming-stop additions appear as concise change cards: products, quantities, additional goods amount and expected time. The assigned courier can accept or decline. Merchant-prepared additions also require the merchant's approval before becoming committed; acceptance order does not matter, and every final acceptance revalidates the stop.

For an extra pickup, offer the changed job to the original courier when available, with route, additional fee and ETA visible. If declined or busy, offer it to another Ready sample courier. The customer sees who will collect it; any changed price or ETA requires a refreshed approval. Extra collections can deliver separately under the same parent order and are labelled clearly. An original courier who has collected goods may finish their current delivery while another handles the addition.

Capacity and feasibility are explicit demo inputs, not invented measurements: use configurable sample maximum units/active routes plus availability and location range. Decline or exceed capacity -> offer another Ready courier or show "No courier available" without committing the addition. Do not promise a route the demo has not accepted.

If an original shop rejects its pickup, show that shop's failure and keep the other pickups active. Remove unfulfilled rejected goods and their platform fee from the confirmed demo total, record the adjustment, and show any retained delivery fee explicitly. Already collected goods cannot be rejected. No automatic seller substitution. If all pickups are cancelled before collection, cancel the order and reverse its demo charges. Keep addition cancellation separate from the original order.

## Persistence and compatibility

Use a versioned order model containing per-shop stops, collection routes/assignments, per-stop item snapshots, activity events, revisions and pending/accepted additions. Prices, titles and quantities shown on old orders must not drift when the catalogue changes. Proposed concrete interfaces and component decomposition are left to the implementer.

Migrate legacy single-shop orders into one-stop routes, retaining IDs, original timestamps, amounts and status meaning. Preserve delivered/rejected history. Existing placed/accepted/ready orders become equivalent per-stop preparation states; assigned orders retain the assigned courier; picked-up orders become collected/on-the-way. Migration is idempotent, including after reload and concurrent requests.

Keep strong Netlify Blob reads and conditional writes, the explicit fetch signal workaround, and separate preview storage. Mutations, fee validation and eligibility checks occur server-side inside retry-safe update logic. Generate IDs once at the request boundary and preserve them through storage retries; clients send operation IDs so network retries also remain idempotent. Existing local file mode continues to work.

## Verification and delivery

Automated checks cover:

- Multi-shop checkout and totals, quantity/stock validation and migration from each legacy status.
- Valid courier stop transitions and merchant cutoffs; no premature delivery.
- Current/upcoming additions with zero added delivery, added goods/platform fee calculated correctly.
- Completed/new shop quote, explicit customer approval, professional acceptance/decline and alternate assignment.
- Stale quote rejection at checkout/kitchen cutoff, atomic concurrency with stop completion, duplicate submit/retry safety and no lost state.
- Merchant-prepared additions, closed shops, unavailable stock, no available courier, per-stop rejection and cancellation adjustments.
- Original delivery with a pending/accepted extra route: parent order stays active only for live accepted/pending work and becomes terminal once all work is resolved. Pending work that loses eligibility on delivery is expired rather than keeping the order active indefinitely.

Browser walkthrough: checkout from two shops, acknowledge, arrive at shop 1, add items from shop 1 and shop 2 with zero added delivery, finish shop 1, request a paid revisit/new shop, approve and accept it, complete all collections and delivery. Confirm all views agree after refresh, and check mobile Add More remains accessible.

Build/type-check, automated tests, preview verification, then deploy to the existing Netlify application and verify the WordPress iframe. Do not reset production demonstration orders during verification. Keep original user files outside the workspace unchanged unless explicitly authorized through the filesystem approval mechanism.

## Boundaries

This work implements the order screen and the related full Add More flow, not every chapter of the operating-flow document. Real payments, identity/authentication, background GPS, routing-provider optimization, actual merchant inventory, receipts/payment instruments, vehicle dispatch integrations and photo/voice ordering are outside this change. Their absence must be clear in the existing demonstration context.

