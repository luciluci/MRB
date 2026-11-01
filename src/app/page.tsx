"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "./product-details.css";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useDemo, type ActionFn } from "@/lib/use-demo";
import { routeEstimate } from "@/lib/order-flow";
import { MerchantOrders, ProfessionalOrders } from "@/components/OrderOperations";
import { shortId, routeSummary } from "@/components/OrderTracking";
import ProductDetails from "@/components/ProductDetails";
import MapPanel from "@/components/MapPanel";
import LocationMap from "@/components/LocationMap";
import StoreNetworkMap from "@/components/StoreNetworkMap";
import { ShoppingModes, MobileShoppingWelcome } from "@/components/ShoppingModes";
import { useShoppingEntry } from "@/lib/use-shopping-entry";
import { CUSTOMER_SEARCH_RADIUS_KM, haversineKm, isStoreOpenAt, isWithinDeliveryArea, listOffers, storeStatus } from "@/lib/domain";
import { useCart } from "@/lib/use-cart";
import { useCatalogueView } from "@/lib/use-catalogue-view";
import { CATALOGUE_BATCH_SIZE, filterCatalogue } from "@/lib/catalogue-view";
import type { DemoAction } from "@/lib/actions";
import type { Category, DemoState, Listing, Order, Store } from "@/lib/types";

type Role = "customer" | "merchant" | "professional" | "admin";

const roles: { id: Role; label: string; symbol: string }[] = [
  { id: "customer", label: "Customer", symbol: "◈" }, { id: "merchant", label: "Merchant", symbol: "▤" },
  { id: "professional", label: "Professional", symbol: "↗" }, { id: "admin", label: "Admin", symbol: "◫" },
];
const categories: ("All" | Category)[] = ["All", "Food", "Groceries", "Electronics", "Flowers", "Sports"];
const addresses = [
  { address: "Piața Unirii, Iași, România", lat: 47.1665, lng: 27.5800 },
  { address: "Palas, Iași, România", lat: 47.1573, lng: 27.5895 },
  { address: "Copou, Iași, România", lat: 47.1770, lng: 27.5680 },
  { address: "Tudor Vladimirescu, Iași, România", lat: 47.1550, lng: 27.6050 },
  { address: "Păcurari, Iași, România", lat: 47.1800, lng: 27.5450 },
];
const timeOptions = [
  ["08:00", "2026-10-19T05:00:00.000Z"], ["13:00", "2026-10-19T10:00:00.000Z"],
  ["17:30", "2026-10-19T14:30:00.000Z"], ["19:30", "2026-10-19T16:30:00.000Z"],
  ["21:30", "2026-10-19T18:30:00.000Z"], ["23:00", "2026-10-19T20:00:00.000Z"],
];
const currency = (value: number) => `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(value)} lei`;
const localTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const statusLabel: Record<Order["status"], string> = {
  placed: "Order placed", accepted: "Accepted", ready: "Ready for pickup", assigned: "Professional assigned",
  picked_up: "On the way", delivered: "Delivered", rejected: "Declined by store",
};

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon-box" aria-hidden="true">{children}</span>; }
function Empty({ symbol, title, text }: { symbol: string; title: string; text: string }) { return <div className="empty"><div className="empty-symbol">{symbol}</div><h3>{title}</h3><p>{text}</p></div>; }
function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) { return <div className="section-title"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{right}</div>; }

function OrderItems({ order, state }: { order: Order; state: DemoState }) {
  return <div className="order-items">{order.items.map(item => {
    const offer = state.offers.find(o => o.id === item.offerId);
    const product = state.products.find(p => p.id === offer?.productId);
    const color = product?.colors?.find(c => c.id === offer?.colorId);
    return <div key={item.offerId} className="order-item"><span className="order-item-emoji">{product?.emoji ?? "◻"}</span><span><strong>{product?.name ?? "Product"}{color ? ` · ${color.name}` : ""}</strong><small>× {item.quantity}</small></span><b>{currency(item.unitPrice * item.quantity)}</b></div>;
  })}</div>;
}

