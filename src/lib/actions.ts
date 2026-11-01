import { randomUUID } from "node:crypto";
import { applyFlow, migrateOrders, placeTrackedOrder, type FlowAction } from "./order-flow";

import { createSeedState } from "./seed";
import { updateStoreSettings, type StoreSettings } from "./store-settings";
import type { DemoState, OrderAction } from "./types";

export type DemoAction = ({ operationId?: string } & (
  | FlowAction
  | ({ type: "updateStoreSettings" } & StoreSettings)
  | { type: "reset" }
  | { type: "setDemoTime"; iso: string }
  | { type: "setCustomerLocation"; address: string; lat: number; lng: number }
  | { type: "setCourierOnline"; online: boolean }
  | { type: "setCourierLocation"; lat: number; lng: number }
  | { type: "prepareDemoCourier" }
  | { type: "placeOrder"; items: { offerId: string; quantity: number }[] }
  | ({ orderId: string } & Exclude<OrderAction, { type: "courierAccept" }>)
  | { type: "courierAccept"; orderId: string }));


const finiteCoordinate = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function applyLegacyAction(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "configureCourier" || action.type === "routeStep" || action.type === "merchantStep" || action.type === "quoteAddition" || action.type === "decideAddition") return applyFlow(state, action as FlowAction, action.operationId ?? randomUUID());
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
  if (action.type === "placeOrder") return placeTrackedOrder(state, action.items, action.operationId ?? randomUUID());
  const order = state.orders.find(o => o.id === action.orderId);
  if (!order) throw new Error("Order not found");
  const stop = order.tracking!.stops[0];
  const route = order.tracking!.routes[0];
  const merchantSteps = { merchantAccept: "accept", merchantReject: "reject", merchantReady: "ready" } as const;
  if (action.type === "merchantAccept" || action.type === "merchantReject" || action.type === "merchantReady") {
    if (order.tracking!.stops.length > 1) throw new Error("Choose a specific shop pickup");
    return applyFlow(state, { type: "merchantStep", orderId: order.id, stopId: stop.id, storeId: stop.storeId, step: merchantSteps[action.type] }, action.operationId ?? randomUUID());
  }
  if (action.type === "courierAccept" || action.type === "courierPickup" || action.type === "courierDeliver") return applyFlow(state, { type: "routeStep", orderId: order.id, routeId: route.id, courierId: state.courier.id, step: action.type === "courierAccept" ? "acknowledge" : action.type === "courierPickup" ? "collect" : "deliver" }, action.operationId ?? randomUUID());
  throw new Error("Unknown action");
}

export function applyAction(input: DemoState, action: DemoAction): DemoState {
  if (!action || typeof action.type !== "string") throw new Error("Invalid action");
  if (action.operationId !== undefined && (typeof action.operationId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(action.operationId))) throw new Error("Invalid operation ID");
  const state = migrateOrders(input);
  const key = action.operationId;
  const fingerprint = JSON.stringify(action);
  if (key && state.operations?.[key]) {
    if (state.operations[key] !== fingerprint) throw new Error("Operation ID already used for another action");
    return state;
  }
  let next = migrateOrders(applyLegacyAction(state, action));
  if (["setCourierOnline", "setCourierLocation", "prepareDemoCourier"].includes(action.type)) next = { ...next, couriers: next.couriers!.map(c => c.id === next.courier.id ? next.courier : c) };
  return key ? { ...next, operations: { ...next.operations, [key]: fingerprint } } : next;
}

