"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoAction } from "./actions";
import type { DemoState } from "./types";

export type ActionFn = (action: DemoAction) => Promise<DemoState | null>;

export function useDemo() {
  const [state, setState] = useState<DemoState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  const generation = useRef(0);
  const requestNumber = useRef(0);
  const retryIds = useRef(new Map<string, string>());
  const refresh = useCallback(async () => {
    if (working.current) return;
    const version = generation.current;
    const request = ++requestNumber.current;
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load orders. Please retry.");
      const next = await response.json();
      if (!working.current && version === generation.current && request === requestNumber.current) setState(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection unavailable"); }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 4000); return () => window.clearInterval(timer); }, [refresh]);
  const action: ActionFn = useCallback(async payload => {
    if (working.current) return null;
    working.current = true; generation.current++; setBusy(true); setError("");
    const key = JSON.stringify(payload);
    let operationId = payload.operationId ?? retryIds.current.get(key);
    try { operationId ??= sessionStorage.getItem(`mrb-operation:${key}`) ?? undefined; } catch { /* memory fallback */ }
    operationId ??= crypto.randomUUID();
    retryIds.current.set(key, operationId);
    try { sessionStorage.setItem(`mrb-operation:${key}`, operationId); } catch { /* memory fallback */ }
    const clearRetry = () => {
      retryIds.current.delete(key);
      try { sessionStorage.removeItem(`mrb-operation:${key}`); } catch { /* memory fallback */ }
    };
    try {
      const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, operationId }) });
      const data = await response.json();
      if (!response.ok) { clearRetry(); throw new Error(data.error ?? "Could not save this change"); }
      clearRetry(); setState(data); return data as DemoState;
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Retry the same action safely."); return null; }
    finally { working.current = false; generation.current++; setBusy(false); }
  }, []);
  return { state, action, busy, error, setError, refresh };
}
