# ASOCKS API Integration Notes

## API Key
`2f74d4c2d93ff6db9016142cb76ed56f`

## Base URL
`https://api.asocks.com/v2`

## Key Endpoints

### 1. Create Proxy Port
**POST** `/proxy/create-port?apiKey={key}`

**Request Body:**
```json
{
  "country_code": "US",
  "name": "job-automation-proxy",
  "ttl": 1,
  "traffic_limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### 2. Get Port List
**GET** `/proxy/ports?apiKey={key}&per_page=50`

**Response:**
```json
{
  "success": true,
  "message": {
    "data": [
      {
        "id": 123,
        "proxy": "255.255.255.255:1234",
        "username": "user",
        "password": "pass",
        ...
      }
    ]
  }
}
```

### 3. Delete Proxy Port
**DELETE** `/proxy/delete-port?apiKey={key}`

## Implementation Strategy (Option B)

1. **On startup:** Check if we have a cached proxy
2. **If no proxy:** Call `POST /proxy/create-port` to generate one
3. **Use proxy:** For all applications until failure
4. **On failure:** 
   - Delete old proxy (optional)
   - Create new proxy
   - Retry application
5. **Cache proxy:** Store in memory for reuse

## Proxy Format
After creating, we get:
- Host: `proxy.asocks.com` (or similar)
- Port: `1234`
- Username: `generated_user`
- Password: `generated_pass`

Use as: `http://username:password@host:port`
