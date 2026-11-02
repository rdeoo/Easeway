Version: 1.0.0

## POST /commutes

Creates a new Commute for a User.

- **URL Parameters**
	- None
- **Data Parameters**

```json
{
  "user_id": UUID,
  "name": string,
  "origin_address": string,
  "destination_address": string,
  "arrival_time": datetime,
  "days_of_week": list[int],
  "arrival_buffer_minutes": int,
  "is_active": bool
}
```

- **Headers**
	- Content-Type: application/json
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
  "arrival_time": datetime,
  "days_of_week": list[int],
  "arrival_buffer_minutes": int,
  "is_active": bool,
  "created_at": datetime,
  "updated_at": datetime
}
```

- **Error Response** ❌
	- **Code**: `422`
	- **Content**:

```json
{
  "detail": [
    {
      "type": "uuid_parsing",
      "loc": [
        "body",
        "user_id"
      ],
      "msg": "Input should be a valid UUID, invalid length: expected length 32 for simple format, found 0",
      "input": "",
      "ctx": {
        "error": "invalid length: expected length 32 for simple format, found 0"
      }
    }
  ]
}
```
## GET /commutes

Returns a list of Commutes from a User.

- **URL Parameters**
	- *Required:* `user_id=[UUID]` (==TEMPORARY==)
	- `is_active=[bool]`
- **Data Parameters**
	- None
- **Headers**
	- Content-Type: application/json
	- ~~Authorization: (LATER)~~
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
    "created_at": datetime,
    "updated_at": datetime
  }
]
```

## GET /commutes `id`

Returns a Commute with the specified `id`.

- **URL Parameters**
	- *Required:* `commute_id=[int]`
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