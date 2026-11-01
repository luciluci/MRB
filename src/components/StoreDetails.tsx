"use client";

import Link from "next/link";
import LocationMap from "@/components/LocationMap";
import { useEffect, useState, type FormEvent } from "react";
import { storeStatus } from "@/lib/domain";
import { fulfillment } from "@/lib/order-flow";
import type { DemoState, Hours, PaymentMethod, StockConfidence } from "@/lib/types";
import type { StoreSettings } from "@/lib/store-settings";
import "./store-details.css";

const days = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]] as const;
function draftFor(state: DemoState, storeId: string): StoreSettings {
  const store = state.stores.find(store => store.id === storeId)!;
  return {
    storeId, baseRevision: store.settingsRevision ?? 0, hours: structuredClone(store.hours), prepMinutes: store.prepMinutes,
    acceptingOrders: store.acceptingOrders !== false,
    fulfillmentMode: fulfillment(store),
    acceptedPaymentMethods: store.acceptedPaymentMethods ? [...store.acceptedPaymentMethods] : null,
    offers: state.offers.filter(offer => offer.storeId === storeId).map(offer => ({
      offerId: offer.id, stock: offer.stock, quantityAvailable: offer.quantityAvailable ?? null,
      stockConfidence: offer.stockConfidence ?? "unverified",
    })),
  };
}

