"use client";

import { useState } from "react";
import type { CatalogueView } from "@/lib/catalogue-view";
import "./shopping-modes.css";

export type ShoppingMode = CatalogueView["sortMode"];
const modes: { id: ShoppingMode; label: string; description: string; icon: string }[] = [
  { id: "fastest", label: "Fastest", description: "Shortest delivery time", icon: "↗" },
  { id: "cheapest", label: "Cheapest", description: "Lowest product price", icon: "↓" },
  { id: "exact", label: "Exact", description: "Items from your chosen shop", icon: "⌂" },
];

export function ShoppingModes({ selected, onChoose }: { selected?: ShoppingMode; onChoose: (mode: ShoppingMode) => void }) {
  return <div className="shopping-mode-options" role="group" aria-label="Choose how to shop">
    {modes.map(mode => <button key={mode.id} type="button" className={`shopping-mode-card mode-${mode.id}`} aria-pressed={selected === undefined ? undefined : selected === mode.id} onClick={() => onChoose(mode.id)}>
      <span className="shopping-mode-icon" aria-hidden="true">{mode.icon}</span>
      <span className="shopping-mode-copy"><strong>{mode.label}</strong><span>{mode.description}</span></span>
      <span className="shopping-mode-indicator" aria-hidden="true">{selected === mode.id ? "✓" : "→"}</span>
    </button>)}
  </div>;
}

export function MobileShoppingWelcome({ address, initialSearch, onChoose }: { address: string; initialSearch: string; onChoose: (mode: ShoppingMode, search: string) => void }) {
  const [search, setSearch] = useState(initialSearch);
  return <main className="shopping-welcome">
    <header className="shopping-welcome-header">
      <div className="shopping-welcome-brand"><span aria-hidden="true">B.</span><strong>MRB GO</strong></div>
      <p className="shopping-welcome-address"><span>Delivering to</span><strong>{address}</strong></p>
      <label htmlFor="welcome-search">What do you need?</label>
      <input id="welcome-search" type="search" placeholder="Search products or sellers" value={search} onChange={event => setSearch(event.target.value)} />
    </header>
    <section className="shopping-welcome-choices" aria-labelledby="welcome-title">
      <span className="eyebrow">YOUR DELIVERY, YOUR CHOICE</span>
      <h1 id="welcome-title">How would you like to shop?</h1>
      <p>Choose an option to start browsing.</p>
      <ShoppingModes onChoose={mode => onChoose(mode, search)} />
      <p className="shopping-welcome-note">You can change your choice and delivery address while browsing.</p>
    </section>
    <footer className="shopping-welcome-footer"><strong>Your neighbourhood, delivered.</strong><span>Food · groceries · electronics · flowers · sports</span></footer>
  </main>;
}
