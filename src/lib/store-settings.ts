import type { DemoState, Hours, PaymentMethod, StockConfidence } from "./types";

export type StoreSettings = {
  storeId: string;
  baseRevision: number;
  hours: Hours;
  prepMinutes: number;
  fulfillmentMode?: "courier_shops" | "merchant_prepared";
  acceptingOrders: boolean;
  acceptedPaymentMethods: PaymentMethod[] | null;
  offers: { offerId: string; stock: "in" | "out"; quantityAvailable: number | null; stockConfidence: StockConfidence }[];
};

export function updateStoreSettings(state: DemoState, input: StoreSettings): DemoState {
  const store = state.stores.find(store => store.id === input.storeId);
  if (!store) throw new Error("Store not found");
  if (input.fulfillmentMode !== undefined && !["courier_shops", "merchant_prepared"].includes(input.fulfillmentMode)) throw new Error("Invalid fulfillment mode");
  if (!Number.isSafeInteger(input.baseRevision) || input.baseRevision !== (store.settingsRevision ?? 0)) throw new Error("Store settings changed since this page was opened. Reload the saved settings before editing again.");
  if (!Number.isInteger(input.prepMinutes) || input.prepMinutes < 0 || input.prepMinutes > 240) throw new Error("Preparation time must be 0–240 minutes");
  if (typeof input.acceptingOrders !== "boolean") throw new Error("Choose whether the store is accepting orders");
  if (input.acceptedPaymentMethods !== null && (!Array.isArray(input.acceptedPaymentMethods) || input.acceptedPaymentMethods.some(method => !["cash", "card"].includes(method)))) throw new Error("Invalid payment methods");
  if (!input.hours || typeof input.hours !== "object" || Array.isArray(input.hours) || Object.keys(input.hours).some(day => !/^[0-6]$/.test(day))) throw new Error("Invalid weekly opening hours");
  const hours: Hours = {};
  for (let day = 0; day < 7; day++) {
    const intervals = input.hours[day];
    if (!Array.isArray(intervals) || intervals.length > 8) throw new Error("Opening hours must include all seven days, with up to eight periods per day");
    const sorted = intervals.map(interval => {
      if (!Array.isArray(interval) || interval.length !== 2) throw new Error("Invalid opening hours");
      const [start, end] = interval;
      if (typeof start !== "string" || typeof end !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
        || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(end) || start >= end) {
        throw new Error("Opening hours must use HH:MM with closing after opening. Split overnight hours across two days.");
      }
      return [start, end] as [string, string];
    }).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.some((interval, index) => index > 0 && interval[0] < sorted[index - 1][1])) throw new Error("Opening hours cannot overlap");
    hours[day] = sorted;
  }
  if (!Array.isArray(input.offers)) throw new Error("Invalid store inventory");
  const ids = new Set<string>();
  for (const item of input.offers) {
    if (!item || !state.offers.some(offer => offer.id === item.offerId && offer.storeId === store.id) || ids.has(item.offerId)) throw new Error("Each inventory item must belong to this store and appear once");
    ids.add(item.offerId);
    if (!["in", "out"].includes(item.stock)) throw new Error("Invalid stock status");
    if (!["confirmed", "probable", "unverified"].includes(item.stockConfidence)) throw new Error("Invalid stock confidence");
    if (item.quantityAvailable !== null && (!Number.isSafeInteger(item.quantityAvailable) || item.quantityAvailable < 0)) throw new Error("Stock quantity must be a nonnegative whole number or left unknown");
  }
  const updates = new Map(input.offers.map(item => [item.offerId, item]));
  return {
    ...state,
    stores: state.stores.map(current => current.id === store.id ? {
      ...current, hours, prepMinutes: input.prepMinutes, acceptingOrders: input.acceptingOrders, settingsRevision: (store.settingsRevision ?? 0) + 1,
      ...(input.fulfillmentMode ? { fulfillmentMode: input.fulfillmentMode } : {}),
      acceptedPaymentMethods: input.acceptedPaymentMethods === null ? undefined : [...new Set(input.acceptedPaymentMethods)],
    } : current),
    offers: state.offers.map(offer => {
      const next = updates.get(offer.id);
      if (next && next.stock === offer.stock && next.quantityAvailable === (offer.quantityAvailable ?? null) && next.stockConfidence === (offer.stockConfidence ?? "unverified")) return offer;
      return next ? { ...offer, stock: next.stock, quantityAvailable: next.quantityAvailable, stockConfidence: next.stockConfidence, updatedAt: state.demoTime } : offer;
    }),
  };
}
