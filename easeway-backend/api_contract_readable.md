Version: 1.0.0

Commute endpoints require `Authorization: Bearer <Supabase access token>`.
The backend derives the user ID from that token, not request parameters.
All commute responses include `travel_mode` and nullable
`estimated_duration_seconds` (null only for older records without an estimate).

## POST /commutes

Creates a new commute for the authenticated user. The client must select and
verify both locations through `/places/autocomplete` and `/places/details`
before submitting their canonical addresses. This endpoint obtains one Google
Routes estimate with `TRAFFIC_UNAWARE` routing and stores its duration in seconds.
The client must not make an additional `/maps/estimate` call during creation.
An estimate failure returns HTTP 502 and does not save a commute.

- **URL Parameters**
	- None
- **Data Parameters**

```json
{
  "name": string,
  "origin_address": string,
  "destination_address": string,
  "arrival_time": time,
  "days_of_week": list[int],
  "arrival_buffer_minutes": int,
  "is_active": bool,
  "travel_mode": "drive" | "transit" | "bike" | "walk"
}
```

- **Headers**
	- Content-Type: application/json
	- Authorization: Bearer <Supabase access token>
- **Successful Response** ✅
	- **Code**: `201`
	- **Content**:

```json
{
  "id": int,
  "user_id": UUID,
  "name": string,
  "origin_address": string,
  "destination_address": string,
  "arrival_time": time,
  "days_of_week": list[int],
  "arrival_buffer_minutes": int | null,
  "is_active": bool,
  "travel_mode": "drive" | "transit" | "bike" | "walk",
  "estimated_duration_seconds": int,
  "created_at": datetime,
  "updated_at": datetime | null
}
```

- **Error Response** ❌
	- **Code**: `422`
	- **Content**:

```json
{
  "detail": [
    {
      "type": "too_short",
      "loc": [
        "body",
        "days_of_week"
      ],
      "msg": "List should have at least 1 item after validation, not 0",
      "input": [],
      "ctx": {
        "min_length": 1,
        "actual_length": 0
      }
    }
  ]
}
```
## GET /commutes

Returns a list of Commutes from a User.

- **URL Parameters**
	- `is_active=[bool]`
- **Data Parameters**
	- None
- **Headers**
	- Content-Type: application/json
	- Authorization: Bearer <Supabase access token>
- **Successful Reponse**
	- **Code**: `200`
	- **Content**:

```json
[
  {
    "id": int,
    "user_id": UUID,
    "name": string,
    "origin_address": string,
    "destination_address": string,
    "arrival_time": datetime,
    "days_of_week": list[int],
    "arrival_buffer_minutes": int,
    "is_active": bool,
    "travel_mode": "drive" | "transit" | "bike" | "walk",
    "estimated_duration_seconds": int | null,
    "created_at": datetime,
    "updated_at": datetime
  }
]
```

## GET /commutes/{commute_id}

Returns a Commute with the specified `id`.

- **URL Parameters**
	- *Required path parameter:* `commute_id` (integer), e.g. `/commutes/1`
- **Data Parameters**
	- None
- **Headers**
	- Content-Type: application/json
- **Successful Reponse**
	- **Code**: `200`
	- **Content**:

```json
{
  "id": int,
  "user_id": UUID,
  "name": string,
  "origin_address": string,
  "destination_address": string,
  "arrival_time": datetime,
  "days_of_week": list[int],
  "arrival_buffer_minutes": int,
  "is_active": bool,
  "travel_mode": "drive" | "transit" | "bike" | "walk",
  "estimated_duration_seconds": int | null,
  "created_at": datetime,
  "updated_at": datetime
}
```

- **Error Response**
	- **Code**: `404`
	- **Content**:

```json
{ "detail":"Commute not found" }
```

## POST /maps/estimate

Returns a Google Routes estimate for an address pair. Requires
`Authorization: Bearer <access token>`. The commute screen uses
`"traffic_aware": true` for live driving estimates, only from
`min(2 × estimated_duration_seconds, 1 hour)` before the recommended departure.

- **Data Parameters**

```json
{
  "origin": string,
  "destination": string,
  "mode": "drive" | "transit" | "walk" | "bicycle",
  "traffic_aware": bool
}
```

- **Successful Response** ✅
	- **Code**: `200`
	- **Content**:

```json
{
  "duration_seconds": int,
  "static_duration_seconds": int,
  "distance_meters": int
}
```

- **Error Response**
	- **Code**: `502` when Google cannot produce an estimate.