function OrderTimeline({ order }: { order: Order }) {
  const steps: Order["status"][] = ["placed", "accepted", "ready", "assigned", "picked_up", "delivered"];
  const index = steps.indexOf(order.status);
  return <div className="timeline">{steps.map((step, i) => <div className={`timeline-step ${i <= index ? "done" : ""}`} key={step}><span className="timeline-marker">{i < index ? "✓" : i + 1}</span><span>{statusLabel[step]}</span></div>)}</div>;
}

function CustomerView({ state, action, busy, entryFocus, onEntered }: { state: DemoState; action: ActionFn; busy: boolean; entryFocus: "seller" | "catalogue" | null; onEntered: () => void }) {
  const params = useParams();
  const router = useRouter();
  const detailOfferId = typeof params.offerId === "string" ? params.offerId : null;
  const catalogue = useCatalogueView(!detailOfferId, `${state.customer.lat},${state.customer.lng}|${state.demoTime}`);
  const { category, sortMode, search, selectedSellerId, updateFilters } = catalogue;
  const productGrid = useRef<HTMLDivElement>(null);
  const productResults = useRef<HTMLElement>(null);
  const firstNewIndex = useRef<number | null>(null);
  const [cart, setCart] = useCart();
  const [cartMessage, setCartMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const listings = useMemo(() => listOffers(state.products, state.offers, state.stores, state.customer, new Date(state.demoTime)), [state]);
  const available = listings.filter(x => x.available);
  const query = search.trim().toLowerCase();
  const selectedSeller = state.stores.find(store => store.id === selectedSellerId);
  const filtered = filterCatalogue(listings, catalogue);
  const visible = filtered.slice(0, catalogue.limit);
  useEffect(() => {
    if (firstNewIndex.current === null) return;
    productGrid.current?.querySelectorAll<HTMLAnchorElement>(".product-detail-link")[firstNewIndex.current]?.focus();
    firstNewIndex.current = null;
  }, [visible.length]);
  useEffect(() => {
    if (!catalogue.ready || !entryFocus || detailOfferId) return;
    const target = document.getElementById(entryFocus === "seller" ? "exact-seller" : "shopping-mode-title");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    onEntered();
  }, [catalogue.ready, entryFocus, detailOfferId, onEntered]);
  const detailListing = listings.find(listing => listing.offer.id === detailOfferId);
  const nearbyStores = state.stores.filter(store => isWithinDeliveryArea(store, state.customer));
  const matchingSellers = query ? nearbyStores.filter(store => store.name.toLowerCase().includes(query)) : [];
  const items = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ listing: listings.find(x => x.offer.id === id), quantity })).filter((x): x is { listing: Listing; quantity: number } => !!x.listing);
  const cartStore = items[0]?.listing.store;
  const cartStores = [...new Map(items.map(x => [x.listing.store.id, x.listing.store])).values()];
  const estimate = routeEstimate(cartStores, state.customer);
  const subtotal = items.reduce((sum, x) => sum + x.listing.offer.price * x.quantity, 0);
  const deliveryFee = cartStore ? estimate.deliveryFee : 0;
  const platformFee = Math.round(subtotal * 4) / 100;
  const checkoutReady = items.length > 0 && items.every(x => x.listing.available && x.quantity <= Math.min(20, x.listing.offer.quantityAvailable ?? 20));
  const active = state.orders.find(o => !["delivered", "rejected"].includes(o.status));

  function browseStore(storeId: string) {
    updateFilters({ selectedSellerId: storeId, search: "", category: "All" });
    // Move both keyboard focus and the viewport to the updated results,
    // including when the already-selected store is clicked again.
    window.requestAnimationFrame(() => {
      productResults.current?.focus({ preventScroll: true });
      productResults.current?.scrollIntoView({ block: "start" });
    });
  }

  function add(listing: Listing, quantity = 1): boolean {
    if (!listing.available) return false;
    if (!Number.isInteger(quantity) || quantity < 1 || (cart[listing.offer.id] ?? 0) + quantity > Math.min(20, listing.offer.quantityAvailable ?? 20)) {
      setCartMessage("This quantity exceeds the seller's reported stock or the 20-item limit."); return false;
    }
    setCartMessage(""); setCart(current => ({ ...current, [listing.offer.id]: (current[listing.offer.id] ?? 0) + quantity }));
    return true;
  }
  function useMyLocation() {
    if (!navigator.geolocation) { setLocationError("This browser does not support location. Choose an Iași sample address instead."); return; }
    setLocationError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude: lat, longitude: lng } = position.coords;
      void action({ type: "setCustomerLocation", address: `GPS · ${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      setLocating(false);
    }, error => {
      setLocationError(error.code === 1 ? "Location permission was denied. Choose an Iași sample address or allow location in your browser." : "Your location could not be determined. Try again or choose an Iași sample address.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  async function checkout() {
    if (!checkoutReady) return;
    const checkoutItems = items.map(x => ({ offerId: x.listing.offer.id, quantity: x.quantity }));
    const key = `mrb-checkout:${JSON.stringify({ checkoutItems, address: state.customer })}`;
    let operationId = crypto.randomUUID();
    try { operationId = sessionStorage.getItem(key) ?? operationId; sessionStorage.setItem(key, operationId); } catch { /* request hook also retains retries */ }
    const result = await action({ type: "placeOrder", operationId, items: checkoutItems });
    if (result) {
      setCart({}); setCartMessage("");
      try { sessionStorage.removeItem(key); } catch { /* no-op */ }
      router.push(`/orders/${encodeURIComponent(`MRB-${operationId}`)}`);
    }
  }
  return <>
    <div className="customer-main" onClickCapture={catalogue.rememberProductNavigation}>
      <div className="customer-content">
        {detailOfferId ? detailListing ? <ProductDetails key={detailListing.offer.id} listing={detailListing} listings={listings} inBasket={cart[detailListing.offer.id] ?? 0} onAdd={add} backHref={catalogue.backHref} /> : <><Link href={catalogue.backHref} scroll={false}>← Back to shopping</Link><Empty symbol="⌕" title="Product not found" text="This seller offer is no longer in the catalogue. Return to shopping to choose another product." /></> : <>
        <section className="shopping-mode-panel" aria-labelledby="shopping-mode-title">
          <span className="eyebrow">YOUR DELIVERY, YOUR CHOICE</span>
          <h1 id="shopping-mode-title" tabIndex={-1}>How would you like to shop?</h1>
          <p>Choose what matters most. You can switch any time while browsing.</p>
          <ShoppingModes selected={sortMode} onChoose={mode => {
            updateFilters({ sortMode: mode, ...(mode === "exact" ? { selectedSellerId: selectedSeller?.id ?? cartStore?.id ?? null } : {}) });
            if (mode === "exact") window.requestAnimationFrame(() => document.getElementById("exact-seller")?.focus());
          }} />
        </section>
        <div className="address-strip"><Icon>⌖</Icon><div className="address-picker"><small>DELIVERING TO</small><select aria-label="Delivery address" value={state.customer.address} disabled={busy || locating} onChange={e => { const next = addresses.find(a => a.address === e.target.value); if (next) { setLocationError(""); void action({ type: "setCustomerLocation", ...next }); } }}>{!addresses.some(a => a.address === state.customer.address) && <option value={state.customer.address}>{state.customer.address}</option>}{addresses.map(a => <option key={a.address} value={a.address}>{a.address}</option>)}</select></div><button className="gps-button" disabled={busy || locating} onClick={useMyLocation}>⌖ {locating ? "Locating…" : "Use my GPS"}</button><div className="address-time"><span className="live-dot" /> Monday · {localTime(state.demoTime)}</div></div>
        {locationError && <div className="location-error" role="alert">{locationError}</div>}
        <section id="discover" className="browse-section"><SectionTitle eyebrow="DISCOVER" title="What are you looking for?" right={<span className="muted-count">{available.length} deliverable offers</span>} /><div className="search-field"><span>⌕</span><input aria-label="Search products or sellers" placeholder="Search products or sellers" value={search} onChange={e => { updateFilters({ search: e.target.value, ...(sortMode === "exact" ? {} : { selectedSellerId: null }) }); }} />{search && <button className="text-button" onClick={() => updateFilters({ search: "" })} aria-label="Clear search">Clear</button>}<kbd>SEARCH</kbd></div><div className="category-row">{categories.map(c => <button key={c} className={`category-chip ${category === c ? "selected" : ""}`} onClick={() => updateFilters({ category: c })}>{c === "All" && <span>✳</span>}{c}</button>)}</div></section>
        {query && <section className="seller-results" aria-label="Seller search results">
          <SectionTitle eyebrow="SELLERS" title="Matching sellers" right={<span className="muted-count" role="status">{matchingSellers.length} {matchingSellers.length === 1 ? "seller" : "sellers"} in your delivery area</span>} />
          {matchingSellers.length ? <div className="store-grid">{matchingSellers.map(store => {
            const status = storeStatus(store, new Date(state.demoTime));
            const open = status === "Open · delivers here";
            const offerCount = available.filter(listing => listing.store.id === store.id).length;
            return <article key={store.id} className="store-tile seller-result">
              <div className="store-mark" style={{ background: store.accent }}>{store.mark}</div>
              <div className="seller-details">
                <h3>{store.name}</h3>
                <p>{store.category} · {haversineKm(store, state.customer).toFixed(1)} km away</p>
                <p>{store.address}</p>
                <span className={`store-state ${open && offerCount ? "open" : ""}`}>{!open ? status : offerCount ? `Open · ${offerCount} available products` : "No products available now"}</span>
                <button className="outline-button" aria-label={`View products from ${store.name}`} onClick={() => browseStore(store.id)}>View products ↗</button>
              </div>
            </article>;
          })}</div> : <p className="seller-no-results">No sellers match “{search.trim()}” in your delivery area. Try another seller name, or browse the product results below.</p>}
        </section>}
        {selectedSeller && <div className="selected-seller" role="status">
          <div><span className="eyebrow">{sortMode === "exact" ? "YOUR CHOSEN SELLER" : "BROWSING SELLER"}</span><strong>{selectedSeller.name}</strong><p>{selectedSeller.address}</p></div>
          <button className="outline-button" onClick={() => { updateFilters({ selectedSellerId: null }); if (sortMode === "exact") window.requestAnimationFrame(() => document.getElementById("exact-seller")?.focus()); }}>{sortMode === "exact" ? "Choose another seller" : "All sellers"}</button>
        </div>}
        {sortMode === "exact" && <div className="exact-seller-panel">
          <label htmlFor="exact-seller">Choose your seller</label>
          <select id="exact-seller" value={selectedSeller?.id ?? ""} onChange={event => updateFilters({ selectedSellerId: event.target.value || null, search: "", category: "All" })}>
            <option value="">Select a shop</option>
            {selectedSeller && !nearbyStores.some(store => store.id === selectedSeller.id) && <option value={selectedSeller.id}>{selectedSeller.name} · outside delivery area</option>}
            {nearbyStores.map(store => <option key={store.id} value={store.id}>{store.name}{storeStatus(store, new Date(state.demoTime)) !== "Open · delivers here" ? " · " + storeStatus(store, new Date(state.demoTime)) : ""}</option>)}
          </select>
          <p>{selectedSeller ? <>Products stay with {selectedSeller.name}. We won’t switch sellers automatically.</> : "Choose the shop you want to buy from. You can also select a store card below."}</p>
        </div>}
        <section className="products-section" ref={productResults} tabIndex={-1} aria-label="Product results"><SectionTitle eyebrow="FROM YOUR NEIGHBOURHOOD" title={selectedSeller ? `${category === "All" ? "Available products" : category} from ${selectedSeller.name}` : category === "All" ? "Available around you" : category} right={<span className="view-note" role="status">{sortMode === "exact" ? "Your chosen seller · A–Z" : sortMode === "fastest" ? "Soonest delivery first" : "Lowest product price first"}</span>} />{filtered.length ? <div id="catalogue-products" className="product-grid" ref={productGrid}>{visible.map((listing, index) => <article className={`product-card ${!listing.available ? "unavailable" : ""}`} key={listing.offer.id}><Link href={`/products/${encodeURIComponent(listing.offer.id)}`} className={`product-art product-detail-link art-${listing.product.category.toLowerCase()}`} aria-label={`View ${listing.product.name} from ${listing.store.name}`}><span className="product-art-orbit" />{listing.product.images?.[0] ? <img className="catalog-product-image" src={listing.product.colors?.find(color => color.id === listing.offer.colorId)?.images[0]?.src ?? listing.product.images[0].src} alt={listing.product.name} width={240} height={240} /> : <span className="product-emoji">{listing.product.emoji}</span>}{listing.available && index < 5 && <span className="art-tag">NEAR YOU</span>}</Link><div className="product-info"><div className="product-store"><span className="store-dot" style={{ background: listing.store.accent }} />{listing.store.name}</div><h3><Link href={`/products/${encodeURIComponent(listing.offer.id)}`}>{listing.product.name}</Link></h3><p>{listing.product.description}</p><div className="product-meta"><span>{listing.product.unit}</span><span>·</span><span>{listing.available ? `${listing.etaMinutes}–${listing.etaMinutes + 10} min` : listing.reason}</span></div><div className="stock-confidence">Stock confidence: {listing.offer.stockConfidence ?? "unverified"}</div><div className="product-bottom"><strong>{currency(listing.offer.price)}</strong><button aria-label={`Add ${listing.product.name} from ${listing.store.name}`} disabled={!listing.available} onClick={() => add(listing)}>{listing.available ? "+" : "×"}</button></div></div></article>)}</div> : <Empty symbol="⌕" title={sortMode === "exact" && !selectedSeller ? "Choose your seller to see products" : selectedSeller ? "No available products from this seller" : available.length ? "No matching products" : "No products available here now"} text={sortMode === "exact" ? selectedSeller ? "Try another search or category, check the shop’s hours or delivery area, or choose another seller yourself." : "Select a shop above or use a store card below. Exact only shows products from the seller you choose." : selectedSeller ? "Try another category, check the sample store hours, or choose All sellers." : available.length ? "Try another search or category." : "Try another Iași address or check the sample store hours."} />}</section>
        {filtered.length > 0 && <div className="catalogue-pagination">
          <p role="status" aria-live="polite" aria-atomic="true">Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> offers</p>
          {visible.length < filtered.length ? <button className="outline-button load-more-button" aria-controls="catalogue-products" onClick={() => {
            firstNewIndex.current = visible.length;
            catalogue.loadMore();
          }}>Load {Math.min(CATALOGUE_BATCH_SIZE, filtered.length - visible.length)} more <span aria-hidden="true">↓</span></button> : <span className="catalogue-end">You’ve seen all matching offers</span>}
        </div>}
        <section className="stores-section"><SectionTitle eyebrow="LOCAL PARTNERS" title="Stores that deliver here" right={<span className="muted-count">Within {CUSTOMER_SEARCH_RADIUS_KM} km of you</span>} /><div className="store-grid">{nearbyStores.map(store => {
          const status = storeStatus(store, new Date(state.demoTime));
            const open = status === "Open · delivers here";
          const km = haversineKm(store, state.customer);
          return <button type="button" key={store.id} className="store-tile store-filter-card" aria-label={`Browse products from ${store.name}`} aria-pressed={selectedSellerId === store.id} onClick={() => browseStore(store.id)}>
            <span className="store-mark" style={{ background: store.accent }}>{store.mark}</span>
            <span className="store-summary">
              <strong className="store-name">{store.name}</strong>
              <span className="store-distance">{store.category} · {km.toFixed(1)} km away</span>
              <span className={`store-state ${open ? "open" : ""}`}>{status}</span>
              <span className="store-browse-label">View products <span aria-hidden="true">↗</span></span>
            </span>
          </button>;
        })}{!nearbyStores.length && <Empty symbol="⌖" title="No sample stores in range" text="Use your GPS in Iași or select an Iași sample address." />}</div></section>
        </>}
      </div>
      <aside className="customer-rail"><div className="rail-card cart-card"><div className="rail-heading"><span>YOUR BASKET</span><b>{items.reduce((sum, x) => sum + x.quantity, 0)} items</b></div>{items.length ? <>
        {cartStores.map((store, index) => <section className="basket-shop" key={store.id}><h3>{index + 1}. {store.name}</h3><div className="cart-lines">{items.filter(x => x.listing.store.id === store.id).map(({ listing, quantity }) => <div key={listing.offer.id} className="cart-line"><span className="cart-emoji">{listing.product.emoji}</span><div><strong><Link href={`/products/${encodeURIComponent(listing.offer.id)}`}>{listing.product.name}</Link>{listing.offer.colorId && <span className="cart-color">{listing.product.colors?.find(color => color.id === listing.offer.colorId)?.name}</span>}</strong><small>{currency(listing.offer.price)}</small><div className="quantity"><button aria-label={`Remove one ${listing.product.name}`} onClick={() => setCart(current => ({ ...current, [listing.offer.id]: Math.max(0, (current[listing.offer.id] ?? 0) - 1) }))}>−</button><span>{quantity}</span><button aria-label={`Add one ${listing.product.name}`} disabled={quantity >= Math.min(20, listing.offer.quantityAvailable ?? 20)} onClick={() => add(listing)}>+</button></div></div></div>)}</div></section>)}
        <div className="basket-route"><strong>Planned pickup order</strong><br />{cartStores.map(s => s.name).join(" → ")} → You<br />To: {state.customer.address}<br />Illustrative estimate: {estimate.etaMinutes} min</div>
        <div className="cart-totals"><div><span>Subtotal</span><strong>{currency(subtotal)}</strong></div><div><span>Delivery · whole route</span><strong>{currency(deliveryFee)}</strong></div><div><span>Platform fee · 4%</span><strong>{currency(platformFee)}</strong></div><div className="cart-total"><span>Total</span><strong>{currency(subtotal + deliveryFee + platformFee)}</strong></div></div>{!checkoutReady && <div className="inline-warning">Some basket items are unavailable or exceed reported stock. Reduce their quantity or check the address and store time.</div>}<button className="primary-button full" disabled={!checkoutReady || busy} onClick={() => void checkout()}>Place test order <span>↗</span></button>{cartMessage && <div className="inline-warning">{cartMessage}</div>}<button className="text-button" onClick={() => { setCart({}); setCartMessage(""); }}>Clear basket</button><p className="rail-footnote">Demonstration checkout. No payment is collected.</p></> : <div className="basket-empty"><div>🛍️</div><h3>Nothing in your basket yet</h3><p>Choose products from one or more nearby shops.</p></div>}</div>        <LocationMap location={state.customer} />
        {active && <div className="rail-card order-rail"><div className="rail-heading"><span>ACTIVE ORDER</span><span className="small-pill">{shortId(active.id)}</span></div><h3>{statusLabel[active.status]}</h3><p>{active.tracking?.stops.map(s => s.storeName).join(" + ")}</p><Link className="primary-button full" href={`/orders/${active.id}`}>Track order & Add More →</Link></div>}        <div className="rail-card delivery-promise"><span className="promise-icon">✳</span><div><h3>Made for the moment</h3><p>One local basket. One simple delivery.</p></div></div>
      </aside>
    </div>
  </>;
}

function AdminGuide({ state, action, busy, onNavigate }: { state: DemoState; action: ActionFn; busy: boolean; onNavigate: (role: Role) => void }) {
  const order = state.orders.find(o => !["delivered", "rejected"].includes(o.status));
  const store = state.stores.find(s => s.id === order?.storeId);
  const merchantStep = order?.status === "placed" || order?.status === "accepted";
  const courierStep = order?.status === "ready";
  const courierNear = store ? haversineKm(state.courier, store) <= 6 : state.stores.some(s => haversineKm(state.courier, s) <= 6);
  const courierLocationFresh = !!state.courier.lastLocationAt && Math.abs(Date.parse(state.demoTime) - Date.parse(state.courier.lastLocationAt)) <= 30 * 60_000;
  const courierReady = state.courier.online && courierNear && courierLocationFresh;

  let title = "Start with a test order";
  let detail = "Place an order as Customer to begin the delivery flow.";
  if (merchantStep) {
    title = `${store?.name ?? "The store"} needs to prepare ${order?.id}`;
    detail = order?.status === "placed"
      ? "Open Merchant to accept the order, then mark it ready for pickup. A courier can acknowledge while the shop prepares."
      : "Open Merchant and mark the accepted order ready for pickup. Prepared items must be ready before collection.";
  } else if (courierStep) {
    title = courierReady ? `${order?.id} is ready for Alex` : "Bring Alex near the pickup";
    detail = courierReady
      ? "Alex is online and near the store. Open Professional to accept the mission."
      : `${order?.id} is ready. Alex must be online and within 6 km of ${store?.name ?? "the store"} to see it.`;
  } else if (order) {
    title = `${order.id} is on its way`;
    detail = "Open Professional to confirm pickup and delivery.";
  }

  return <section className="admin-guide" aria-label="Demo next step">
    <div><span className="eyebrow">NEXT STEP</span><h2>{title}</h2><p>{detail}</p>
      {order && !["assigned", "picked_up"].includes(order.status) && <small>Sample professional: Alex · {!state.courier.online ? "offline" : !courierNear ? "online but outside the 6 km pickup range" : !courierLocationFresh ? "online but location needs refreshing" : "online and nearby"}</small>}
    </div>
    <div className="admin-guide-actions">
      <button className="primary-button" onClick={() => onNavigate(merchantStep ? "merchant" : courierStep || order ? "professional" : "customer")}>{merchantStep ? `Open ${store?.name ?? "Merchant"} →` : courierStep || order ? "Open Professional →" : "Open Customer →"}</button>
      {(merchantStep || courierStep) && !courierReady && <button className="outline-button" disabled={busy} onClick={() => void action({ type: "prepareDemoCourier" })}>{state.courier.online ? "Refresh Alex near stores" : "Activate Alex near stores"}</button>}
    </div>
  </section>;
}

function AdminView({ state, action, busy, onNavigate }: { state: DemoState; action: ActionFn; busy: boolean; onNavigate: (role: Role) => void }) {
  const active = state.orders.filter(o => !["delivered", "rejected"].includes(o.status));
  return <div className="workspace"><div className="workspace-header"><div><span className="eyebrow">OPERATIONS CONSOLE</span><h1>A clear view of every delivery.</h1><p>Monitor the demonstration from order placement to doorstep.</p></div><button className="outline-button" disabled={busy} onClick={() => { if (window.confirm("Reset all demonstration orders and locations?")) void action({ type: "reset" }); }}>↺ Reset demo</button></div><AdminGuide state={state} action={action} busy={busy} onNavigate={onNavigate} /><div className="metric-row"><div className="metric-card"><span>TOTAL ORDERS</span><strong>{state.orders.length}</strong><small>Test orders only</small></div><div className="metric-card"><span>ACTIVE</span><strong>{active.length}</strong><small>In the fulfillment loop</small></div><div className="metric-card"><span>PROFESSIONAL</span><strong className="metric-word">{state.courier.online ? "Online" : "Offline"}</strong><small>Alex · sample account</small></div></div><StoreNetworkMap stores={state.stores} /><div className="workspace-grid admin-grid"><div><SectionTitle eyebrow="LIVE OPERATIONS" title="Order board" />{state.orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>STORE</th><th>STATUS</th><th>TOTAL</th><th>PROFESSIONAL</th></tr></thead><tbody>{state.orders.map(order => <tr key={order.id}><td><Link href={`/orders/${order.id}`}><strong>{shortId(order.id)}</strong></Link><small>{localTime(order.createdAt)}</small></td><td>{order.tracking?.stops.map(s => s.storeName).filter((v, i, all) => all.indexOf(v) === i).join(" + ")}</td><td><span className={`status-pill status-${order.status}`}>{statusLabel[order.status]}</span></td><td>{currency(order.total)}</td><td>{[...new Set(order.tracking?.routes.map(r => state.couriers?.find(c => c.id === r.courierId)?.name).filter(Boolean))].join(" + ") || "—"}</td></tr>)}</tbody></table></div> : <Empty symbol="◫" title="No orders to monitor" text="Place a test order as Customer to start the complete flow." />}<div className="admin-notes"><div><span>01</span><strong>Customer</strong><p>Adds products from several shops to one order; tracks each pickup.</p></div><div><span>02</span><strong>Merchant</strong><p>Accepts, prepares, and marks the order ready.</p></div><div><span>03</span><strong>Professional</strong><p>Accepts a nearby mission, picks up, and delivers.</p></div></div></div><aside><div className="side-panel"><span className="eyebrow">NETWORK</span><h3>Sample stores</h3><div className="network-list">{state.stores.map(store => <div key={store.id}><span className="network-mark" style={{ background: store.accent }}>{store.mark}</span><Link href={`/admin/stores/${encodeURIComponent(store.id)}`} aria-label={`Manage ${store.name}`}><strong>{store.name}</strong><small>{store.category} · Details & availability ↗</small></Link><b className={storeStatus(store, new Date(state.demoTime)) === "Open · delivers here" ? "green" : ""}>{storeStatus(store, new Date(state.demoTime)) === "Open · delivers here" ? "OPEN" : storeStatus(store, new Date(state.demoTime))}</b></div>)}</div></div></aside></div></div>;
}

export default function Home() {
  const { state, action, busy, error: toast, setError: setToast, refresh } = useDemo();
  const pathname = usePathname();
  const entry = useShoppingEntry();
  const [role, setRole] = useState<Role>(() => pathname === "/admin" ? "admin" : pathname === "/professional" ? "professional" : pathname === "/merchant" ? "merchant" : "customer");
  if (!state || !entry.ready) return <div className="loading"><div className="loading-logo">B<span>.</span></div><p>{toast || "Preparing your local city..."}</p>{toast && <button onClick={() => void refresh()}>Retry</button>}</div>;
  if (role === "customer" && !pathname.startsWith("/products/") && entry.showWelcome) {
    return <MobileShoppingWelcome address={state.customer.address} initialSearch={entry.initialSearch} onChoose={entry.choose} />;
  }
  return <div className="app"><header className="topbar"><div className="brand"><div className="brand-mark">B<span>.</span></div><div><strong>GET MR B</strong><small>THE LOCAL DELIVERY LAB</small></div></div><nav className="role-nav" aria-label="Demo role">{roles.map(item => <button key={item.id} className={role === item.id ? "active" : ""} onClick={() => setRole(item.id)}><span>{item.symbol}</span>{item.label}</button>)}</nav><div className="topbar-end"><Link href="/orders">My Orders</Link><span className="demo-badge"><span /> DEMO MODE</span><div className="avatar">{role === "customer" ? "C" : role === "merchant" ? "M" : role === "professional" ? "A" : "O"}</div></div></header><div className="demo-controls"><span><b>SIMULATION CONTROLS</b> <i /> Monday, 19 October 2026</span><label>Store time <select aria-label="Demo store time" value={state.demoTime} onChange={e => void action({ type: "setDemoTime", iso: e.target.value })}>{timeOptions.map(([label, iso]) => <option value={iso} key={iso}>{label}</option>)}</select></label><span className="control-hint">Change time to see store availability</span></div><main>{role === "customer" ? <CustomerView state={state} action={action} busy={busy} entryFocus={entry.entryFocus} onEntered={entry.clearEntryFocus} /> : role === "merchant" ? <MerchantOrders state={state} action={action} busy={busy} /> : role === "professional" ? <ProfessionalOrders state={state} action={action} busy={busy} /> : <AdminView state={state} action={action} busy={busy} onNavigate={setRole} />}</main><footer className="footer"><span>GET MR B <b>·</b> Local commerce, closer together.</span><span>INTERACTIVE DEMONSTRATION · NO REAL PURCHASES</span></footer>{toast && <div className="toast" role="status"><span>✳</span>{toast}<button aria-label="Dismiss message" onClick={() => setToast("")}>×</button></div>}</div>;
}


