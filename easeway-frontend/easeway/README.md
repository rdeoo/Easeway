# Easeway frontend

A mobile-first, driving-only Expo SDK 57 / React Native commute planner for the sprint 1 demo.
No FastAPI or Supabase connection is required. The browser supports live Google
Maps routes; the browser and native app also support a clearly labeled sample
commute without a key.

## Figma-inspired mobile interface

Home follows the supplied Figma Make design: dark navy surfaces, mint departure
time and route card, route-preview metrics, and persistent bottom navigation.
The app uses native React Native views and Expo Symbols, not the export's
browser-only DOM, Tailwind, Vite, or simulated phone bezel/status bar. The browser
preview is centered in a mobile-width column (up to 460 px).

- **Home** shows a calculated sample commute immediately in no-key mode. Live
  mode starts with a prompt to plan a commute rather than showing invented data.
- **Commutes** opens the working arrival-time, location, and buffer
  planner. Successful calculation returns to Home with the updated recommendation.
- **View route** opens the map, dates, travel/buffer breakdown, and Google Maps
  directions link.
- **Alerts** and **Profile** are disabled and marked "Soon". Login, recurring
  schedules, account storage, weather, and traffic monitoring are not implemented.

The greeting/date and departure countdown use the device's clock; the design's
hardcoded "Alex", weather, "On track", and traffic delays are intentionally not
presented as real information. The default starting point is **Waterfront
Station, 601 W Cordova St, Vancouver, BC, Canada**, and the default destination
is **BCIT Burnaby, 3700 Willingdon Ave, Burnaby, BC, Canada**. All routes are
driving routes; walking and cycling are not supported. No-key mode retains the
illustrative 28-minute duration and 9.6 km distance for demonstrating the timing
calculation, not as measured estimates for this journey. Google Maps mode
requests actual driving estimates. Google base estimates remain traffic-unaware.
Home, Commutes, and Route share one in-memory plan. Editing any planner field
clears it across all screens, including while a Google request is in flight.
Reloading resets the demo/default form; no backend or local persistence is used.

## Installation, setup, and running the local demo

### 1. Install the frontend dependencies

Prerequisites: Git, **Node 24.22.0 LTS** (pinned in `.nvmrc`), and its bundled npm.
No Python environment, backend server, Supabase account, or native build tools
are needed for the browser demo. If you have not downloaded the repository:

```sh
git clone https://github.com/rdeoo/Easeway.git
cd Easeway
```

From the repository root, enter the actual Expo app directory, not the parent
`easeway-frontend` placeholder package:

```sh
cd easeway-frontend/easeway
nvm install
nvm use
npm ci
```

These commands assume nvm is already installed. If you do not use nvm, install
the pinned Node version using your usual version manager or the official Node
installer, skip the two nvm commands, and run `npm ci`.

On WSL, install Linux Node inside WSL rather than using Windows npm. On the
original development machine only, a checksum-verified runtime is available at
`~/.local/share/easeway-node/node-v24.22.0-linux-x64`. To use that existing runtime
in a new WSL shell before installing or running the app:

```sh
export PATH="$HOME/.local/share/easeway-node/node-v24.22.0-linux-x64/bin:$PATH"
node --version
npm --version
```

### 2. Choose sample mode or configure Google Maps

- **Sample mode:** leave `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` unset or empty. No
  Google account or network calls to Google are needed. If you previously set
  the key, clear it from your local environment file or shell, then restart Expo
  and reload the browser.
