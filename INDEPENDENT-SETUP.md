# Independent TripCraft setup

The live deployment instructions are now in [BACKEND.md](BACKEND.md).

The latest version defaults to full-stack mode. `render.yaml` uses the address assigned by Render and prompts for MongoDB and Gemini credentials. The user does not own `tripcraftbyayarish.com`; it is not attached. The independent Render service is deployed; see [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) for the URL and remaining activation requirements. The code does not require ChatGPT sign-in.

A separately labeled offline sample remains available only by explicitly setting both frontend `VITE_DEMO_MODE=true` at build time and backend `DEMO_MODE=true`. It is not the live AI product.
