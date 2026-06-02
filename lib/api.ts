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
