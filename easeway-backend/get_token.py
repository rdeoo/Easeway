# FILE FOR TESTING AUTH ONLY. REMOVE WHEN AUTH IS FULLY IMPLEMENTED.

import sys

import httpx

from app.core.config import settings

email, password = sys.argv[1], sys.argv[2]
r = httpx.post(
    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token",
    params={"grant_type": "password"},
    headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
    json={"email": email, "password": password},
)
print(r.json().get("access_token") or r.text)