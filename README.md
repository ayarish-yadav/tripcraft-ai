# TripCraft — Full-Stack AI Travel Planner

**Your days. Your discoveries.** React, Express, MongoDB, JWT authentication and Gemini.

[Open TripCraft](https://tripcraft-by-ayarish.onrender.com/) · [Service status](https://tripcraft-by-ayarish.onrender.com/status)

Source repository: [ayarish-yadav/tripcraft-ai](https://github.com/ayarish-yadav/tripcraft-ai), branch `main`.

Accounts, saved trips and live AI planning require MongoDB and Gemini credentials configured privately on the backend. See the [service status](https://tripcraft-by-ayarish.onrender.com/status) for current availability and [deployment notes](DEPLOYMENT-STATUS.md) for the source connection.

Read **[BACKEND.md](BACKEND.md)** first for local setup, live credentials, the two-stage AI pipeline, endpoints and Render deployment on its assigned address.

```sh
npm ci
npm run build
npm start
```

Supply the server environment values to enable accounts and AI. Without them, the website starts with an explicit activation notice and `/status` page. The default build is now live: no silent demo fallback. Use `npm run dev` and `npm run server` in separate terminals for development after configuring `server/.env`.

## Features

City research using Google Search through Gemini; signature landmarks and alternative attractions; distinct daily itineraries; descriptions and map links; estimated visit durations and transfers; duplicate and schedule validation with bounded AI repair; city explorer; PDF export; saved trips; signup/login; weather; stay and transport searches. Hotels and transport are external searches, not live booking inventories.

Existing saved trips do not change automatically: create a new trip to get the improved planner. The optional offline preview supports only three days in Jaipur, Bali or Dolomites and never cycles through its place list. Other cities require the live backend.

## Code map

- `client/src/pages/PlanTrip.jsx`: planning form
- `client/src/pages/TripDetails.jsx`: itinerary, city explorer, maps, export and assistant
- `client/src/components/CityExplorer.jsx`: attraction cards, descriptions, sources
- `server/services/cityResearch.js`: grounded research and bounded cache
- `server/services/aiService.js`: structured scheduling and repair
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
