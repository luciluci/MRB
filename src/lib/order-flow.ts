import { haversineKm, listOffers } from "./domain";
import type { Address, AdditionQuote, CollectionRoute, Courier, DemoState, ItemSnapshot, Order, PickupStop, Store } from "./types";

export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const fulfillment = (s: Store) => s.fulfillmentMode ?? (s.category === "Food" ? "merchant_prepared" : "courier_shops");
export const destination = (o: Order): Address => ({ address: o.customerAddress, lat: o.customerLat, lng: o.customerLng });
export const terminal = (o: Order) => o.status === "delivered" || o.status === "rejected";
export type BasketItem = { offerId: string; quantity: number };
export type FlowAction =
  | { type: "configureCourier"; courierId: string; online: boolean; maxUnits: number; maxActiveRoutes: number; lat?: number; lng?: number }
  | { type: "routeStep"; orderId: string; routeId: string; courierId: string; step: "acknowledge" | "head" | "arrive" | "finish" | "collect" | "deliver" }
  | { type: "merchantStep"; orderId: string; stopId: string; storeId: string; step: "accept" | "reject" | "ready" | "close" }
  | { type: "quoteAddition"; orderId: string; items: BasketItem[] }
  | { type: "decideAddition"; orderId: string; quoteId: string; role: "customer" | "courier" | "merchant"; actorId?: string; decision: "approve" | "decline" | "cancel" };

function snapshot(state: DemoState, item: { offerId: string; quantity: number; unitPrice: number }): ItemSnapshot {
  const offer = state.offers.find(x => x.id === item.offerId);
  const product = state.products.find(x => x.id === offer?.productId);
  const color = product?.colors?.find(x => x.id === offer?.colorId)?.name;
  return { ...item, name: product?.name ?? item.offerId, emoji: product?.emoji ?? "📦", ...(color ? { color } : {}) };
}

export function migrateOrders(state: DemoState): DemoState {
  const couriers = state.couriers ?? [
    { ...state.courier, maxUnits: 60, maxActiveRoutes: 2 },
    { ...state.courier, id: "courier-mara", name: "Mara", completed: 0, online: false, maxUnits: 40, maxActiveRoutes: 2 },
  ];
  return { ...state, couriers, orders: state.orders.map(o => {
    if (o.tracking?.version === 2) {
      const overdue = o.tracking.additions.some(q => ["quoted", "pending"].includes(q.status) && Date.parse(state.demoTime) >= Date.parse(q.expiresAt));
      if (!overdue) return o;
      const copy = structuredClone(o);
      for (const q of copy.tracking!.additions.filter(q => ["quoted", "pending"].includes(q.status) && Date.parse(state.demoTime) >= Date.parse(q.expiresAt))) expire(state, copy, q, "Quote expired after 15 demo minutes. Pending authorization released.");
      return copy;
    }
    const store = state.stores.find(x => x.id === o.storeId);
    const routeId = `${o.id}-route-1`;
    const progress = o.status === "delivered" ? "delivered" : o.status === "rejected" ? "cancelled" : o.status === "picked_up" ? "collected" : "upcoming";
    const stop: PickupStop = { id: `${o.id}-stop-1`, routeId, storeId: o.storeId, storeName: store?.name ?? o.storeId,
      items: o.items.map(x => snapshot(state, x)), fulfillmentMode: store ? fulfillment(store) : "merchant_prepared",
      preparation: o.status === "placed" ? "pending" : o.status === "rejected" ? "rejected" : o.status === "accepted" ? "accepted" : "ready",
      progress, additionsOpen: ["placed", "accepted"].includes(o.status), revision: 0 };
    const route: CollectionRoute = { id: routeId, stopIds: [stop.id], courierId: o.courierId,
      status: o.status === "delivered" ? "delivered" : o.status === "rejected" ? "cancelled" : o.status === "picked_up" ? "on_way" : o.courierId ? "acknowledged" : "awaiting",
      deliveryFee: o.deliveryFee, etaMinutes: 30, extra: false };
    return { ...o, tracking: { version: 2, stops: [stop], routes: [route], additions: [], adjustments: [], events: [{ id: `${o.id}-history`, at: o.createdAt, text: `Existing order · ${o.status.replaceAll("_", " ")}` }] } };
  }) };
}

