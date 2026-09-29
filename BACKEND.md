# TripCraft full-stack backend

The included Express backend serves both React and `/api` on the same domain. MongoDB stores users and trips; JWT protects planning and trip endpoints; Gemini provides destination research and scheduling. The Render recipe is configured for **live mode**, not an offline demo.

## Required private configuration

Copy `server/.env.example` to `server/.env` locally, or set the values in Render's Environment settings:

- `MONGO_URI`: your MongoDB connection URI. Authorize the Render service's outbound IPs in Atlas.
- `GEMINI_API_KEY`: your own Gemini API key with Google Search grounding enabled/available for its model and project.
- `JWT_SECRET`: random secret (Render's Blueprint generates one).
- `GEMINI_MODEL`: a supported model enabled for your key; existing default is `gemini-2.5-flash`.
- `DEMO_MODE=false`; `NODE_ENV=production` for hosting.

Never paste private keys or database passwords into chat or commit `.env` files.

At build time use `VITE_API_URL=/api`, `VITE_DEMO_MODE=false`. The client defaults to live `/api` even without a client env file. For local development Vite proxies `/api` to port 5000.

## Local run in VS Code

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:5000`, create an account, then plan a trip. The website starts even when credentials are missing. `/api/health` reports connection state, `/api/ready` returns HTTP 503 until database, authentication and AI configuration are ready, and dependent endpoints return a clear 503 instead of accepting requests. The site never silently switches to demo mode. `/status` shows availability to visitors. MongoDB initial connection failures retry every 30 seconds.

For a deliberately offline sample only:

```sh
VITE_DEMO_MODE=true npm run build
DEMO_MODE=true npm start
```

Rebuild without `VITE_DEMO_MODE=true` before live deployment.

## AI pipeline

1. Authenticated request validates city, dates, days, party size, interests, budget and pace.
2. Gemini with Google Search researches a destination catalog: actual landmark names, aliases, areas, highlights, alternatives, visit suggestions and source links. No-source research fails clearly.
3. A separate schema-constrained scheduling request picks distinct place IDs and groups visits by area. It includes duration, transfer allowance, descriptive activities and map searches. Sources and Google search attribution accompany the result.
4. Server checks prevent repeating the same catalog place, reject unknown IDs, require distinct day titles, validate visit times and transfer gaps, and limit activity/food/local transport allocations to leave space for stays.
5. One repair attempt includes validation errors; persistent invalid output fails rather than returning a repeated plan.
6. City-only research caches for six hours (maximum 50 entries per process). User itineraries and requests are not cached between accounts.
7. A Day N replan restores untouched days before validation. The database saves only when the user chooses Save.

These checks reduce repetition; they do not establish that every attraction is open, every geographical route is optimal, or every AI statement is true. Show sources and confirm details before booking.

## Endpoints

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Website liveness, configuration and feature availability |
| GET | `/api/ready` | Public | HTTP 200 when configured/connected; 503 while setup is incomplete |
| POST | `/api/auth/signup` | Public, limited | Create user with hashed password |
| POST | `/api/auth/login` | Public, limited | Issue signed token |
| POST | `/api/ai/plan` | JWT, limited | Research city and generate itinerary |
| POST | `/api/ai/replan` | JWT, limited | Revise and validate trip |
| GET | `/api/trips` | JWT | List current user's trips |
| POST | `/api/trips` | JWT | Save/update current user's trip |
| DELETE | `/api/trips/:id` | JWT | Delete only current user's trip |
| GET | `/api/weather?destination=...` | Public | Open-Meteo forecast |

Send `Authorization: Bearer <token>` on protected endpoints. AI requests may take several minutes because research and validation are sequential. Provider quotas and charges depend on your Google project.

## Render and tripcraftbyayarish.com

Connect Render to `ayarish-yadav/tripcraft-ai`, branch `main`. For the existing TripCraft service, update its source connection and keep the existing environment variables. For a new service, create a Render Blueprint from `render.yaml`, provide the required private values, and verify the service deploy. The initial deployment uses the address assigned by Render. The user confirmed they do not own `tripcraftbyayarish.com`, so no custom domain is requested in the deployment configuration. A domain can be added after registration and ownership verification. No domain has been purchased and no DNS records have been changed.

## Verification

- Unit tests use deterministic AI fixtures to exercise the validation and repair flow, distinct stop logic, alias normalization, research metadata requirements and cache, targeted replanning, JWT rejection and input validation.
- HTTP tests check same-origin frontend/API behavior, route refreshes, missing assets, setup-required responses, feature gating, and readiness transitions.
- Rendering checks exercise eight React pages.
- **The original Render deployment passed its test suite. Current Gemini access and MongoDB persistence must be verified on the deployed service after its private connections are configured.** See [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md).

References: [Google Search grounding](https://ai.google.dev/gemini-api/docs/generate-content/google-search), [structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Render custom domains](https://render.com/docs/custom-domains).
