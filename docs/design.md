# GET MR B demonstration design

## Goal

Demonstrate one complete local-delivery journey in a responsive web application: customer discovers an eligible store offer, places a test order, merchant accepts and prepares it, nearby professional accepts and delivers it, and admin observes the same state.

## Scope and defaults

- Local demonstration, not a live pilot. Products, people, stock, payments, and earnings are illustrative. No real charges or merchant settlement.
- Bucharest is the sample geography; currency is RON and store schedules use Europe/Bucharest time. These are editable sample data, not a commitment about launch market.
- One store per order. Several stores may offer the same canonical product at different prices.
- Sample role switcher for customer, merchant, professional, and admin. This is a demonstration control, not identity verification.
- Persist demonstration state locally so role views can act on the same order. A reset action restores the seed.
- Google Maps browser integration when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is supplied. A schematic map keeps the demonstration usable without a key.
- Responsive browser experience with dark teal `#071817` and purple `#24104F` from the source blueprint.

## Data and eligibility

`product` is a canonical item. `store` has coordinates, service radius, weekly hours, and fulfillment delay. `offer` links one product to one store and has price, stock status, and update time. A seeded JSON feed supplies these entities.

For a customer address and selected time, a deliverable offer requires its store to be open at estimated pickup, within its delivery radius, and its offer to be in stock. The interface explains why excluded offers are unavailable. Distance is calculated with Haversine for eligibility; Google route estimation may refine the displayed trip when configured. Listings are ordered by deliverability, estimated delivery time, then price. No claim of real stock is made.

## Order lifecycle

`placed -> accepted -> ready -> assigned -> picked_up -> delivered`. Merchant may reject a placed order. Customer submits one store's basket. Professional can go online, share or set a recent location, see offers near pickup, and atomically accept one mission. Server actions validate role-independent state transitions and ensure only one professional is assigned. The admin sees all orders and may reset demonstration data.

## Screens

- Customer: address selection, search/categories, store-filtered offers, cart, test checkout, order timeline, map.
- Merchant: store-scoped incoming and active orders, accept, reject, mark ready.
- Professional: online status, location controls, nearby missions, accept, pickup, delivery, earnings illustration.
- Admin: counts, order board, store status, reset control.

## Technical structure

Next.js App Router and TypeScript. Pure domain functions handle geo, hours, listings, and order transitions. Route handlers read and update a local JSON state file for this local demonstration. Client views poll for current state and update after actions. Browser notifications are offered when professional is online and a nearby mission appears; continuous background location is outside the web demonstration. Local state storage is replaced by a database before a live pilot. A Maps component loads Google Maps only when a key is configured.

## Verification

Automated domain tests cover store schedule boundaries, distance, offer eligibility, and valid/invalid order transitions. Build/type-check, local HTTP check, and browser walkthrough verify the main path and responsive layout.
