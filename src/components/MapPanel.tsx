"use client";

import { useEffect, useRef, useState } from "react";
import { schematicPosition } from "@/lib/map";
import type { Coordinates } from "@/lib/types";

type Pin = Coordinates & { label: string; kind: "store" | "customer" | "courier" };
type GoogleWindow = Window & { google?: { maps: any } };

export default function MapPanel({ pins, route, caption }: { pins: Pin[]; route?: [Coordinates, Coordinates]; caption?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!key || !mapRef.current) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled || !mapRef.current) return;
      const maps = (window as GoogleWindow).google?.maps;
      if (!maps) return;
      const center = pins.find(p => p.kind === "customer") ?? pins[0] ?? { lat: 47.1665, lng: 27.5800 };
      const map = new maps.Map(mapRef.current, { center, zoom: 13, disableDefaultUI: true, zoomControl: true, mapTypeControl: false, styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }] });
      const bounds = new maps.LatLngBounds();
      pins.forEach(pin => {
        const position = { lat: pin.lat, lng: pin.lng };
        bounds.extend(position);
        new maps.Marker({ map, position, title: pin.label, label: pin.kind === "customer" ? "D" : pin.kind === "courier" ? "P" : "S" });
      });
      if (pins.length > 1) map.fitBounds(bounds, 48);
      if (route) {
        const directions = new maps.DirectionsService();
        const renderer = new maps.DirectionsRenderer({ map, suppressMarkers: true, polylineOptions: { strokeColor: "#291346", strokeWeight: 5 } });
        directions.route({ origin: route[0], destination: route[1], travelMode: maps.TravelMode.DRIVING }, (result: unknown, status: string) => { if (status === "OK" && !cancelled) renderer.setDirections(result); });
      }
      setLive(true);
    };
    if ((window as GoogleWindow).google?.maps) draw();
    else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
      if (existing) existing.addEventListener("load", draw, { once: true });
      else {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
        script.async = true;
        script.dataset.googleMaps = "true";
        script.addEventListener("load", draw, { once: true });
        document.head.appendChild(script);
      }
    }
    return () => { cancelled = true; };
  }, [key, JSON.stringify(pins), JSON.stringify(route)]);

  return <div className="map-shell">
    {key && <div ref={mapRef} className="google-map" style={{ display: live ? "block" : "none" }} />}
    {!live && <div className="schematic-map" aria-label="Schematic map of sample stores and delivery location">
      <div className="map-water" /><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><div className="map-road road-four" />
      {pins.map((pin, i) => { const position = schematicPosition(pin, pins); return <div key={`${pin.kind}-${pin.label}-${i}`} className={`map-pin ${pin.kind}`} style={{ left: `${position.left}%`, top: `${position.top}%` }} title={pin.label}>{pin.kind === "customer" ? "⌂" : pin.kind === "courier" ? "➤" : "●"}</div>; })}
      <span className="map-schematic-label">Illustrative map · add a Google Maps key for live roads</span>
    </div>}
    {caption && <div className="map-caption"><span className="pulse-dot" />{caption}</div>}
  </div>;
}
