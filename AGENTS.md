# AGENTS.md — Easeway project instructions for AI coding agents

> Place this file at the **Git repository root** as `AGENTS.md` (next to `easeway-frontend/` and `easeway-backend/`). This document reflects the uploaded Sprint 2 code snapshot and planning documents reviewed on 2026-11-12. It does not authorize implementation of any backlog item. Existing `easeway-frontend/AGENTS.md` contains Expo-specific instructions; read both when working in that directory.

## 1. Project purpose and sources of truth

Easeway is a recurring-commute planning application for people with fixed arrival commitments. Its purpose is **when to leave**, not turn-by-turn navigation. A user saves a named origin, destination, arrival time, recurring days, travel mode, and buffer. Google Routes provides ETA data; the app shows an estimated departure recommendation. Longer-term aspirations include personalized trip-history predictions, proactive traffic alerts, and notifications.

Before implementation, inspect in this order:
1. The **current source code and tests** for actual behavior.
2. The task's **current Trello card** for scope, assignee, and acceptance criteria. Treat statuses as project-management data, not proof that code works.
3. The team's Sprint 2 planning / HLD and API contract for intended architecture.
4. Existing frontend `AGENTS.md`, README files, and toolchain manifests.

When these disagree, **report the discrepancy and ask for a design decision**. Do not silently rewrite code to match old plans or present planned capabilities as implemented.

## 2. Developer authority — non-negotiable collaboration style

- **The human developer retains architectural and technical design authority.** You may compare options and recommend one, but never make unrequested architecture, dependency, API contract, schema, security model, or UX decisions.
- For requests to **explain, audit, investigate, review, or design**, work **read-only**. Do not edit files, run write-capable scripts, update Trello, or change configuration.
- For explicit implementation requests, make **only the smallest necessary changes** to satisfy the approved behavior. Do not refactor unrelated code, restyle files, rename symbols, reorder imports, add unrelated validation, or change file structures opportunistically.
- If the request is ambiguous or requires additional files, a new dependency, a schema migration, an API change, or a meaningful UX/security choice, **explain the alternatives and ask before implementing**.
- For substantial changes, first provide: **current behavior → proposed design → files to edit → exact scope → checks → unanswered decisions**. Await approval.
- Do not implement additional "helpful" features. Flag potential improvements separately without making them.
- Preserve teammates' work. Never overwrite or revert unrelated edits. Check `git status` before editing. Do not `git reset`, `git clean`, switch branches, rebase, force-push, commit, or open a PR without explicit permission.
- Never modify Trello cards, assignments, lists, checklists, or statuses unless the developer explicitly authorizes that separate action.
- Do not run deployments, production data changes, destructive commands, migrations, external account changes, or paid/billable bulk API requests without explicit approval.

**Small-task contract:** A request such as "conditionally show an empty email message on the login screen" means changing only the relevant login form component and existing local behavior, unless the developer approves more. Explain any necessary extra change before making it. Showing a proposal or Git diff does not authorize unrequested edits.

## 3. Actual repository map (Sprint 2 ZIP)

```
repository-root/
├── AGENTS.md                  # this file, at repo root
├── easeway-frontend/
│   ├── AGENTS.md              # existing Expo-specific rules; retain it
│   ├── package.json           # Expo SDK 57, React Native, TypeScript
│   ├── src/app/               # Expo Router screens
│   │   ├── login.tsx, register.tsx, index.tsx, _layout.tsx
│   │   └── commutes/index.tsx, add.tsx, [id].tsx
│   ├── src/components/        # shared UI, authentication form, place field
│   ├── src/context/           # AuthContext and CommuteContext
│   ├── src/lib/               # Supabase client and platform storage
│   ├── src/services/          # API client, commutes, maps and places
│   ├── src/utils/commute-time.ts
│   └── tests/commute-time.test.mjs
└── easeway-backend/
    ├── app/main.py
    ├── app/core/             # auth, config, database
    ├── app/models/           # Commute SQLAlchemy model
    ├── app/schemas/          # Pydantic request/response contracts
    ├── app/routers/          # /commutes, /maps, /places
    ├── app/services/         # Google Routes/Places wrappers
    ├── tests/                # unittest/TestClient tests
    └── api_contract_readable.md
```

Use the real file names and existing patterns. Do not invent a new service or folder when a small change to an existing one is adequate.

## 4. Established stack and ownership boundaries

- **Frontend:** Expo / React Native / TypeScript / Expo Router. Keep navigation in `src/app/`, components in `src/components/`, shared state in contexts, and HTTP calls in `src/services/`. Do not make new network calls from presentation components if the existing service can be extended.
- **Backend:** Python / FastAPI / Pydantic / SQLAlchemy / PostgreSQL on Supabase. Routers handle HTTP and validation; services handle business integrations; models and persistence belong in the backend. Follow the current code's actual conventions.
- **Auth:** Supabase Auth runs in the frontend and issues sessions/access tokens. The frontend passes an access token with authenticated FastAPI requests. `get_current_user_id` verifies it with Supabase and the backend derives the user ID. Never trust client-supplied `user_id` for authorization. Do not switch to a backend-issued JWT model without human approval.
- **Routing:** Google Places and Google Routes calls go through FastAPI; keep Google API keys on the backend. Current route endpoint is **`POST /maps/estimate`**, not `/routes/estimate`. Current creation flow stores a **traffic-unaware** estimate; the detail screen can request a **traffic-aware** estimate. Preserve the distinction between saved baseline ETA and fresh traffic ETA.
- **Data and security:** Supabase Postgres stores commutes, but the uploaded repo has no checked-in migration/RLS definitions; do not assume RLS is verified. Real database policy changes require explicit approval and independent checks. Never put a service-role key or database URL in Expo public environment variables.
- **Team ownership:** When a task overlaps another developer's API client, backend, or recommendation UI, propose a minimal integration point and coordinate rather than modifying their scope unasked.

