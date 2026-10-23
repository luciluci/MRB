# GET MR B · local delivery demonstration

A responsive, working demonstration of customer shopping, store fulfillment, nearby professional pickup, and delivery. It uses dummy data and does not take payments or place real orders.

## Run locally

Requires Node.js 20.9 or later.

```powershell
cd C:\Users\Lucian\MRB\get-mr-b-demo
npm install
npm run dev
```

Open `http://127.0.0.1:3000` in your browser. The first visit seeds the demonstration in memory; the first action writes `data/state.json`. The **Admin → Reset demo** button restores the original state. `data/state.json` is ignored by Git.

The development command uses Webpack to avoid a repeated Turbopack HMR restart loop observed on `/admin` with Next.js 16.4.2. Live editing and the five-second background data refresh remain enabled.

## Walk through one delivery

1. **Customer:** Choose an Iași sample address or click **Use my GPS** in **Delivering to** and allow browser location access. The available products update for that position and sample time. Add products from one store and place a test order.
2. **Merchant:** The store with the newest active order is selected automatically. Accept the order, then mark it ready for pickup.
3. **Professional:** Go online, choose Iași centre or share browser location, then accept the nearby mission. Confirm pickup and delivery. Missions appear only after the merchant marks an order ready and Alex is within 6 km of pickup.
4. **Admin:** The next-step panel shows what is holding up the order. Use **Activate Alex near stores** to put the sample professional online near the current pickup without changing existing orders. Watch the order board and store opening status. Reset the demo when finished.

The sample clock is fixed to Monday, 19 October 2026, in the Romania time zone (`Europe/Bucharest`). Change its time to demonstrate opening-hour filtering. The Iași stores and pickup coordinates are fictional demonstration data. A browser GPS position outside their delivery radii correctly shows no deliverable products. Browser location is requested only when **Use my GPS** is clicked; the coordinates are saved in the local demo state. The address label shows coordinates because reverse geocoding is not configured.

Older demo stores are relocated and consolidated into their matching Iași records, leaving one record per shop. Saved availability settings and inventory are merged; order references point to the retained stores and offers while order IDs, destinations, status and pricing remain unchanged. The app also adds the Iași catalogue and switches the old default customer address to Iași. **Reset demo** starts a fresh Iași-only state.

## Data and rules

### Search by seller

In **Customer**, use **Search products or sellers** to enter a seller name such as **Urban Grocer**, **Volt Lab**, or **Bean & Bowl**. Matching seller cards appear above the product results, with their address and current availability. Seller matching ignores letter case and leading/trailing spaces, and includes closed sellers within the current delivery area.

Choose **View products** to browse that seller's available catalogue. **All sellers** removes the seller filter; typing a new search also starts a fresh search across sellers. Product categories still filter products, while seller search results remain visible across categories. Product availability and the existing single-store basket rules still apply.

The entire store card under **Stores that deliver here** is also clickable and keyboard accessible. Selecting one clears the search/category, keeps the chosen sort, restarts the 24-offer batch and moves focus to that store's product results. Closed stores show the existing unavailable-products message.

### Product details

Click a product image or name to open its seller-specific detail page at `/products/<offer-id>`. The page includes an image gallery, size/pack, colour, seller, reported stock quantity when available, quantity selection, and Description, Specifications, Reviews and Questions & answers sections. Missing photos, specifications, exact stock counts and feedback have explicit empty states.

Search **Wireless headphones** to test the richer sample catalogue: hover or focus a colour thumbnail to preview its image, click/tap to select that seller's colour offer, and use the gallery thumbnails for another view. Graphite and Sand are available at Volt Lab at the sample opening time; Sage is sold out. The demo illustrations, extra headphone specifications, reported quantities, reviews and answers are labelled as samples. Other products demonstrate partial information and unknown stock quantities. Colour choices retain their own offer ID through basket and checkout. Reviews support a rating filter; review and Q&A publishing is not included.

The basket survives product-page navigation and refresh in the same browser tab using session storage. Quantity limits are checked in the UI and at checkout against reported stock, with the existing limit of 20 per offer. Reported quantities are demo catalogue snapshots, not a live inventory reservation system. Existing saved state gains missing detail fields without resetting orders or overwriting saved values.

### Fastest, cheapest and exact

On mobile (up to 680 px wide), opening the plain home address `/` shows a welcome screen with **Fastest**, **Cheapest**, and **Exact** choices before opening the catalogue, even after a previous visit. An optional product/seller search carries through to the catalogue. The selected mode is recorded in the catalogue URL (`?sort=fastest`, `?sort=cheapest`, or `?sort=exact`), so refreshing that URL or returning from product details retains the selection. Exact opens the seller selector. Direct product and admin links remain accessible.

On desktop, three large choice cards appear at the top of the home page. The active choice is highlighted, and customers can switch modes while browsing on either screen size. These controls work with product search, seller selection and categories. **Fastest** is the default and shows the shortest estimated delivery time first, then lower product prices for equal times. **Cheapest** shows the lowest product price first, then shorter delivery times for equal prices. Cheapest compares the displayed product price, excluding delivery and platform fees. For these two modes, when colours are grouped into one product card per seller, the card represents the best available offer for the selected sort. Unavailable offers remain excluded.

**Exact — Your chosen seller** follows the document's fixed-source rule. Select a shop in the seller picker or through a store card; an already-selected shop (or the current basket's shop if none is selected) is retained when entering Exact. Products are listed A–Z within that seller. Searching and changing categories keep the chosen seller. With no chosen seller, an invalid seller, or an unavailable shop, Exact never falls back to other sellers. **Choose another seller** is an explicit customer action. Mode and seller survive refresh and returning from product details. The existing basket and checkout already retain each offer's seller; this adds no automatic substitutions, multi-store checkout or paid-order collection workflow.