// Known inventory is reserved by committed, unfulfilled goods. Delivered goods
// consume inventory at delivery; pending authorizations do not reserve stock.
export function pricedItems(state: DemoState, items: BasketItem[], address: Address): ItemSnapshot[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new Error("Add 1–100 products before checkout");
  const grouped = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.offerId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error("Quantity must be 1 to 20");
    grouped.set(item.offerId, (grouped.get(item.offerId) ?? 0) + item.quantity);
  }
  const listings = listOffers(state.products, state.offers, state.stores, address, new Date(state.demoTime));
  return [...grouped].map(([offerId, quantity]) => {
    const l = listings.find(x => x.offer.id === offerId);
    if (!l?.available) throw new Error("One or more offers are unavailable at this address and time");
    const reserved = state.orders.flatMap(o => o.tracking?.stops ?? []).filter(s => !["cancelled", "delivered"].includes(s.progress)).flatMap(s => s.items).filter(i => i.offerId === offerId).reduce((n, i) => n + i.quantity, 0);
    if (quantity > 20 || (l.offer.quantityAvailable != null && quantity + reserved > l.offer.quantityAvailable)) throw new Error("Requested quantity exceeds available stock or the 20-item limit");
    return snapshot(state, { offerId, quantity, unitPrice: l.offer.price });
  });
}

export function routeEstimate(stores: Store[], address: Address, units = 0) {
  const km = stores.reduce((n, s, i) => n + haversineKm(s, stores[i + 1] ?? address), 0);
  return { deliveryFee: 8 + Math.ceil(km * 2), etaMinutes: stores.reduce((n, s) => n + s.prepMinutes, 0) + 8 + Math.ceil(km * 4) + units };
}

export function placeTrackedOrder(state: DemoState, items: BasketItem[], operationId: string): DemoState {
  const priced = pricedItems(state, items, state.customer);
  const stores = [...new Set(priced.map(i => state.offers.find(x => x.id === i.offerId)!.storeId))].map(id => state.stores.find(s => s.id === id)!);
  const id = `MRB-${operationId}`;
  const routeId = `${id}-route-1`;
  const stops: PickupStop[] = stores.map((s, i) => ({ id: `${id}-stop-${i + 1}`, routeId, storeId: s.id, storeName: s.name,
    items: priced.filter(item => state.offers.find(x => x.id === item.offerId)!.storeId === s.id), fulfillmentMode: fulfillment(s), preparation: "pending", progress: "upcoming", additionsOpen: true, revision: 0 }));
  const estimate = routeEstimate(stores, state.customer);
  const subtotal = money(priced.reduce((n, i) => n + i.quantity * i.unitPrice, 0));
  const platformFee = money(subtotal * .04);
  const order: Order = { id, storeId: stores[0].id, items: priced, customerAddress: state.customer.address, customerLat: state.customer.lat, customerLng: state.customer.lng, status: "placed", subtotal, platformFee, deliveryFee: estimate.deliveryFee, total: money(subtotal + platformFee + estimate.deliveryFee), createdAt: state.demoTime, courierId: null,
    tracking: { version: 2, stops, routes: [{ id: routeId, stopIds: stops.map(s => s.id), courierId: null, status: "awaiting", ...estimate, extra: false }], additions: [], adjustments: [], events: [{ id: `${operationId}-placed`, at: state.demoTime, text: `Order placed · ${stores.length} shop${stores.length === 1 ? "" : "s"}` }] } };
  return { ...state, orders: [order, ...state.orders] };
}

const units = (items: ItemSnapshot[]) => items.reduce((n, i) => n + i.quantity, 0);
const liveRoute = (r: CollectionRoute) => !["delivered", "cancelled"].includes(r.status);
const openStop = (s: PickupStop) => s.additionsOpen && ["upcoming", "heading", "shopping"].includes(s.progress);
const pendingQuote = (q: AdditionQuote) => ["quoted", "pending"].includes(q.status);
const liveStops = (o: Order) => o.tracking!.stops.filter(s => s.progress !== "cancelled");

function event(s: DemoState, o: Order, id: string, text: string) {
  o.tracking!.events.push({ id, at: s.demoTime, text });
}
function closeStop(s: DemoState, o: Order, stop: PickupStop) {
  stop.additionsOpen = false;
  stop.revision++;
  for (const q of o.tracking!.additions.filter(q => q.targetStopId === stop.id && pendingQuote(q))) {
    q.status = "expired";
    q.reason = "This pickup is closed. Request a fresh quote for an extra collection.";
    q.customerApproved = false;
    event(s, o, `${q.id}-cutoff`, q.reason);
  }
}

