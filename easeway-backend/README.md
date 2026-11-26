# Easeway

Easeway is a mobile-first web app that creates personalized commute schedules.

This directory contains the **FastAPI backend**.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy
- **Database:** Supabase Postgres (accessed with SQLAlchemy); Supabase Auth for bearer tokens

## Project Structure

```
.
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── core/            # Config and settings
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── routers/         # API routes
│   └── services/        # Business logic (e.g. Google Maps wrapper)
├── tests/               # Unit tests
│   ├── test_commutes.py # Commute creation + travel estimate
│   ├── test_maps.py     # Routes logic testing
│   └── test_places.py   # Places logic testing
├── requirements.txt     # Pip requirements
├── .env.example         # Example dotenv file (make a local copy named .env with actual info)
└── README.md            # This file
```

## Getting Started

1. Clone the repository

```bash
git clone <repo-url>
cd easeway-backend
```

2. Create and activate a virtual environment (Python 3.10+)

```bash
python3 -m venv .venv
source .venv/bin/activate # Windows PowerShell: .venv\Scripts\Activate.ps1
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Configure the local environment

```bash
cp .env.example .env
```

If you already have `.env`, edit it instead of overwriting it.

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are the Supabase **API** settings,
used to verify users' bearer tokens. `SUPABASE_DB_URL` is the separate Supabase
**Postgres connection string** the backend uses to store commutes. Copy it from
Supabase Dashboard -> Connect -> Session pooler, change the scheme to
`postgresql+psycopg2://`, replace
`YOUR_SUPABASE_DB_PASSWORD` with the database password (URL-encode special
characters), and keep `?sslmode=require`. The session pooler on port 5432
supports IPv4, including WSL NAT networking. Its username includes the project
reference (`postgres.<project-ref>`); this differs from the direct connection's
`postgres` username.

To use the Maps service, set a real `GOOGLE_MAPS_API_KEY` with the Google
Routes API enabled. The location search endpoints also require **Places API
(New)** enabled for that key's Google Cloud project, with billing configured.
Keep the key server-side and restrict it to the required APIs. Never commit `.env`.

5. Database schema

The `commutes` table lives in Supabase and is managed from the Supabase
dashboard (SQL Editor / Table Editor); the backend does not create or migrate
tables. Its columns must match `app/models/commute.py`, including the nullable
`estimated_duration_seconds` integer column.

6. Run the server (from this directory so `.env` is found)

```bash
uvicorn app.main:app --reload
```

7. Test the API

Open http://127.0.0.1:8000/docs, or check:

```bash
curl http://127.0.0.1:8000/health
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/commutes
```

Get `$TOKEN` with `get_token.py` (see below). The commute request returns the
user's saved commutes (`[]` for a new user). Unlike `/health`, it verifies the
Supabase database connection and table setup.

`POST /commutes` requests a single driving/travel estimate from the Google Routes
API with `TRAFFIC_UNAWARE` routing after the request is validated, and saves it as
`estimated_duration_seconds`. If no estimate can be obtained, the commute is not
saved and the endpoint returns HTTP 502. Updating a commute's origin,
destination or travel mode refreshes the estimate the same way.

8. Unit tests (Routes wrapper tests do not require a live API key or database):

```bash
python -m unittest discover -s tests -v
```

### Location autocomplete and verification

The backend exposes two Google Places endpoints:

- `GET /places/autocomplete?query=BCIT&session_token=<uuid>` returns a list of
  `{ "place_id": "...", "description": "..." }` suggestions. Queries must contain
  at least two non-whitespace characters and be at most 200 characters long.
- `GET /places/details?place_id=<id>&session_token=<uuid>` resolves a selected
  suggestion to `{ "place_id": "...", "address": "...", "location":
  { "latitude": 0.0, "longitude": 0.0 } }`. A location is only returned if Google
  supplies an address and valid coordinates for the requested place ID.

Generate a UUID for each search session, reuse it for that session's autocomplete
requests and selected place's details request, then start a new session. Debounce
autocomplete requests in the client and display Google Maps attribution
alongside suggestions, per Google's Places API policies.

Invalid request parameters return HTTP 422. Unresolvable locations, upstream
failures, configuration errors, and malformed Google responses return HTTP 502
with a descriptive `detail`; they never return a verified-looking fallback.
Tests mock Google and require neither a live API key nor a database.

The frontend debounces location searches, verifies the selected places and
disables Save until both selections are valid. Editing either input invalidates
that selection. `POST /commutes` accepts their canonical addresses; it validates
the payload and computes one route estimate, rather than performing a second
Places details request. There is no separate frontend `/maps/estimate` call
during creation.
Commute endpoints and `/maps/estimate` require Supabase authentication.
Before exposing the billable Places proxy publicly, add authentication and
request rate limits to the Places endpoints.

### Commute screen: live traffic

`POST /maps/estimate` with `"traffic_aware": true` returns Google's
traffic-aware driving duration. The frontend commute screen only calls it
automatically from `min(2 × estimated_duration_seconds, 1 hour)` before the
recommended departure until departure, refreshing every 5 minutes. A temporary
developer button on the commute screen can call it at any time.

### Setup Test User For Backend Testing

Do this once

1. Copy `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env.example` into your `.env`
2. Create a test user on Supabase: Dashboard -> Authentication -> Users -> Add user -> Create new user (Auto Confirm User ticked)

From easeway-backend:

```bash
python get_token.py signup me@example.com a-test-password   # first time only
python get_token.py me@example.com a-test-password          # every time after
```

In /docs, click Authorize and paste the token. The tokens expire so just rerun the script.
