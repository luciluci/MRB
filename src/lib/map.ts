import type { Coordinates } from "./types";

export function schematicPosition(pin: Coordinates, pins: Coordinates[]): { left: number; top: number } {
  const latitudes = pins.map(p => p.lat);
  const longitudes = pins.map(p => p.lng);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.01) * 1.2;
  const lngRange = Math.max(maxLng - minLng, 0.01) * 1.2;
  const clamp = (value: number) => Math.max(5, Math.min(95, value));
  return {
    left: clamp(50 + (pin.lng - (minLng + maxLng) / 2) / lngRange * 100),
    top: clamp(50 - (pin.lat - (minLat + maxLat) / 2) / latRange * 100),
  };
}
