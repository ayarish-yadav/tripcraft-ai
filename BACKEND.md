# TripCraft full-stack backend

Express serves React and `/api` on one domain. MongoDB persists real accounts and saved trips; JWT protects account data. The production planner works without a Gemini key or paid Google Search grounding.

## Free mode

The default is `GEMINI_ENABLED=false`. No Gemini request is sent, even if `GEMINI_API_KEY` is already present. Existing keys remain private and can be kept for optional future use. No billing activation or purchased domain is needed for the assigned Render address.

1. Open-Meteo / GeoNames resolves the requested city and country. Country/state qualifiers are checked. Bali and Dolomites also have explicit region coordinates.
2. Wikivoyage supplies named, geolocated sightseeing listings. Larger cities use their linked district guides. Places outside the destination radius, closed listings, accommodation and transport listings are excluded.
3. OpenStreetMap provides a secondary source when the guide has insufficient coverage. Public data sources can be unavailable or incomplete; the app never invents attractions or cycles through a sample list to fill a trip.
4. The free scheduler prioritizes guide highlights and selected interests, groups nearby attractions, adds meal breaks and transfer allowances, and assigns each place once. Amounts are budget allowances, not verified admission prices.
5. Quality checks reject duplicate places, invalid timing, unknown place IDs and excessive budget allocations. Insufficient coverage asks the user to shorten the trip or choose a nearby city.
6. Catalogs cache for six hours, up to 50 destinations per process. User itineraries are not shared between accounts. Stable place IDs allow targeted edits without changing the other days.
7. Free Smart Replan supports cheaper food/local travel allowances, indoor alternatives for rain, and a dinner change. It does not claim to understand arbitrary requests or perform bookings. Rain changes are based on the request, not assumed live weather.

Free plans are labelled `source: "free"`; they are generated from live public destination data, not offline demo templates. Source attribution and license links appear in the city explorer and PDF. Wikivoyage descriptions are adapted under CC BY-SA 4.0; OSM data is attributed under ODbL. Scheduling code and budget calculations are separate from the guide text.

## Required private configuration

Copy `server/.env.example` to `server/.env` locally, or set values privately in Render's Environment settings:

- `MONGO_URI`: MongoDB connection URI. Use an Atlas free cluster for a no-cost college project and allow the Render service's outbound IPs.
- `JWT_SECRET`: random secret of at least 32 characters.
- `DEMO_MODE=false`, `NODE_ENV=production` for hosting.
- `TRUST_PROXY_HOPS=1` on Render; `0` locally.

Never commit `.env` files or share database passwords and API keys in chat. The server starts while the database connects. `/api/health` reports configuration; `/api/ready` is ready once MongoDB and authentication are ready. A Gemini key is optional and does not gate trip planning.

At build time use `VITE_API_URL=/api`, `VITE_DEMO_MODE=false`. Vite proxies `/api` to port 5000 in local development.

## Run in VS Code

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:5000`, create an account, and plan a trip. For development, run `npm run dev` and `npm run server` in separate terminals. MongoDB connection failures retry every 30 seconds.

## Optional Gemini enhancement

Only set `GEMINI_ENABLED=true` if you deliberately want Gemini scheduling. Also provide `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-3.8-flash`). It receives the already researched public catalog; **no Google Search tool is used**. Free generation quota and model access depend on the Google project. An enabled, billing-linked key can incur provider charges, so leave the default disabled for zero AI API usage.

AI output is schema-checked and repaired at most once. Quota/model failures, timeout or invalid output use the free scheduler, clearly labelled. A five-minute cooldown avoids repeatedly calling an unavailable provider. Optional AI status means configured, not guaranteed quota availability.

## API

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Connection state and feature availability |
| GET | `/api/ready` | Public | Ready when database and auth are available |
| POST | `/api/auth/signup` | Public, limited | Create a user with a hashed password |
| POST | `/api/auth/login` | Public, limited | Issue a JWT |
| POST | `/api/ai/plan` | JWT, limited | Free itinerary; optional Gemini if explicitly enabled |
| POST | `/api/ai/replan` | JWT, limited | Replan and validate |
| GET | `/api/trips` | JWT | List current user's trips |
| POST | `/api/trips` | JWT | Save/update current user's trip |
| DELETE | `/api/trips/:id` | JWT | Delete only current user's trip |
| GET | `/api/weather?destination=...` | Public | Open-Meteo forecast |

Existing `/api/ai/*` URLs remain compatible. Protected routes use `Authorization: Bearer <token>`. First-time city research may take several seconds; repeat requests use the catalog cache.

## Hosting

Render uses `ayarish-yadav/tripcraft-ai`, branch `main`, with automatic deployments on push. Build: `npm ci --include=dev && npm run build && npm --prefix server test && npm run test:render`. Start: `npm start`. `render.yaml` selects a free Node service and disables optional Gemini by default.

The independent site is https://tripcraft-by-ayarish.onrender.com/. No custom domain is configured because the owner does not own `tripcraftbyayarish.com`. Free Render hosting can sleep when idle and has usage limits; public data providers also have service limits. No paid resources, purchases, billing activation or uptime-pinging service are part of this setup.

## Verification

`npm --prefix server test` covers free planning, budget/time/place invariants, AI quota fallback, no AI calls in default mode, targeted replans, public-data parsing, country matching, source attribution, cache behavior, JWT validation and HTTP readiness. `npm run test:render` renders all eight pages. Fixture tests complement deployment checks; they are not a claim that a third-party provider will always be reachable.

Sources: [MediaWiki API](https://www.mediawiki.org/wiki/API:Revisions), [Wikivoyage listings](https://en.wikivoyage.org/wiki/Wikivoyage:Listings), [OpenStreetMap attribution](https://www.openstreetmap.org/copyright), [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api), [Render free services](https://render.com/docs/free).

### Public-data failover (October 2026)

Destination lookup tries Open-Meteo/GeoNames, then the independent Photon OSM
index. Country/state qualifiers and coordinate bounds are checked on both paths;
Photon settlements take precedence over same-named remote localities. Wikivoyage
remains the guide source. When it has too few places, Overpass and Photon's nearby
OSM attractions are queried independently. Hotels and unrelated map features are
excluded, and the existing geographic/deduplication checks still apply.

Each public request has a 10-second deadline rather than retrying the same failing
host. Successful responses are cached for six hours (maximum 200 entries), with
concurrent identical requests coalesced. No API keys or paid services are required.
Photon's public server is intended for reasonable traffic and may throttle heavy
usage; coverage and uptime of community data are not guaranteed. Sparse results
still ask for fewer days instead of inventing or repeating attractions.

Sources: https://github.com/komoot/photon (API and fair-use guidance),
https://www.openstreetmap.org/copyright (ODbL attribution).
