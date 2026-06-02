This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

This UI deploys to **Vercel**; the API (`reddit-scraper-python`) runs on a separate
VM. The browser streams the SSE report **directly** from the API, so:

1. **Backend (VM):** run the FastAPI app and expose it over **HTTPS** (a Vercel
   page can't call a plain-`http://` endpoint, and you can't get a cert for a bare
   IP). Easiest free route: a Cloudflare Tunnel (`cloudflared`) giving a hostname
   like `https://reddit-api.yourname.me` → `localhost:8000`. Set the backend's
   `ALLOWED_ORIGINS` env to your Vercel origin (e.g. `https://your-app.vercel.app`).

2. **Frontend (Vercel):** set `NEXT_PUBLIC_API_URL` to that HTTPS hostname **before
   building** (it's inlined at build time). See `.env.example`. Vercel auto-detects
   Next.js — no `vercel.json` needed.

For local dev, leave `NEXT_PUBLIC_API_URL` unset (defaults to `http://localhost:8000`).