## 5. Existing contracts and details that must not drift

- The backend commute schema uses `origin_address`, `destination_address`, `arrival_time`, `days_of_week`, `arrival_buffer_minutes`, `travel_mode`; responses may include `estimated_duration_seconds`.
- Weekdays currently differ by layer: backend uses **Sunday=0 through Saturday=6**, while the frontend UI uses **Monday=1 through Sunday=7**. Preserve existing conversion in `src/services/commutes.ts`.
- Travel modes differ by layer: UI uses `driving|transit|walking|bicycling`; backend commute uses `drive|transit|walk|bike`; Google Routes uses `drive|transit|walk|bicycle`. Preserve mapping and explicitly flag unsupported choices.
- Current frontend departure formula is **arrival minus ceil(ETA seconds / 60) minutes minus buffer minutes**. Date rollover matters (departing on the previous day). The Sprint 2 HLD says the backend should own departure calculations, but the uploaded code currently computes them in `src/utils/commute-time.ts`. **This is a documented-versus-implemented discrepancy: ask before relocating logic.**
- API routes: `GET/POST /commutes`, `GET/PATCH/DELETE /commutes/{id}`, `POST /maps/estimate`, `GET /places/autocomplete`, `GET /places/details`, `GET /health`.
- `PATCH /commutes/{id}` currently declares the full `CommuteCreate` payload rather than `CommuteUpdate`; treat partial-update support as **unverified/defective** until fixed and tested.
- The two records in `src/constants/default-commutes.ts` are **local demonstration fixtures**, not per-user Supabase records. Do not conflate them with persisted data or pretend the list can be genuinely empty while these are always injected.
- `GET /commutes/{id}` exists on the backend; the current detail screen uses in-memory `CommuteContext`, not this endpoint. Do not report it as fully integrated.
- There is no confirmed trip-log endpoint, commute statistics API, personalized ML model, or notification scheduler in this snapshot. Do not claim these exist or implement them without a task.

## 6. Security, correctness, and operational safety

- Never read aloud, print, commit, log, or paste secret `.env` values, credentials, bearer tokens, database passwords, or user records. Use safe `.env.example` keys and redact outputs.
- Ensure backend authorization is tied to verified user identity and database queries are user-scoped. Never bypass guards to make a demo pass.
- If a security concern is outside the task (for example unprotected billable Places endpoints or unverified RLS), **report it separately**; do not unilaterally change authentication rules or routing behavior.
- Do not fabricate a successful backend response, live Google estimate, saved commute, persisted deletion, or successful integration test when a service is unavailable.
- Time zones, local time, DST, overnight trips, traffic refresh intervals, and sample fixtures can change product behavior. Ask if the intended behavior is not clear.
- Third-party Maps calls are billable; avoid unnecessary polling, retries, or test traffic.

## 7. Testing and evidence standards

- **Inspect existing tests before coding.** Add focused tests only for the requested behavior.
- Backend test command from `easeway-backend/`: `python -m unittest discover -s tests -v`. Existing tests mock Google/Supabase dependencies; passing does not prove the live integration works.
- Frontend tests from `easeway-frontend/`: `npm test` with compatible Node (README specifies Node 22.18+), or the equivalent TypeScript-strip test runner if available. Frontend type checks/lint: `npx tsc --noEmit` and `npm run lint` when dependencies are installed.
- Verify a frontend request's **payload**, its backend **response mapping**, loading, errors, retry, and navigation when relevant. For authenticated flows include signed-in, signed-out, and cross-user behavior.
- State exactly what you ran and its results. Explicitly say when an environment, native emulator, Supabase database, API key, or physical phone was unavailable. Never claim "works end to end" on static inspection alone.
- Do not install packages, rewrite lockfiles, modify dependencies, or add tools merely to run a check without permission.

## 8. Sprint 2 demo priorities — guidance only, not permission to work

1. A real authenticated user can register/sign in, reach protected screens, and sign out.
2. The same user can create a **persisted** commute and list it again without relying on local examples.
3. The user can open the correct saved commute, view accurate arrival/buffer/route information, and receive a transparent **baseline vs traffic-aware** departure recommendation.
4. Edit and delete behaviors match their published API contracts and give truthful error/success feedback.
5. Google Routes and Places failures, backend disconnects, invalid input, and empty states do not produce misleading success.
6. Broader personalization, trip logging/stats, background notifications, and ML remain separate planned tasks; no scope expansion without approval.

## 9. Required agent response format

For **review-only** requests: **finding → evidence (file and line) → impact → proposed minimal solution → uncertainty**, without editing anything.

For **implementation** requests: **approved scope → files changed → exact behavior → tests run/results → diff summary → remaining issues**. If a new architectural choice is necessary, stop and ask first.

If blocked by a source, test, or service, retry reasonable **read-only** approaches; after two failed attempts, identify the blocker and report what can still be determined. Do not invent data or silently change approach.
