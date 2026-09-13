// Air Fare Index — Aviationstack API Configuration
// The API key is NEVER exposed here. It lives in .env (server-side only)
// and is injected by the Vite dev proxy / production server proxy.
//
// All frontend requests hit the proxied path: /api/aviationstack
// The proxy rewrites this to: https://api.aviationstack.com/v1

/** Proxied base URL for all Aviationstack requests from the frontend. */
export const AVIATIONSTACK_PROXY_BASE = '/api/aviationstack';
