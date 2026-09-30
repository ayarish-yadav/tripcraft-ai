# TripCraft deployment status

Source: https://github.com/ayarish-yadav/tripcraft-ai, branch `main`.

Independent website: https://tripcraft-by-ayarish.onrender.com/

Service status: https://tripcraft-by-ayarish.onrender.com/status

Render dashboard: https://dashboard.render.com/web/srv-dagtglht0dsc73fo8svg

## Free planner update — 30 September 2026

Render is connected to this repository with automatic deployment on commits to `main`. The service is a free Node web service in Singapore. Existing MongoDB and JWT configuration is preserved.

The default planner uses Wikivoyage / OpenStreetMap data and local scheduling. No Gemini calls or Google Search grounding calls are made in default mode. Gemini is optional, disabled unless `GEMINI_ENABLED=true`; a Gemini key is no longer required for readiness, itineraries or supported Smart Replan requests.

Local verification passed 19 backend tests and eight page-render checks. Public-data checks generated distinct three-day itineraries for Jaipur, Tokyo, Paris and Bali. A Jaipur rain replan selected indoor museums and preserved the other days. Deployed availability is shown by the service status endpoint; free public data sources can still experience outages or limited coverage.

Build command: `npm ci --include=dev && npm run build && npm --prefix server test && npm run test:render`

Start command: `npm start`

Liveness endpoint: `/api/health`. Readiness endpoint: `/api/ready`.

Required private values: `MONGO_URI` and a strong `JWT_SECRET`. Never add credentials to GitHub. Existing values and account data should be retained when redeploying.

No custom domain, billing activation or paid resource has been requested. The owner does not own `tripcraftbyayarish.com`; the assigned Render address remains in use. Free hosting can sleep while idle and has usage limits.

See [BACKEND.md](BACKEND.md) for the planning pipeline, source licenses, free mode and optional AI configuration.
