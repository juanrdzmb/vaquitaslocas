export const PRODUCTION_APP_URL = "https://vaquitaslocas.vercel.app";

export function appBaseUrl(currentOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (currentOrigin && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(currentOrigin)) {
    return currentOrigin.replace(/\/$/, "");
  }
  return PRODUCTION_APP_URL;
}

export function canonicalTripUrl(tripId: string, currentOrigin?: string): string {
  return new URL(`/trip/${encodeURIComponent(tripId)}`, appBaseUrl(currentOrigin)).toString();
}
