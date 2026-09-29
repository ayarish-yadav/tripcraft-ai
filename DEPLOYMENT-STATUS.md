# TripCraft deployment status

## Source repository

The complete project was restored to https://github.com/ayarish-yadav/tripcraft-ai on branch `main` on 30 September 2026 (India).

The repository includes the React frontend, Express backend, MongoDB models, Gemini planning services, images, tests, and Render configuration. Private credentials are excluded; `.env.example` files contain setup placeholders only.

## Existing hosted service

- Website: https://tripcraft-by-ayarish.onrender.com/
- Feature availability: https://tripcraft-by-ayarish.onrender.com/status
- Render dashboard: https://dashboard.render.com/web/srv-dagtglht0dsc73fo8svg
- Original deployment: free Node web service in Singapore.

Uploading this repository does not change the existing Render service's source connection. To deploy from this repository, select `ayarish-yadav/tripcraft-ai` and branch `main` in the service's source settings. Use the existing service to keep its address and environment variables.

Build command: `npm ci --include=dev && npm run build && npm --prefix server test && npm run test:render`

Start command: `npm start`

Health check: `/api/health`

## Private configuration and verification

The backend requires `MONGO_URI`, `GEMINI_API_KEY`, and a strong `JWT_SECRET`. Enter them privately in Render's Environment settings, never in GitHub. An existing `JWT_SECRET` should be preserved.

The original deployment passed 13 backend tests and eight React rendering checks. Those tests use fixtures for AI calls and do not establish that live Gemini access or MongoDB persistence works. Current live integration is not reverified by this repository restoration.

After deploying, check `/status`, create an account, generate a new itinerary, and save and reload it. `/api/health` reports configuration and connection state; `/api/ready` returns HTTP 503 while activation is incomplete.

No custom domain is configured. The user does not own `tripcraftbyayarish.com`.

See [BACKEND.md](BACKEND.md) for setup and [render.yaml](render.yaml) for deployment configuration.
