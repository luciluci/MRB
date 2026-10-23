import { randomUUID } from "node:crypto";
import { haversineKm, listOffers, transitionOrder } from "./domain";
import { createSeedState } from "./seed";
import { updateStoreSettings, type StoreSettings } from "./store-settings";
import type { DemoState, OrderAction } from "./types";

export type DemoAction =
  | ({ type: "updateStoreSettings" } & StoreSettings)
  | { type: "reset" }
  | { type: "setDemoTime"; iso: string }
  | { type: "setCustomerLocation"; address: string; lat: number; lng: number }
  | { type: "setCourierOnline"; online: boolean }
  | { type: "setCourierLocation"; lat: number; lng: number }
  | { type: "prepareDemoCourier" }
  | { type: "placeOrder"; items: { offerId: string; quantity: number }[] }
  | ({ orderId: string } & Exclude<OrderAction, { type: "courierAccept" }>)
  | { type: "courierAccept"; orderId: string };

const money = (value: number) => Math.round(value * 100) / 100;
const finiteCoordinate = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export function applyAction(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") return createSeedState();
  if (action.type === "updateStoreSettings") return updateStoreSettings(state, action);
  if (action.type === "setDemoTime") {
    if (!Number.isFinite(Date.parse(action.iso))) throw new Error("Invalid demo time");
    return { ...state, demoTime: new Date(action.iso).toISOString() };
  }
  if (action.type === "setCustomerLocation") {
    if (!finiteCoordinate(action.lat, action.lng) || !action.address.trim()) throw new Error("Invalid delivery address");
    return { ...state, customer: { address: action.address.trim(), lat: action.lat, lng: action.lng } };
  }
  if (action.type === "setCourierOnline") return { ...state, courier: { ...state.courier, online: action.online, lastLocationAt: action.online ? state.demoTime : state.courier.lastLocationAt } };
  if (action.type === "setCourierLocation") {
    if (!finiteCoordinate(action.lat, action.lng)) throw new Error("Invalid courier location");
    return { ...state, courier: { ...state.courier, lat: action.lat, lng: action.lng, lastLocationAt: state.demoTime } };
  }
  if (action.type === "prepareDemoCourier") {
    const currentOrder = state.orders.find(o => ["ready", "accepted", "placed"].includes(o.status));
    const pickup = state.stores.find(s => s.id === currentOrder?.storeId) ?? state.stores[0];
    return { ...state, courier: { ...state.courier, online: true, lat: pickup.lat, lng: pickup.lng, lastLocationAt: state.demoTime } };
  }
  if (action.type === "placeOrder") {
    if (!Array.isArray(action.items) || action.items.length === 0) throw new Error("Add an item before checkout");
    const offers = action.items.map(item => {
      const offer = state.offers.find(o => o.id === item.offerId);
      if (!offer) throw new Error("Offer not found");
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error("Quantity must be 1 to 20");
      return offer;
    });
    if (new Set(offers.map(offer => offer.storeId)).size !== 1) throw new Error("An order can contain items from only one store");
    const listings = listOffers(state.products, offers, state.stores, state.customer, new Date(state.demoTime));
    if (listings.some(listing => !listing.available)) throw new Error("One or more offers are unavailable at this address and time");
    const quantities = new Map<string, number>();
    for (const item of action.items) quantities.set(item.offerId, (quantities.get(item.offerId) ?? 0) + item.quantity);
    for (const offer of offers) {
      const quantity = quantities.get(offer.id)!;
      if (quantity > 20 || (offer.quantityAvailable != null && quantity > offer.quantityAvailable)) {
        throw new Error("Requested quantity exceeds available stock or the 20-item limit");
      }
    }
    const store = state.stores.find(s => s.id === offers[0].storeId)!;
    const subtotal = money(action.items.reduce((sum, item, index) => sum + item.quantity * offers[index].price, 0));
    const deliveryFee = 8 + Math.ceil(haversineKm(store, state.customer) * 2);
    const platformFee = money(subtotal * 0.04);
    return { ...state, orders: [{
      id: `MRB-${randomUUID().slice(0, 6).toUpperCase()}`, storeId: store.id,
      items: action.items.map((item, index) => ({ offerId: item.offerId, quantity: item.quantity, unitPrice: offers[index].price })),
      customerAddress: state.customer.address, customerLat: state.customer.lat, customerLng: state.customer.lng,
      status: "placed", subtotal, deliveryFee, platformFee, total: money(subtotal + deliveryFee + platformFee),
      createdAt: state.demoTime, courierId: null,
    }, ...state.orders] };
  }

  const orderIndex = state.orders.findIndex(order => order.id === action.orderId);
  if (orderIndex < 0) throw new Error("Order not found");
  const order = state.orders[orderIndex];
  if (action.type === "courierAccept") {
    if (!state.courier.online) throw new Error("Go online before accepting a mission");
    const store = state.stores.find(s => s.id === order.storeId)!;
    if (haversineKm(state.courier, store) > 6) throw new Error("Mission is outside courier pickup range");
    if (!state.courier.lastLocationAt || Math.abs(Date.parse(state.demoTime) - Date.parse(state.courier.lastLocationAt)) > 30 * 60_000) throw new Error("Refresh courier location to accept this mission");
    if (state.orders.some(o => o.courierId === state.courier.id && ["assigned", "picked_up"].includes(o.status))) throw new Error("Complete the active mission first");
  }
  const nextOrder = transitionOrder(order, action.type === "courierAccept"
    ? { type: "courierAccept", courierId: state.courier.id }
    : { type: action.type } as OrderAction);
  const orders = state.orders.map((current, index) => index === orderIndex ? nextOrder : current);
  return { ...state, orders, courier: action.type === "courierDeliver" ? { ...state.courier, completed: state.courier.completed + 1 } : state.courier };
}
