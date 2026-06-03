/**
 * Base URL of the Reddit Scraper API (the FastAPI backend).
 *
 * - Local dev: leave NEXT_PUBLIC_API_URL unset → defaults to http://localhost:8000.
 * - Production (Vercel): set NEXT_PUBLIC_API_URL to the backend's public HTTPS
 *   endpoint, e.g. the Cloudflare Tunnel hostname (https://reddit-api.yourname.me).
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so set it in Vercel BEFORE building.
 * The browser streams the SSE report directly from this URL, so it must be HTTPS
 * in production (an https Vercel page cannot call an http endpoint).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Cloudflare Turnstile SITE key (public — safe to ship in the bundle, unlike the
 * SECRET key which lives only on the backend). Set NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * in Vercel BEFORE building (build-time inlined, same as the API URL).
 *
 * If unset (e.g. local dev), the form skips the widget and sends no token — the
 * backend then decides (it bypasses only when TURNSTILE_DISABLED=1, else 503/403).
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
