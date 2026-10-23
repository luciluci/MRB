import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { applyAction, type DemoAction } from "./actions";
import { createSeedState } from "./seed";
import { offerDetails, productDetails } from "./catalog-details";
import { consolidateStores } from "./consolidate-stores";
import type { DemoState } from "./types";
import { createBlobStateStore } from "./blob-store";

const defaultPath = join(process.cwd(), "data", "state.json");
let queue: Promise<unknown> = Promise.resolve();

function addMissingById<T extends { id: string }>(existing: T[], additions: T[]): T[] {
  const ids = new Set(existing.map(item => item.id));
  return [...existing, ...additions.filter(item => !ids.has(item.id))];
}

function upgradeState(state: DemoState): DemoState {
  const seed = createSeedState();
  const stores = state.stores.map(store => {
    const destination = seed.stores.find(candidate => candidate.id === `iasi-${store.id}`);
    // Relocate the earlier Bucharest demo shops without replacing their settings or IDs.
    const isOldLocation = store.address.includes("București")
      && store.lat >= 44.3 && store.lat <= 44.6 && store.lng >= 25.9 && store.lng <= 26.3;
    return destination && isOldLocation
      ? { ...store, address: destination.address, lat: destination.lat, lng: destination.lng }
      : store;
  });
  return consolidateStores({
    ...state,
    products: addMissingById(state.products.map(product => ({ ...productDetails[product.id], ...product })), seed.products),
    stores: addMissingById(stores, seed.stores),
    offers: addMissingById(state.offers.map(offer => ({ ...offerDetails[offer.id], ...offer })), seed.offers),
    customer: state.customer.address === "Piața Universității, București" ? seed.customer : state.customer,
  });
}

async function netlifyStore() {
  console.info("MRB storage: loading SDK");
  const { getStore } = await import("@netlify/blobs");
  const name = process.env.MRB_STORE;
  if (!name) throw new Error("Netlify demo store is not configured; rebuild the application");
  console.info("MRB storage: opening", name);
  return createBlobStateStore(getStore({ name, consistency: "strong", fetch: async (input, init) => {
    console.info("MRB storage: request", init?.method, new URL(String(input)).hostname);
    const response = await fetch(input, init);
    console.info("MRB storage: response", response.status);
    return response;
  } }), upgradeState);
}

export async function readState(path?: string): Promise<DemoState> {
  if (path === undefined && process.env.MRB_STORAGE === "netlify") return (await netlifyStore()).read();
  // Runtime local data is not a build asset and must not be bundled for Netlify.
  try { return upgradeState(JSON.parse(await readFile(/*turbopackIgnore: true*/ path ?? defaultPath, "utf8")) as DemoState); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createSeedState();
    throw error;
  }
}

export function updateState(action: DemoAction, path?: string): Promise<DemoState> {
  if (path === undefined && process.env.MRB_STORAGE === "netlify") return netlifyStore().then(store => store.update(action));
  const filePath = path ?? defaultPath;
  const pending = queue.then(async () => {
    const next = applyAction(await readState(filePath), action);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2));
    return next;
  });
  queue = pending.catch(() => undefined);
  return pending;
}