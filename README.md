# TripCraft — Full-Stack AI Travel Planner

**Your days. Your discoveries.** React, Express, MongoDB, JWT authentication, a free public-data planner and optional Gemini.

[Open TripCraft](https://tripcraft-by-ayarish.onrender.com/) · [Service status](https://tripcraft-by-ayarish.onrender.com/status)

Source repository: [ayarish-yadav/tripcraft-ai](https://github.com/ayarish-yadav/tripcraft-ai), branch `main`.

Accounts and saved trips use MongoDB and JWT. Trip planning and Smart Replan work for free without a Gemini key or AI credits. Optional Gemini is disabled by default, even if a key is present. See the [service status](https://tripcraft-by-ayarish.onrender.com/status) for current availability and [deployment notes](DEPLOYMENT-STATUS.md) for the source connection.

Read **[BACKEND.md](BACKEND.md)** first for local setup, live credentials, the free planning pipeline, endpoints and Render deployment on its assigned address.

```sh
npm ci
npm run build
npm start
```

Supply MONGO_URI and JWT_SECRET to enable accounts and planning; Gemini is optional. Without them, the website starts with an explicit activation notice and `/status` page. The default build is now live: no silent demo fallback. Use `npm run dev` and `npm run server` in separate terminals for development after configuring `server/.env`.

## Features

Free city research from Wikivoyage and OpenStreetMap; signature landmarks and alternative attractions; distinct daily itineraries; descriptions and map links; estimated visit durations and transfers; duplicate and schedule validation; optional Gemini scheduling with a free fallback; city explorer; PDF export; saved trips; signup/login; weather; stay and transport searches. Hotels and transport are external searches, not live booking inventories.

Existing saved trips do not change automatically: create a new trip to get the improved planner. The optional offline preview supports only three days in Jaipur, Bali or Dolomites and never cycles through its place list. The live free planner covers cities with enough public-guide data; it never substitutes these samples for other destinations.

## Code map

- `client/src/pages/PlanTrip.jsx`: planning form
- `client/src/pages/TripDetails.jsx`: itinerary, city explorer, maps, export and assistant
- `client/src/components/CityExplorer.jsx`: attraction cards, descriptions, sources
- `server/services/cityResearch.js`: free public-guide research and bounded cache
- `server/services/freePlanner.js`: free scheduling and supported Smart Replan changes
- `server/services/aiService.js`: optional AI scheduling, bounded repair and free fallback
- `server/services/itineraryQuality.js`: duplicate, time and budget validation
- `server/routes/`: account, planning and saved-trip endpoints
- `server/models/`: MongoDB user and trip schemas
- `server/app.js`: independent web/API server
- `render.yaml`: live deployment recipe (Render-assigned address)

`npm --prefix server test` and `npm run test:render` run focused tests. Tests with AI fixtures are not a claim of successful live Gemini or MongoDB integration. See [ORIGINALITY.md](ORIGINALITY.md) for authorship notes; no plagiarism score is certified.

## Photography credits

- Dolomites: https://www.rexby.com/upscaleadventurers/ttd/stunning-alpine-lake-in-italy
- Bali: https://www.ideeperviaggiare.it/viaggi/offerte/estate-indonesia-bali-la-meravigliosa-nusa-dua-da-milano?c=9&t=6042
- Jaipur: https://www.thrillophilia.com/jaipur-in-december

Prototype reference photographs: verify reuse permission or replace with licensed photography before public publication. The TripCraft logo is an AI-assisted adaptation of the user's supplied van-and-palms reference. Third-party libraries retain their own licenses.
