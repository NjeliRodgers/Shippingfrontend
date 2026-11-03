# ShippingFrontend

React 19 + Vite + Tailwind 4 client for the Shipping Track System. Talks to **ShippingBackend** (Express + MySQL) over REST. No mock or seeded data: every list is loaded from the API and starts empty.

## Run

```bash
npm install
cp .env.example .env        # defaults work with the backend on :5000
npm run dev                 # http://localhost:5173  (proxies /api to the backend)
```

Production build:

```bash
npm run build               # outputs dist/
npm start                   # vite preview on :5173 (also proxies /api)
```

Start the backend first (see `../ShippingBackend/README.md`). If you host the frontend and backend on different domains, set `VITE_API_URL=https://api.example.com/api` before building and set `FRONTEND_URL` / `CLIENT_ORIGIN` on the backend.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL used by the client |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:5000` | Where dev/preview proxy `/api` |
| `VITE_APP_NAME` | BlueCrest Cargo Lines | Display name |
| `VITE_TRACKING_REFRESH_MS` | `30000` | Map refresh interval in milliseconds (15,000–300,000) |

## Shipment map

The interactive map uses OpenStreetMap tiles, displays shipment origin, destination, and the latest authorized position, and refreshes from the API every 30 seconds by default. Staff can choose **Adjust location**, pan the map beneath the fixed center pin, and save a timestamped manual location event. Owners and recipients with shipment access see the saved pin and recent location history in read-only mode. Exact map coordinates and location history require an authorized account or owner/recipient verification. Physical live GPS movement requires a configured tracking provider; see the backend README.

## First use

1. Create the initial administrator with the backend bootstrap command. Later public registrations are CUSTOMER accounts.
2. Admin → **Ports**: add ports and select the transport modes they support, or run `npm run ports:import` in the backend to load the curated global reference locations.
3. Book freight, or create a shipment from Admin → New shipment.
4. Track publicly at `/` using the tracking number plus the consignee email or phone.

Booking origin and destination lists are filtered by the selected transport mode and grouped by country. Ocean, road, and rail bookings show standard dry or reefer containers. Air bookings show supported air cargo ULD equipment instead. Add or import locations for each mode before offering that mode to customers.

## Structure

```
src/
  api/         fetch client + typed API modules (auth, shipments, admin)
  context/     Auth (JWT session), Connectivity, Theme, Language
  hooks/       useAsync, useShipments, usePorts
  routes/      path map and ProtectedRoute (server-validated roles)
  pages/       route-level screens (Track, Booking, Callback, Map, Portal, Admin…)
  components/  admin, analytics, auth, booking, customer, layout, map, notifications, security, tracker
  types/       shared DTO types matching the backend
  utils/       formatting and shared UI classes
```

## Routes

`/` and `/track/:ref` · `/booking` · `/booking/callback` (Paystack return) · `/map` · `/portal` (signed in) · `/admin`, `/admin/analytics|notifications|security|ports|users` (staff) · `/reset-password`.
