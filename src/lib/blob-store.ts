import { applyAction, type DemoAction } from "./actions";
import { createSeedState } from "./seed";
import type { DemoState } from "./types";

export interface SnapshotStore {
  getWithMetadata(key: string, options: { type: "json"; consistency: "strong" }): Promise<{ data: DemoState; etag?: string } | null>;
  setJSON(key: string, value: DemoState, options: { onlyIfNew: true; onlyIfMatch?: never } | { onlyIfMatch: string; onlyIfNew?: never }): Promise<{ modified: boolean; etag?: string }>;
}

export function createBlobStateStore(storage: SnapshotStore, upgrade: (state: DemoState) => DemoState) {
  const key = "state";
  const snapshot = () => storage.getWithMetadata(key, { type: "json", consistency: "strong" });
  return {
    async read(): Promise<DemoState> {
      const current = await snapshot();
      return upgrade(current ? current.data : createSeedState());
    },
    async update(action: DemoAction): Promise<DemoState> {
      for (let attempt = 0; attempt < 5; attempt++) {
        const current = await snapshot();
        if (current && !current.etag) throw new Error("Saved demo state is missing its ETag");
        const next = applyAction(upgrade(current ? current.data : createSeedState()), action);
        const result = await storage.setJSON(key, next, current
          ? { onlyIfMatch: current.etag! }
          : { onlyIfNew: true });
        if (result.modified) {
          if (!result.etag) throw new Error("Unable to confirm the demo state write");
          return next;
        }
      }
      throw new Error("Demo state changed in another session; please retry your action");
    },
  };
}
