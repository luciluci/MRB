import type { Address } from "@/lib/types";

export default function LocationMap({ location, heading = "Delivery location", note = "The pin follows your selected address or GPS location." }: { location: Address; heading?: string; note?: string }) {
  const { address, lat, lng } = location;
  const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const params = new URLSearchParams({
    bbox: [Math.max(-180, lng - 0.012), Math.max(-90, lat - 0.008), Math.min(180, lng + 0.012), Math.min(90, lat + 0.008)].join(","),
    layer: "mapnik",
    marker: `${lat},${lng}`,
  });
  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return <section className="rail-card delivery-location" aria-label={heading}>
    <div className="rail-heading"><span>{heading.toUpperCase()}</span><span aria-hidden="true">⌖</span></div>
    <div aria-live="polite" aria-atomic="true">
      <p className="delivery-location-address">{address}</p>
      <p className="delivery-coordinates"><span>GPS · Latitude, longitude</span><strong>{coordinates}</strong></p>
    </div>
    <div className="map-shell">
      <iframe
        key={`${lat},${lng}`}
        className="delivery-location-map"
        title={`${heading} map: ${address} (${coordinates})`}
        src={`https://www.openstreetmap.org/export/embed.html?${params}`}
      />
      <div className="map-caption">⌖ {coordinates}</div>
    </div>
    <a className="delivery-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer">Open larger map <span aria-hidden="true">↗</span></a>
    <p className="rail-footnote">{note}</p>
  </section>;
}
