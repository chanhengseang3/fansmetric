# fansmetric

FansMetric dashboard with **Banking, powered by SUBBAL**. It's a React (Vite + TypeScript) port of
`docs/samples/FansMetric.html`, wired to the [Subbal Middleware](../subbal-middleware) API.

The app opens on a SUBBAL sign-in screen. After signing in, every Banking screen loads live data:
balances, transactions and statements; creators, splits and mandates; transfers (with fee quote,
attachments and employee-card funding); opening accounts; analytics; and the notifications bell.

The Analytics (OnlyFans KPI) page still shows the sample's illustrative figures: that data isn't part of SUBBAL.

## How API calls flow

```
browser ──/api/v1/*──▶ same-origin proxy ──▶ SUBBAL_API_BASE_URL/api/v1/*
                       (api/proxy.ts on Vercel, Vite plugin locally)
```

The browser never calls the middleware directly, for two reasons:

- **CORS.** The middleware only allows `*.mbanq.cloud` / `*.subbal.com` origins, so a `*.vercel.app` page can't call it.
- **Secrets.** The proxy adds `tenantid` to every request, and `client_id` / `client_secret` to `/oauth/token` and
  `/oauth/refresh`. None of these ship in the JS bundle.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `SUBBAL_API_BASE_URL` | server | Middleware URL without `/api/v1`. Dev: `https://subbal-api.dev.mbanq.cloud`; staging: `https://subbal-api.crb-s.mbanq.cloud` |
| `SUBBAL_TENANT_ID` | server | Core tenant id (`tenantid` header). Creator, analytics and report data are keyed by it |
| `SUBBAL_CLIENT_ID` | server | OAuth client id |
| `SUBBAL_CLIENT_SECRET` | server | OAuth client secret |
| `VITE_DEFAULT_USERNAME` | client, optional | Prefills the sign-in form |

## Develop

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:5173 (proxy included)
npm test                     # vitest
npm run build                # type-check + production build
```

## Deploy on Vercel

1. Import the repo. The framework preset is detected as **Vite** (`vercel.json`).
2. Add the four `SUBBAL_*` variables (and optionally `VITE_DEFAULT_USERNAME`) under Project → Settings → Environment Variables.
3. Deploy. `vercel.json` rewrites `/api/v1/*` to the `api/proxy.ts` function.
