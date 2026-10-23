"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { groupStoreLocations, type StoreLocation } from "@/lib/store-map";
import type { Store } from "@/lib/types";
import "leaflet/dist/leaflet.css";
import "./store-network-map.css";

export default function StoreNetworkMap({ stores }: { stores: Store[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // Background polling returns new objects; unchanged locations must not reset pan/zoom.
  const locations = JSON.stringify(stores.map(({ id, name, address, lat, lng }) => ({ id, name, address, lat, lng })));

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    setReady(false);
    setError("");
    void import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const groups = groupStoreLocations(JSON.parse(locations) as StoreLocation[]);
      const map = L.map(container.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      for (const group of groups) {
        const popup = document.createElement("div");
        popup.className = "store-map-popup";
        for (const store of group.stores) {
          const entry = document.createElement("div");
          const name = document.createElement("strong");
          name.textContent = store.name;
          const address = document.createElement("p");
          address.textContent = store.address;
          const link = document.createElement("a");
          link.href = `/admin/stores/${encodeURIComponent(store.id)}`;
          link.textContent = "Store details & availability →";
          entry.append(name, address, link);
          popup.append(entry);
        }
        const label = group.stores.map(store => store.name).join(", ");
        const tooltip = document.createElement("span");
        tooltip.textContent = label;
        const marker = L.marker([group.lat, group.lng], {
          title: label,
          alt: `${group.stores.length} ${group.stores.length === 1 ? "store" : "stores"}: ${label}`,
          icon: L.divIcon({
            className: "store-network-marker",
            html: `<span>${group.stores.length > 1 ? group.stores.length : "●"}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16],
          }),
        });
        marker.on("add", () => {
          marker.getElement()?.setAttribute("aria-label", `${group.stores.length} ${group.stores.length === 1 ? "store" : "stores"}: ${label}`);
        });
        marker.addTo(map).bindPopup(popup).bindTooltip(tooltip);
      }
      const fit = () => {
        if (groups.length) map.fitBounds(L.latLngBounds(groups.map(group => [group.lat, group.lng])), { padding: [36, 36], maxZoom: 15 });
        else map.setView([47.163, 27.586], 13);
      };
      fitRef.current = fit;
      fit();
      resize = new ResizeObserver(() => map.invalidateSize());
      resize.observe(container.current);
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError("The map could not load. You can still open every store from the store list below.");
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      fitRef.current = null;
    };
  }, [locations]);

  return <section className="store-network-section" aria-label="All store locations">
    <div className="store-network-heading">
      <div><span className="eyebrow">STORE NETWORK</span><h2>All store locations</h2><p>{stores.length} stores · Includes open and closed stores</p></div>
      <button className="outline-button" disabled={!ready} onClick={() => fitRef.current?.()}>Show all stores</button>
    </div>
    <div className="store-network-canvas" ref={container} aria-label="Interactive street map of all stores" />
    {error ? <p role="alert">{error}</p> : <p className="store-network-hint">{ready ? "Select a marker to see store details. Numbered markers contain stores at the same location. Use + and − to zoom." : "Loading store map…"}</p>}
  </section>;
}