The catalogue initially displays 24 matching offers. **Load 24 more** appends the next batch; the final button shows the actual remaining count. Filtering, sorting and colour grouping apply to the complete available catalogue before batching. Search, category, seller, sort, delivery-location and demo-time changes restart at 24; normal state polling and basket updates retain the loaded count.

### Admin store details

Open **Admin → Sample stores → a store name**, or `/admin/stores/<storeId>`, to view the pickup address, coordinates, delivery radius and current availability. Edit weekly hours (including closed days and split periods), preparation time, accepting-new-orders status, seller cash/card acceptance, and each offer's stock status, optional quantity and confidence.

The admin overview includes an interactive OpenStreetMap street map of all stores, including closed stores and stores outside the customer's search radius. Select a marker for its address and store-detail links. Numbered markers group stores sharing coordinates; **Show all stores** restores the overview after panning or zooming. Map tiles need an internet connection; no Google Maps key is needed for this view.

Hours use `Europe/Bucharest`; closing `24:00` is supported. Overnight schedules must be split across calendar days. Saving validates the entire form before applying it and persists it in the existing demo state. Paused stores, known empty payment acceptance, closing hours and out-of-stock offers prevent new checkout; preparation time affects delivery estimates. Existing orders are preserved.

Stock confidence defaults to **Unverified** and appears on product cards and detail pages. **Probable** means expected but unchecked; **Confirmed** is an administrator's explicit confirmation. These labels are separate from quantity and availability. Payment methods left unverified remain unknown rather than being presented as confirmed. An explicitly empty verified method list makes the store unavailable. These are demo settings, not live payment or inventory integrations.

Each saved store has a revision. Saving a stale page is rejected, with a reload/discard-edits action, so another Admin tab cannot silently overwrite newer availability or stock.

Filters, sorting and the loaded batch size are recorded in the URL. Returning from details (including browser Back) or refreshing restores the catalogue position in the same tab when session storage is available. The demo still retrieves its complete state through `/api/state`; batching limits rendered cards and does not introduce server-side pagination.

- The dummy feed is defined in `src/lib/seed.ts`: canonical products, physical stores, and store-specific offers.
- A store has latitude, longitude, delivery radius, opening schedule, and preparation time.
- All sample stores have a 2 km delivery radius. Customer discovery also searches within 2 km of the selected address or GPS position. Both limits use straight-line distance and apply to seller search, product availability and checkout.
- An offer has one product, one store, price, stock flag, and last update.
- Listings are available only when the store is open now and at estimated pickup, within delivery range, and the offer is in stock.
- Listing order uses availability, approximate delivery time, then price. Approximate delivery time is a demo calculation based on preparation and straight-line distance.
- One order contains offers from one store. Order transitions and courier assignment are validated on the server.
- All accounts and amounts are illustrative. The role switcher is not authentication or authorization.

## Google Maps

The **Delivery location** card below the basket shows the selected address, GPS coordinates, and an OpenStreetMap street map with a pin. It updates for address selections and browser GPS, including when the basket is empty. This embedded map needs internet access but no API key; **Open larger map** opens the same position in a separate tab.

The **Professional → Your location** card below **Location & alerts** uses the same street map to show the professional's current position and coordinates, even when offline or without missions. **Iași centre**, **Far away**, and **Use my location** update the pin. GPS is captured when requested; it is not continuous background tracking. The separate pickup overview appears when nearby or active missions exist.

Without a key, the other map panels show a labelled schematic of the sample locations. To render Google Maps and a pickup-to-customer driving route, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Restart the dev server. Configure the key for the Maps JavaScript API and restrict its browser referrers for your local and deployed domains.

The customer address picker uses Iași sample addresses and browser geolocation. Google Maps is used for map display and route drawing when configured; store eligibility and initial ETA currently use local geometry. A live pilot would use Google route travel times and a production geocoding/address flow.

## Project structure

- `src/lib/domain.ts`: distance, Romanian local store hours, eligible listings, order transitions.
- `src/lib/actions.ts`: checkout and role actions.
- `src/lib/store.ts`: local file persistence for the demonstration.
- `src/app/api/`: shared state and action endpoints.
- `src/app/page.tsx`: four responsive role views.
- `src/components/MapPanel.tsx`: Google map with schematic fallback.

Run `npm test` for domain and API tests. Run `npm run build` for the production compile and TypeScript check.

## Netlify deployment

Import this repository into Netlify using the deployment branch. `netlify.toml` selects Node.js 22, `npm run build`, and `.next`; Netlify installs its Next.js adapter automatically.

In Netlify's environment variables, set `MRB_STORAGE=netlify` for all deploy contexts and include the Functions scope. The hosted app uses Netlify Blobs with strong reads and conditional writes, so demo changes survive serverless invocations and deployments. Concurrent changes retry against the latest saved state, up to five attempts. Storage errors are surfaced instead of silently resetting the demonstration. Netlify supplies storage credentials; do not add tokens to this repository.

The production store is `mrb-demo`; non-production contexts use separate `mrb-demo-<context>` stores. `next.config.ts` embeds this non-secret store name at build time because Netlify's `CONTEXT` variable is not available in Functions. The hosted demo starts with sample data; local saved state is not uploaded. All visitors share its demonstration state and may use the existing demo controls. Local development without `MRB_STORAGE=netlify` keeps `data/state.json` persistence. Explicit paths used by tests always select file storage.

## Before a live pilot

Replace the local JSON state with a durable database such as Supabase Postgres/PostGIS, introduce real account permissions, ingest authorized branch-level stock, connect a payment provider, and build proper settlement/refund and operational support flows. Browser location works while the professional web app is active; native mobile is better suited to reliable background location.