function synchronize(o: Order) {
  const t = o.tracking!;
  for (const r of t.routes) {
    const stops = t.stops.filter(s => s.routeId === r.id && s.progress !== "cancelled");
    if (!stops.length) r.status = "cancelled";
    else if (stops.every(s => s.progress === "delivered")) r.status = "delivered";
    else if (stops.every(s => ["collected", "delivered"].includes(s.progress))) r.status = "on_way";
  }
  const stops = liveStops(o);
  o.items = stops.flatMap(s => s.items);
  o.subtotal = money(o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0));
  o.platformFee = money(o.subtotal * .04);
  // A partially rejected original route retains its quoted fee. An entirely
  // cancelled extra route is reversed independently.
  o.deliveryFee = stops.length ? money(t.routes.filter(r => !r.extra || r.status !== "cancelled").reduce((n, r) => n + r.deliveryFee, 0)) : 0;
  o.total = money(o.subtotal + o.platformFee + o.deliveryFee);
  o.courierId = t.routes[0].courierId;
  o.status = !stops.length ? "rejected" : t.routes.every(r => !liveRoute(r)) ? "delivered"
    : stops.every(s => ["collected", "delivered"].includes(s.progress)) ? "picked_up"
    : t.routes.some(r => r.courierId && liveRoute(r)) ? "assigned"
    : stops.every(s => s.preparation === "ready") ? "ready"
    : stops.some(s => s.preparation === "accepted" || s.preparation === "ready") ? "accepted" : "placed";
  if (terminal(o)) for (const q of t.additions.filter(pendingQuote)) {
    q.status = "expired"; q.customerApproved = false; q.reason = "Original order is complete. Start a new order.";
  }
}

function courierLoad(s: DemoState, courierId: string, excludeQuote?: string) {
  const routes = s.orders.flatMap(o => o.tracking!.routes.filter(r => r.courierId === courierId && liveRoute(r)));
  const committed = s.orders.flatMap(o => o.tracking!.stops.filter(stop => routes.some(r => r.id === stop.routeId) && !["cancelled", "delivered"].includes(stop.progress))).reduce((n, stop) => n + units(stop.items), 0);
  const pending = s.orders.flatMap(o => o.tracking!.additions).filter(q => q.id !== excludeQuote && q.courierId === courierId && q.status === "pending");
  return { routes, units: committed + pending.reduce((n, q) => n + units(q.items), 0), routeCount: routes.length + pending.filter(q => !q.targetStopId).length };
}
function canCarry(s: DemoState, courier: Courier, store: Store, quantity: number, newRoute: boolean, excludeQuote?: string) {
  const load = courierLoad(s, courier.id, excludeQuote);
  return courier.online && !!courier.lastLocationAt && Math.abs(Date.parse(s.demoTime) - Date.parse(courier.lastLocationAt)) <= 30 * 60_000
    && haversineKm(courier, store) <= 6 && load.units + quantity <= (courier.maxUnits ?? 60)
    && (!newRoute || load.routeCount < (courier.maxActiveRoutes ?? 2))
    && (!newRoute || !load.routes.some(r => r.status === "on_way"));
}
function chooseCourier(s: DemoState, o: Order, store: Store, items: ItemSnapshot[], declined: string[], excludeQuote?: string) {
  const preferred = o.tracking!.routes[0].courierId;
  return [...s.couriers!].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred))
    .find(c => !declined.includes(c.id) && canCarry(s, c, store, units(items), true, excludeQuote));
}
function extraEstimate(s: DemoState, o: Order, store: Store, items: ItemSnapshot[], courierId: string | null) {
  const estimate = routeEstimate([store], destination(o), units(items));
  const c = s.couriers!.find(c => c.id === courierId);
  return { ...estimate, etaMinutes: estimate.etaMinutes + (c ? Math.ceil(haversineKm(c, store) * 4) + courierLoad(s, c.id).routes.reduce((n, r) => n + r.etaMinutes, 0) : 0) };
}