export default function StoreDetails({ initialState, storeId }: { initialState: DemoState; storeId: string }) {
  const [state, setState] = useState(initialState);
  const [draft, setDraft] = useState(() => draftFor(initialState, storeId));
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const store = state.stores.find(store => store.id === storeId)!;
  const updateDay = (day: number, periods: Hours[number]) => setDraft(current => ({ ...current, hours: { ...current.hours, [day]: periods } }));
  async function reloadSaved() {
    setBusy(true);
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not reload store settings");
      const latest = await response.json();
      setState(latest); setDraft(draftFor(latest, storeId)); setDirty(false); setError(""); setMessage("");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not reload store settings"); }
    finally { setBusy(false); }
  }
  function updateOffer(index: number, patch: Partial<StoreSettings["offers"][number]>) {
    setDraft(current => ({ ...current, offers: current.offers.map((offer, i) => i === index ? { ...offer, ...patch } : offer) }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "updateStoreSettings", ...draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save store settings");
      setState(result); setDraft(draftFor(result, storeId)); setDirty(false);
      setMessage("Store settings saved. Availability and delivery estimates are updated.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save store settings"); }
    finally { setBusy(false); }
  }
  return <main className="workspace store-settings-page">
    <Link className="store-back-link" href="/admin">← Back to Admin</Link>
    <header className="workspace-header">
      <div><span className="eyebrow">ADMIN · STORE DETAILS</span><h1>{store.name}</h1><p>{store.category} · {store.address}</p></div>
      <Link className="outline-button" href={`/?seller=${encodeURIComponent(store.id)}&sort=exact&shown=24`}>View customer products ↗</Link>
    </header>
    <div className="store-summary-grid">
      <div><small>CURRENT AVAILABILITY</small><strong>{storeStatus(store, new Date(state.demoTime))}</strong><span>At demo time {new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(state.demoTime))}</span></div>
      <div><small>PICKUP LOCATION</small><strong>{store.lat.toFixed(4)}, {store.lng.toFixed(4)}</strong><span>Delivery radius: {store.radiusKm} km</span></div>
      <div><small>PAYMENT ACCEPTANCE</small><strong>{store.acceptedPaymentMethods === undefined ? "Unverified" : store.acceptedPaymentMethods.length ? store.acceptedPaymentMethods.map(method => method === "cash" ? "Cash" : "Card").join(" · ") : "None accepted"}</strong><span>Seller payment methods at pickup</span></div>
    </div>
    <div className="store-pickup-map">
      <LocationMap
        location={{ address: `${store.name} · ${store.address}`, lat: store.lat, lng: store.lng }}
        heading="Store location"
        note="The pin marks this store’s saved pickup location."
      />
    </div>
    <form onSubmit={save} onChangeCapture={() => { setDirty(true); setMessage(""); setError(""); }}>
      <fieldset disabled={busy || !hydrated} className="store-form-fields">
        <section className="store-settings-card">
          <h2>Readiness and payment</h2>
          <label className="store-field">Fulfillment mode<select value={draft.fulfillmentMode} onChange={event => setDraft(current => ({ ...current, fulfillmentMode: event.target.value as StoreSettings["fulfillmentMode"] }))}><option value="courier_shops">Courier shops and checks out</option><option value="merchant_prepared">Shop prepares; courier collects</option></select></label>
          <p>Applies to new pickups. Existing pickups retain their agreed preparation flow.</p>
          <label className="store-check"><input type="checkbox" checked={draft.acceptingOrders} onChange={event => { const checked = event.target.checked; setDraft(current => ({ ...current, acceptingOrders: checked })); }} />Accepting new orders</label>
          <p>Pause new orders without changing the weekly schedule. Existing orders remain available to fulfil.</p>
          <label className="store-field">Preparation time (minutes)<input type="number" min={0} max={240} step={1} required value={draft.prepMinutes} onChange={event => { const value = Number(event.target.value); setDraft(current => ({ ...current, prepMinutes: value })); }} /></label>
          <p>Time needed before pickup. This is included in customer delivery estimates.</p>
          <label className="store-check"><input type="checkbox" checked={draft.acceptedPaymentMethods !== null} onChange={event => { const checked = event.target.checked; setDraft(current => ({ ...current, acceptedPaymentMethods: checked ? [] : null })); }} />Payment methods verified</label>
          {draft.acceptedPaymentMethods !== null ? <div className="payment-options">{(["cash", "card"] as PaymentMethod[]).map(method => <label key={method} className="store-check"><input type="checkbox" checked={draft.acceptedPaymentMethods?.includes(method) ?? false} onChange={event => setDraft(current => ({ ...current, acceptedPaymentMethods: event.target.checked ? [...(current.acceptedPaymentMethods ?? []), method] : current.acceptedPaymentMethods?.filter(value => value !== method) ?? [] }))} />{method === "cash" ? "Cash" : "Card"}</label>)}</div> : <p>Payment acceptance is unverified. No payment method will be shown as confirmed.</p>}
          {draft.acceptedPaymentMethods?.length === 0 && <p className="store-settings-warning">No accepted payment methods selected. New orders will be unavailable until a method is added.</p>}
        </section>
        <section className="store-settings-card">
          <h2>Weekly opening hours</h2>
          <p>Europe/Bucharest time · Use 24-hour HH:MM. Closing at 24:00 means midnight. Split overnight hours across two days; add periods for lunch breaks.</p>
          {days.map(([day, name]) => <div className="store-hours-day" key={day}>
            <label className="store-check day-toggle"><input type="checkbox" checked={draft.hours[day].length > 0} onChange={event => updateDay(day, event.target.checked ? [["09:00", "18:00"]] : [])} />{name} open</label>
            <div className="store-hours-periods">
              {draft.hours[day].length === 0 ? <span className="closed-day">Closed</span> : draft.hours[day].map(([start, end], index) => <div className="store-hours-period" key={index}>
                <label>From<input aria-label={`${name} opening ${index + 1}`} type="text" inputMode="numeric" placeholder="09:00" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" required value={start} onChange={event => updateDay(day, draft.hours[day].map((period, i) => i === index ? [event.target.value, period[1]] : period))} /></label>
                <label>Until<input aria-label={`${name} closing ${index + 1}`} type="text" inputMode="numeric" placeholder="18:00" pattern="(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)" required value={end} onChange={event => updateDay(day, draft.hours[day].map((period, i) => i === index ? [period[0], event.target.value] : period))} /></label>
                <button type="button" className="text-button" aria-label={`Remove ${name} period ${index + 1}`} onClick={() => { updateDay(day, draft.hours[day].filter((_, i) => i !== index)); setDirty(true); }}>Remove</button>
              </div>)}
              {draft.hours[day].length > 0 && draft.hours[day].length < 8 && <button type="button" className="text-button add-period" aria-label={`Add ${name} period`} onClick={() => { updateDay(day, [...draft.hours[day], ["", ""]]); setDirty(true); }}>+ Add period</button>}
            </div>
          </div>)}
        </section>
        <section className="store-settings-card">
          <h2>Product availability</h2>
          <p>Confirmed = checked with the seller; probable = expected but not checked; unverified = no reliable confirmation. Confidence is separate from whether a product is in stock. Leave quantity blank when unknown.</p>
          <div className="store-inventory">{draft.offers.map((offer, index) => {
            const original = state.offers.find(item => item.id === offer.offerId)!;
            const product = state.products.find(item => item.id === original.productId)!;
            const color = product.colors?.find(color => color.id === original.colorId);
            const name = product.name + (color ? ` · ${color.name}` : "");
            return <div className="store-inventory-item" key={offer.offerId}>
              <div><strong>{product.emoji} {name}</strong><span>{original.price} lei · {product.unit}</span></div>
              <label>Stock<select aria-label={`${name} stock`} value={offer.stock} onChange={event => updateOffer(index, { stock: event.target.value as "in" | "out" })}><option value="in">In stock</option><option value="out">Out of stock</option></select></label>
              <label>Quantity<input aria-label={`${name} quantity`} type="number" min={0} step={1} placeholder="Unknown" value={offer.quantityAvailable ?? ""} onChange={event => updateOffer(index, { quantityAvailable: event.target.value === "" ? null : Number(event.target.value) })} /></label>
              <label>Confidence<select aria-label={`${name} stock confidence`} value={offer.stockConfidence} onChange={event => updateOffer(index, { stockConfidence: event.target.value as StockConfidence })}><option value="confirmed">Confirmed</option><option value="probable">Probable</option><option value="unverified">Unverified</option></select></label>
            </div>;
          })}</div>
          {!draft.offers.length && <p>No products listed for this store yet.</p>}
        </section>
        <div className="store-settings-actions">
          <button type="submit" className="primary-button">{busy ? "Saving…" : "Save store settings"}</button>
          <button type="button" className="outline-button" disabled={!dirty} onClick={() => { setDraft(draftFor(state, storeId)); setDirty(false); setError(""); setMessage(""); }}>Discard changes</button>
          <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
      </fieldset>
      {error && <div className="store-settings-error" role="alert"><p>{error}</p>{error.includes("changed since") && <button type="button" className="outline-button" disabled={busy} onClick={() => void reloadSaved()}>Reload saved settings (discard edits)</button>}</div>}
      {message && <p className="store-settings-success" role="status">{message}</p>}
    </form>
  </main>;
}
