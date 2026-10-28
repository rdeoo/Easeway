# Easeway

Easeway is a mobile-first web app that creates personalized commute schedules.

This directory contains the **FastAPI backend**.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn

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
├── .env.example         # Example dotenv file (make a local copy .env.local with actual keys)
└── README.md            # This file
```

## Getting Started

1. Clone the repository

```bash
git clone <repo-url>
cd easeway-backend
```

2. Create and activate virtual enironment

```bash
python -m venv .venv
source venv/bin/activate # Windows: source venv/Scripts/activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Run the server (locally)

```bash
uvicorn app.main:app --reload
```

5. Test docs

```
Go to http://127.0.0.1:8000/docs
```

6. Unit tests (Routes wrapper tests does not require a live API key or database):

```bash
python -m unittest discover -s tests -v
```