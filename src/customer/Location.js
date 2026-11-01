// Location helper for the customer address form.
// - Uses the browser's GPS (needs https or localhost, and the user's permission).
// - Turns coordinates into an address with Google Geocoding if VITE_GOOGLE_MAPS_KEY
//   is set in .env, otherwise with free OpenStreetMap (Nominatim), so it works with no key.
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(Error("This browser does not support location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          Error(
            e.code === 1
              ? "Location permission was blocked. Allow it in the browser address bar and try again."
              : e.code === 3
                ? "Finding your location took too long. Try again."
                : "Could not get your location.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

async function viaGoogle(lat, lng) {
  const r = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`,
  );
  const j = await r.json();
  if (j.status !== "OK" || !j.results?.length)
    throw Error(j.error_message || "Google could not find an address here.");
  const get = (...types) =>
    j.results[0].address_components.find((c) =>
      types.some((t) => c.types.includes(t)),
    )?.long_name || "";
  return {
    house: get("street_number", "premise"),
    street: [get("route"), get("sublocality_level_1", "sublocality", "neighborhood")]
      .filter(Boolean)
      .join(", "),
    city: get("locality", "administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    pin: get("postal_code"),
  };
}

async function viaOpenStreetMap(lat, lng) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
  );
  if (!r.ok) throw Error("Could not look up the address. Try again.");
  const a = (await r.json()).address || {};
  return {
    house: a.house_number || a.building || "",
    street: [a.road, a.suburb || a.neighbourhood].filter(Boolean).join(", "),
    city: a.city || a.town || a.village || a.state_district || "",
    state: a.state || "",
    pin: (a.postcode || "").replace(/\s/g, ""),
  };
}

export async function detectAddress() {
  const { lat, lng } = await getPosition();
  const found = KEY ? await viaGoogle(lat, lng) : await viaOpenStreetMap(lat, lng);
  return { ...found, lat: String(lat), lng: String(lng) };
}

// Small map preview. Works without an API key.
export const mapEmbedUrl = (lat, lng) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;