- **Google Maps mode:** follow [Live Google Maps in the browser](#live-google-maps-in-the-browser)
  below to enable billing, the required APIs, and a restricted browser key.
  Keep the key in the app's ignored `.env.local` file, not in source code.

### 3. Start the browser preview

From `easeway-frontend/easeway`:

```sh
npm run web -- --host localhost
```

Open the URL printed by Expo, normally `http://localhost:8081`. In a remote VS
Code/WSL workspace, forward port 8081 in the **Ports** panel and open its local
browser URL. Allow that exact URL in your Google key's website restrictions.

Alternatively, from the repository root in VS Code use **Terminal > Run Task >
Easeway: local web preview**. The task uses the original machine's Linux runtime
if present, otherwise the Node/npm on your PATH. Use either the task or the
terminal command, not both at once.

Keep the terminal running. Press **Ctrl+C** there to stop the preview; for the
VS Code task, use **Terminal > Terminate Task**. Editing frontend components
updates the app with Fast Refresh. After changing an environment variable, stop
and restart Expo, then fully reload the browser.

### 4. Walk through the sprint demo

1. Open **Home**. Sample mode shows a **DEMO** badge and a calculated sample
   commute; Google Maps mode shows **LIVE MAPS** and initially asks you to plan.
2. Open **Commutes**. In Google Maps mode, enter full starting-point and
   destination addresses. Sample mode keeps its fixed addresses read-only.
3. Enter a future local arrival date, an arrival time
   in 24-hour format, and an arrival buffer.
4. Press **Find my departure time**. Home displays the departure time, countdown,
   travel duration, buffer, and route distance.
5. Select **View route** to inspect the map and the departure, destination
   arrival, and commitment-time timeline.
6. Return to **Commutes**, change the buffer, and calculate again to demonstrate
   how extra arrival time moves the recommended departure earlier.

For a repeatable no-key example and exact expected times, see
[No-key demo](#no-key-demo). Plans are not saved across browser reloads.

### Optional: preview on a phone or emulator

For a device, run `npm start` and scan the QR code using an SDK 57-compatible Expo
Go installation. The phone and development machine need network connectivity;
WSL may require additional LAN/port forwarding. Android emulators can use
`npm run android`; iOS simulators require macOS (`npm run ios`).
Native currently uses sample estimates and can open directions in Google Maps;
the embedded live map and address routing are **browser-only**.

### Local troubleshooting

- **`node` not found or Windows npm used in WSL:** select the Linux Node runtime
  above or install Node inside WSL, then rerun `npm ci` in the app directory.
- **Port 8081 is busy:** stop the other preview, or run
  `npm run web -- --host localhost --port 8082`. Add the new host/port to the
  Google key's website restrictions before testing Maps.
- **Still showing DEMO after setting a key:** check that `.env.local` is beside
  the Expo app's `package.json`, uses the exact variable name below, and that
  Expo was restarted and the browser fully reloaded.
- **Google authorization or route errors:** confirm billing, both APIs, API-key
  restrictions, the browser's actual host/port, and network access. Errors are
  shown in the app; live failures do not fall back to invented sample estimates.
- **Stale preview after a restart:** stop Expo and run
  `npm run web -- --host localhost --clear`, then reload.

## No-key demo

No environment file is needed. The sample runs from Waterfront Station in
downtown Vancouver to BCIT Burnaby. Locations are intentionally
read-only so sample durations are never misrepresented as estimates for an
arbitrary address. The fixed 28-minute travel duration and 9.6 km distance are
illustrative placeholders, not measured driving estimates for this route.
The route illustration is not a real map or the actual road geometry.

1. Open **Commutes**, then enter an arrival date in the future and `09:00` (24-hour time).
2. Choose a 10-minute buffer and press **Find my departure time**.
3. Home shows **8:22 AM** departure for the 28-minute sample commute. **View
   route** shows **8:50 AM**
   destination arrival, leaving 10 minutes before the 9 AM commitment.
4. Try a 15-minute buffer: departure moves to **8:17 AM**.
5. Try an arrival just after midnight to see previous-day
   departure dates.

Dates and times use the **device's local timezone**, not the destination's.
Use the planner for local commutes. Past arrival times and invalid dates are
rejected. A departure that has already passed is shown with a warning.
Editing any input clears the previous recommendation to avoid stale results.
Custom buffers accept whole minutes from 0 through 180.

## Live Google Maps in the browser

1. Create a Google Cloud project with billing enabled.
2. Enable **Maps JavaScript API** (interactive map) and **Routes API** (route,
   duration, and distance calculations). Places, Geocoding, legacy Directions,
   and Distance Matrix APIs are not needed for the current demo.
3. Create a browser API key. Restrict its application to **Websites (HTTP
   referrers)**. Allow `http://localhost:8081/*` and `http://127.0.0.1:8081/*`
   if you use both, plus any exact forwarded preview hosts/ports you need.
   Do not allow all websites. Restrict its APIs to Maps JavaScript API and Routes
   API. Use separate keys for future deployed, native, and backend applications.
4. In `easeway-frontend/easeway`, create the local environment file if it does not
   already exist:

   ```sh
   cp .env.example .env.local
   ```

   Do not overwrite an existing `.env.local`; edit it instead. On Linux, WSL,
   or macOS, limit local file access:

   ```sh
   chmod 600 .env.local
   ```

   Open `.env.local` in your editor and set:

   ```dotenv
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
   ```

   Confirm Git ignores the file without printing its contents:

   ```sh
   git check-ignore .env.local
   ```

5. Restart Expo and fully reload the browser. Home shows a **LIVE MAPS** badge
   and the location fields in **Commutes** become editable.
6. Enter full addresses, set the arrival time and buffer, and calculate. The map
   displays Google's route polyline with Google's attribution intact.

`EXPO_PUBLIC_` values are bundled into the client and are **not secrets**. The
local file keeps the key out of Git but cannot hide it from browser users;
website/API restrictions protect its use. Never use a server key or service
account credential here. Do not commit actual keys or paste them into chat.
Use quotas and billing alerts; budget alerts do not automatically cap spending.
Google may charge for map loads and
route calculations. Only submitted locations are sent to Google; there is no
Easeway backend call or account persistence.

The integration uses the current Maps JavaScript **Routes Library**
`Route.computeRoutes`, not the legacy DirectionsService. Driving requests use
`TRAFFIC_UNAWARE`; duration is a base estimate, **not live/predicted traffic**.
Google's driving-route warnings are displayed as returned.
Enabling these APIs or adding a key does **not** enable traffic monitoring in
the current app. Traffic-aware requests, traffic-colored routes, periodic
refreshes, and background alerts require additional implementation. Traffic
features can use these same two APIs, but refresh requests can incur charges.
No traffic-based arrive-by guarantee is implied. Travel time is rounded up to
the next minute, then departure is calculated locally:

```text
departure = required arrival - arrival buffer - estimated travel duration
```

Google authorization, load, network, and no-route errors are visible; a failed
Google request is never silently replaced by a demo estimate. The Google Maps
directions link opens a fresh driving route with the selected addresses; it does
not transfer the commitment time or custom buffer.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build:web
```

Tests use Node's built-in TypeScript support and test runner, with no backend
or Google key. They cover departure arithmetic, buffers, midnight/year rollover,
rounding, date validation, default Vancouver/Burnaby addresses, driving-only Maps
links, and the dashboard's
countdown/date display. Live Google
billing/key authorization must be checked using your own restricted key.

The inherited Expo dependency tree currently reports npm audit advisories.
Do not run `npm audit fix --force` blindly: it can break SDK compatibility.
Review upstream Expo-compatible updates separately before production release.

Full-project lint currently reports one pre-existing `set-state-in-effect`
violation in `src/hooks/use-color-scheme.web.ts`, a retained starter hook not
used by the planner.
The planner and its new components, services, and tests pass lint. This starter
issue is left unchanged rather than suppressing the rule or expanding MVP scope.
