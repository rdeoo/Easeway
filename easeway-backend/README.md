# Easeway

Easeway is a mobile-first web app that creates personalized commute schedules.

This directory contains the **FastAPI backend**.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy
- **Database:** PostgreSQL 17 (Docker Compose for local development)

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
│   └── test_maps.py     # Routes logic testing
├── requirements.txt     # Pip requirements
├── compose.yaml         # Local PostgreSQL service and persistent volume
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
python -m venv .venv
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

If you already have `.env`, edit it instead of overwriting it. Replace
`YOUR_LOCAL_POSTGRES_PASSWORD` in both settings with the same URL-safe local
password (letters, numbers, and hyphens work without URL encoding).
`DATABASE_URL` connects the Python backend on your host to PostgreSQL on port 5432.
The app also reads `.env`; extra Compose-only settings are ignored.

The Google Maps placeholder is sufficient to start the backend and use commute
storage. To use the Maps service, set a real `GOOGLE_MAPS_API_KEY` with the Google
Routes API enabled. Never commit `.env`.

5. Start PostgreSQL and create the tables

Install Docker with the Compose plugin and ensure Docker is running, then:

```bash
docker compose up -d --wait db
python -m app.core.init_db
```

The database is `easeway`, with user `easeway`. It is only exposed on
`127.0.0.1:5432`. Data persists in a Docker volume across container restarts.
The initialization command is safe to rerun: it creates missing tables without
deleting existing data. It does not migrate changed schemas; use migrations
before evolving an existing database or deploying to production.

6. Run the server (from this directory so `.env` is found)

```bash
uvicorn app.main:app --reload
```

7. Test the API

Open http://127.0.0.1:8000/docs, or check:

```bash
curl http://127.0.0.1:8000/health
curl 'http://127.0.0.1:8000/commutes?user_id=00000000-0000-0000-0000-000000000001'
```

The commute request should return `[]` for a new database. Unlike `/health`,
it verifies the database connection and table setup. Use `POST /commutes` in
the docs to save a commute, then list it with the same `user_id`. User IDs are
currently supplied by the caller; authentication is not yet implemented.

8. Unit tests (Routes wrapper tests do not require a live API key or database):

```bash
python -m unittest discover -s tests -v
```

### Managing the local database

Run these commands from this directory:

```bash
docker compose logs db
docker compose exec db psql -U easeway -d easeway
docker compose stop db
docker compose up -d --wait db
```

If port 5432 is already in use, change the host port in `compose.yaml` and the
port in `DATABASE_URL` to match. PostgreSQL uses `POSTGRES_PASSWORD` only when
initializing an empty volume; editing it later does not change an existing
database user's password.

To remove the containers while keeping data, use
`docker compose down`. Adding `--volumes` permanently deletes
the local database, so only do that when you intend to reset all local data.