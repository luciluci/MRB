"use client";

import { useEffect, useState, type SetStateAction } from "react";

type Cart = Record<string, number>;
const storageKey = "mrb-demo-basket";

// Preserve the basket when moving between catalogue and product detail routes.
export function useCart() {
  const [cart, setCartState] = useState<Cart>({});
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        setCartState(Object.fromEntries(Object.entries(saved).filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0 && quantity <= 20)));
      }
    } catch { /* An unreadable basket starts empty. */ }
  }, []);
  function setCart(update: SetStateAction<Cart>) {
    setCartState(current => {
      const next = typeof update === "function" ? update(current) : update;
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Shopping still works if storage is unavailable. */ }
      return next;
    });
  }
  return [cart, setCart] as const;
}