function validateQuote(s: DemoState, o: Order, q: AdditionQuote) {
  if (terminal(o)) throw new Error("This order is no longer active");
  if (Date.parse(s.demoTime) >= Date.parse(q.expiresAt)) throw new Error("Quote expired. Request a fresh quote.");
  const current = pricedItems(s, q.items, destination(o));
  if (current.some((i, n) => i.unitPrice !== q.items[n].unitPrice)) throw new Error("Product price changed. Request a fresh quote.");
  if (q.targetStopId) {
    const stop = o.tracking!.stops.find(x => x.id === q.targetStopId);
    if (!stop || !openStop(stop) || stop.revision !== q.stopRevision) throw new Error("Pickup changed. Request a fresh quote.");
    const route = o.tracking!.routes.find(r => r.id === stop.routeId)!;
    if (q.courierId && q.courierId !== route.courierId) throw new Error("Courier assignment changed. Request a fresh quote.");
    if (route.etaMinutes + units(q.items) !== q.etaMinutes) throw new Error("The route estimate changed. Review and approve a fresh quote.");
  } else {
    const store = s.stores.find(x => x.id === q.storeId)!;
    if (fulfillment(store) !== q.fulfillmentMode) throw new Error("Shop fulfillment changed. Request a fresh quote.");
    const estimate = extraEstimate(s, o, store, q.items, q.courierId);
    if (estimate.etaMinutes !== q.etaMinutes || estimate.deliveryFee !== q.deliveryFee) throw new Error("The collection fee or estimate changed. Review and approve a fresh quote.");
  }
}
function expire(s: DemoState, o: Order, q: AdditionQuote, reason: string) {
  q.status = "expired"; q.customerApproved = false; q.reason = reason;
  event(s, o, `${q.id}-expired`, `Addition expired · ${reason}`);
}
function commitAddition(s: DemoState, o: Order, q: AdditionQuote) {
  if (!q.customerApproved || !q.courierApproved || !q.merchantApproved) return;
  const store = s.stores.find(x => x.id === q.storeId)!;
  const c = s.couriers!.find(x => x.id === q.courierId)!;
  if (!c || !canCarry(s, c, store, units(q.items), !q.targetStopId, q.id)) {
    expire(s, o, q, "Courier availability or capacity changed. Request a fresh quote."); return;
  }
  const items = q.items.map(i => ({ ...i, addedBy: q.id }));
  if (q.targetStopId) {
    const stop = o.tracking!.stops.find(x => x.id === q.targetStopId)!;
    stop.items.push(...items); stop.revision++;
    const route = o.tracking!.routes.find(r => r.id === stop.routeId)!;
    route.etaMinutes = q.etaMinutes;
  } else {
    const routeId = `${q.id}-route`;
    const stop: PickupStop = { id: `${q.id}-stop`, routeId, storeId: store.id, storeName: store.name, items, fulfillmentMode: q.fulfillmentMode, preparation: "accepted", progress: "upcoming", additionsOpen: true, revision: 0 };
    o.tracking!.stops.push(stop);
    o.tracking!.routes.push({ id: routeId, stopIds: [stop.id], courierId: q.courierId, status: "acknowledged", deliveryFee: q.deliveryFee, etaMinutes: q.etaMinutes, extra: true });
  }
  q.status = "accepted";
  event(s, o, `${q.id}-accepted`, `Add More accepted · ${store.name} · +${q.total.toFixed(2)} RON, delivery +${q.deliveryFee.toFixed(2)} RON`);
}

