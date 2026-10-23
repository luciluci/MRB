import type { Address, Coordinates, Listing, Offer, Order, OrderAction, Product, Store } from "./types";

export const CUSTOMER_SEARCH_RADIUS_KM = 2;

const rad = (degrees: number) => degrees * Math.PI / 180;
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isWithinDeliveryArea(store: Store, customer: Coordinates): boolean {
  return haversineKm(store, customer) <= Math.min(store.radiusKm, CUSTOMER_SEARCH_RADIUS_KM);
}

function bucharestParts(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday")),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

const clockMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export function isStoreOpenAt(store: Store, date: Date): boolean {
  const { day, minutes } = bucharestParts(date);
  return (store.hours[day] ?? []).some(([start, end]) => minutes >= clockMinutes(start) && minutes < clockMinutes(end));
}

export function storeStatus(store: Store, date: Date): string {
  if (!isStoreOpenAt(store, date)) return "Closed now";
  if (store.acceptingOrders === false) return "Orders paused";
  if (store.acceptedPaymentMethods?.length === 0) return "No accepted payment methods";
  return "Open · delivers here";
}

export function listOffers(products: Product[], offers: Offer[], stores: Store[], customer: Address, at: Date): Listing[] {
  const productById = new Map(products.map(p => [p.id, p]));
  const storeById = new Map(stores.map(s => [s.id, s]));
  return offers.flatMap(offer => {
    const product = productById.get(offer.productId);
    const store = storeById.get(offer.storeId);
    if (!product || !store) return [];
    const distanceKm = haversineKm(store, customer);
    const etaMinutes = store.prepMinutes + 8 + Math.ceil(distanceKm * 4);
    const pickupAt = new Date(at.getTime() + store.prepMinutes * 60_000);
    const reason = offer.stock === "out" || offer.quantityAvailable === 0 ? "Out of stock"
      : !isWithinDeliveryArea(store, customer) ? "Outside delivery area"
      : !isStoreOpenAt(store, at) || !isStoreOpenAt(store, pickupAt) ? "Store closed at pickup time"
      : store.acceptingOrders === false ? "Store is not accepting orders"
      : store.acceptedPaymentMethods?.length === 0 ? "No accepted payment methods"
      : null;
    return [{ product, offer, store, available: !reason, reason, distanceKm, etaMinutes }];
  }).sort((a, b) => Number(b.available) - Number(a.available) || a.etaMinutes - b.etaMinutes || a.offer.price - b.offer.price);
}

export function transitionOrder(order: Order, action: OrderAction): Order {
  const next: Record<OrderAction["type"], [Order["status"], Order["status"]]> = {
    merchantAccept: ["placed", "accepted"], merchantReject: ["placed", "rejected"],
    merchantReady: ["accepted", "ready"], courierAccept: ["ready", "assigned"],
    courierPickup: ["assigned", "picked_up"], courierDeliver: ["picked_up", "delivered"],
  };
  const [expected, status] = next[action.type];
  if (order.status !== expected) throw new Error(`Cannot ${action.type} an order in ${order.status} state`);
  if (action.type === "courierAccept" && order.courierId) throw new Error("Cannot assign an already assigned order");
  return { ...order, status, courierId: action.type === "courierAccept" ? action.courierId : order.courierId };
}