export function applyFlow(input: DemoState, action: FlowAction, operationId: string): DemoState {
  const s = structuredClone(input);
  if (action.type === "configureCourier") {
    const courier = s.couriers!.find(c => c.id === action.courierId);
    if (!courier) throw new Error("Courier not found");
    if (action.lat !== undefined || action.lng !== undefined) {
      if (!Number.isFinite(action.lat) || !Number.isFinite(action.lng) || Math.abs(action.lat!) > 90 || Math.abs(action.lng!) > 180) throw new Error("Invalid courier location");
      courier.lat = action.lat!; courier.lng = action.lng!;
    }
    if (typeof action.online !== "boolean" || !Number.isInteger(action.maxUnits) || action.maxUnits < 1 || action.maxUnits > 200 || !Number.isInteger(action.maxActiveRoutes) || action.maxActiveRoutes < 1 || action.maxActiveRoutes > 5) throw new Error("Choose capacity 1–200 units and 1–5 active routes");
    Object.assign(courier, { online: action.online, maxUnits: action.maxUnits, maxActiveRoutes: action.maxActiveRoutes, lastLocationAt: s.demoTime });
    s.courier = s.couriers![0]; return s;
  }
  const o = s.orders.find(o => o.id === action.orderId);
  if (!o) throw new Error("Order not found");
  const t = o.tracking!;
  if (terminal(o)) throw new Error("This order is no longer active (delivered or cancelled)");
  if (action.type === "routeStep") {
    const r = t.routes.find(r => r.id === action.routeId);
    const c = s.couriers!.find(c => c.id === action.courierId);
    if (!r || !c || !liveRoute(r)) throw new Error("Active route or courier not found");
    const stops = r.stopIds.map(id => t.stops.find(s => s.id === id)!).filter(s => s.progress !== "cancelled");
    const current = stops.find(s => !["collected", "delivered"].includes(s.progress));
    if (action.step === "acknowledge") {
      if (r.courierId) throw new Error("Route is already assigned; complete the active mission");
      const store = s.stores.find(x => x.id === current?.storeId)!;
      if (!c.online) throw new Error("Go online before accepting a mission");
      if (!store || !canCarry(s, c, store, stops.reduce((n, x) => n + units(x.items), 0), true)) throw new Error("Courier location, capacity or active route limit does not allow this mission");
      r.courierId = c.id; r.status = "acknowledged";
      for (const q of t.additions.filter(q => q.targetStopId && r.stopIds.includes(q.targetStopId) && pendingQuote(q))) q.courierId = c.id;
      event(s, o, operationId, `Order acknowledged by ${c.name}`);
    } else {
      if (r.courierId !== c.id) throw new Error("Route must be acknowledged by its assigned courier");
      if (action.step === "deliver") {
        if (r.status !== "on_way") throw new Error("Collect every shop before delivery");
        for (const stop of stops.filter(x => x.progress === "collected")) {
          stop.progress = "delivered";
          for (const item of stop.items) {
            const offer = s.offers.find(x => x.id === item.offerId);
            if (offer?.quantityAvailable != null) offer.quantityAvailable = Math.max(0, offer.quantityAvailable - item.quantity);
          }
        }
        r.status = "delivered"; c.completed++;
        event(s, o, operationId, `${c.name} delivered ${r.extra ? "the extra collection" : "the original collection"}`);
      } else {
        if (!current) throw new Error("All items collected. Continue to delivery.");
        const expected = { head: "upcoming", arrive: "heading", finish: "shopping", collect: "closed" } as const;
        if (!(action.step in expected) || current.progress !== expected[action.step]) throw new Error("Follow the sequence: head to shop, arrive, finish shopping, then collect closed pickup");
        if (action.step === "head") {
          const earlier = s.orders.flatMap(order => order.tracking!.routes).find(other => other.id !== r.id && other.courierId === c.id && ["active", "on_way"].includes(other.status));
          if (earlier) throw new Error("Finish the courier's current collection route first");
          current.progress = "heading";
        }
        if (action.step === "arrive") current.progress = "shopping";
        if (action.step === "finish") { current.progress = "closed"; closeStop(s, o, current); }
        if (action.step === "collect") {
          if (current.fulfillmentMode === "merchant_prepared" && current.preparation !== "ready") throw new Error("Merchant must mark this pickup ready before collection");
          current.progress = "collected";
        }
        r.status = "active";
        const label = { head: "heading to", arrive: "shopping at", finish: "finished shopping at", collect: "collected items from" }[action.step];
        event(s, o, operationId, `${c.name} ${label} ${current.storeName} · stop ${stops.indexOf(current) + 1} of ${stops.length}`);
      }
    }
  } else if (action.type === "merchantStep") {
    const stop = t.stops.find(x => x.id === action.stopId && x.storeId === action.storeId);
    if (!stop || ["collected", "delivered", "cancelled"].includes(stop.progress)) throw new Error("Pickup cannot be changed after collection or cancellation");
    if (action.step === "accept") {
      if (stop.preparation !== "pending") throw new Error("Pickup has already been accepted");
      stop.preparation = "accepted";
    } else if (action.step === "ready") {
      if (stop.preparation !== "accepted") throw new Error("Accept this pickup before marking it ready");
      stop.preparation = "ready";
      if (stop.fulfillmentMode === "merchant_prepared") closeStop(s, o, stop);
    } else if (action.step === "close") {
      if (stop.fulfillmentMode !== "merchant_prepared") throw new Error("Courier shopping closes when the courier finishes shopping");
      closeStop(s, o, stop);
    }
    else if (action.step === "reject") {
      const previous = o.total;
      stop.progress = "cancelled"; stop.preparation = "rejected"; closeStop(s, o, stop);
      synchronize(o);
      t.adjustments.push({ at: s.demoTime, amount: money(o.total - previous), reason: `${stop.storeName} rejected pickup; ${o.deliveryFee ? "quoted delivery retained" : "demo charges reversed"}` });
    } else throw new Error("Unknown merchant action");
    event(s, o, operationId, `${stop.storeName} · ${action.step === "close" ? "kitchen additions closed" : action.step}`);
  } else if (action.type === "quoteAddition") {
    const items = pricedItems(s, action.items, destination(o));
    const storeIds = new Set(items.map(i => s.offers.find(x => x.id === i.offerId)!.storeId));
    if (storeIds.size !== 1) throw new Error("Request additions from one shop at a time");
    const store = s.stores.find(x => x.id === [...storeIds][0])!;
    const stop = t.stops.find(x => x.storeId === store.id && openStop(x));
    const route = stop ? t.routes.find(r => r.id === stop.routeId)! : null;
    const courierId = route ? route.courierId : chooseCourier(s, o, store, items, [])?.id ?? null;
    const estimate = stop ? { deliveryFee: 0, etaMinutes: route!.etaMinutes + units(items) } : extraEstimate(s, o, store, items, courierId);
    const subtotal = money(items.reduce((n, i) => n + i.unitPrice * i.quantity, 0));
    const platformFee = money(subtotal * .04);
    const fulfillmentMode = stop?.fulfillmentMode ?? fulfillment(store);
    const q: AdditionQuote = { id: `ADD-${operationId}`, fulfillmentMode, storeId: store.id, items, targetStopId: stop?.id ?? null, stopRevision: stop?.revision ?? null, ...estimate, subtotal, platformFee, total: money(subtotal + platformFee + estimate.deliveryFee), courierId,
      customerApproved: false, courierApproved: false, merchantApproved: fulfillmentMode === "courier_shops", status: !stop && !courierId ? "unavailable" : "quoted",
      createdAt: s.demoTime, expiresAt: new Date(Date.parse(s.demoTime) + 15 * 60_000).toISOString(), declinedCourierIds: [], ...(!stop && !courierId ? { reason: "No Ready courier has capacity for this collection. Try again after availability changes." } : {}) };
    t.additions.push(q);
  } else if (action.type === "decideAddition") {
    const q = t.additions.find(q => q.id === action.quoteId);
    if (!q || !pendingQuote(q)) throw new Error("This addition is already resolved; request a fresh quote");
    if (!["approve", "decline", "cancel"].includes(action.decision)) throw new Error("Unknown addition decision");
    if (action.role === "customer") {
      if (action.decision !== "approve") { q.status = "cancelled"; q.customerApproved = false; event(s, o, operationId, "Addition cancelled; pending authorization released"); }
      else if (q.status !== "quoted") throw new Error("Customer already approved this quote");
      else {
        try { validateQuote(s, o, q); } catch (e) { expire(s, o, q, (e as Error).message); return s; }
        q.customerApproved = true; q.status = "pending";
        event(s, o, operationId, `Addition approved by customer · ${q.total.toFixed(2)} RON pending confirmation`);
      }
    } else {
      if (!q.customerApproved) throw new Error("Customer approval is required first");
      if (action.role === "courier") {
        if (!q.courierId || q.courierId !== action.actorId) throw new Error("Only the offered courier can decide this addition");
        if (action.decision !== "approve") {
          q.declinedCourierIds.push(q.courierId); q.customerApproved = false; q.courierApproved = false;
          const store = s.stores.find(x => x.id === q.storeId)!;
          const alternate = q.targetStopId ? null : chooseCourier(s, o, store, q.items, q.declinedCourierIds, q.id);
          if (alternate) {
            q.courierId = alternate.id; q.status = "quoted";
            Object.assign(q, extraEstimate(s, o, store, q.items, alternate.id));
            q.total = money(q.subtotal + q.platformFee + q.deliveryFee);
            q.reason = "Another courier is available. Review the revised estimate and approve again.";
          } else { q.status = q.targetStopId ? "declined" : "unavailable"; q.reason = q.targetStopId ? "Courier declined this same-visit addition." : "No courier available for this collection."; }
          event(s, o, operationId, q.reason!); return s;
        }
        q.courierApproved = true;
      } else if (action.role === "merchant") {
        if (q.storeId !== action.actorId) throw new Error("Only this shop can approve these products");
        if (action.decision !== "approve") { q.status = "declined"; q.customerApproved = false; q.reason = "Shop declined the addition. Pending authorization released."; event(s, o, operationId, q.reason); return s; }
        q.merchantApproved = true;
      } else throw new Error("Unknown approval role");
      try { validateQuote(s, o, q); } catch (e) { expire(s, o, q, (e as Error).message); return s; }
      commitAddition(s, o, q);
    }
  }
  synchronize(o);
  s.courier = s.couriers![0];
  return s;
}
