# AiHospitality API v1 - Postman Collection

## 📚 Overview

This collection contains all API endpoints for the AiHospitality platform v1.

## 🚀 Quick Start

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `v1-collection.json`
4. Collection will appear in your sidebar

### 2. Configure Environment

Create a new environment with these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `https://api.aihospitality.com/api/v1` |
| `access_token` | Bearer token | Your OAuth2 token |
| `hotel_id` | Property ID | `hotel-abc-123` |
| `hub_id` | Hub ID (optional) | `hub-xyz-456` |

### 3. Authenticate

All requests require a Bearer token:

```bash
Authorization: Bearer {access_token}
```

## 📋 Endpoint Groups

### Properties
- `GET /properties` - List all properties
- `GET /properties/:id` - Get property details

### Room Types
- `GET /rooms` - List room types

### Rate Plans
- `GET /rates` - List rate plans

### Quotes
- `POST /quotes` - Create booking quote
- `GET /quotes/:id` - Retrieve quote

### Reservations
- `POST /reservations` - Create booking
- `GET /reservations` - List bookings
- `GET /reservations/:id` - Get booking details
- `POST /reservations/:id/cancel` - Cancel booking

### ARI (Availability, Rates, Inventory)
- `POST /ari/availability` - Update availability
- `POST /ari/rates` - Update rates
- `POST /ari/restrictions` - Update restrictions

### Distribution
- `GET /channels` - List channels
- `POST /distribution/parity/check` - Check rate parity

### Analytics
- `GET /analytics/occupancy` - Occupancy report
- `GET /analytics/revenue` - Revenue report

## 🔐 Authentication

### Getting an Access Token

```bash
curl -X POST https://api.aihospitality.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 📝 Common Headers

### Required Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer {token}` | Authentication token |
| `Content-Type` | `application/json` | Request body format |

### Context Headers (Choose ONE)

| Header | Value | Use Case |
|--------|-------|----------|
| `x-hotelid` | `hotel-123` | Single property operations |
| `x-hubid` | `hub-456` | Multi-property operations |

⚠️ **Important:** `x-hotelid` and `x-hubid` are **mutually exclusive**. Use only one.

### Optional Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-Request-ID` | `uuid` | Request tracking (auto-generated if missing) |
| `Idempotency-Key` | `uuid` | Prevent duplicate operations (POST/PUT) |

## 🎯 Usage Examples

### Example 1: Create a Quote

```bash
curl -X POST https://api.aihospitality.com/api/v1/quotes \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "x-hotelid: hotel-123" \
  -d '{
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-05",
    "roomTypeId": "deluxe-king",
    "ratePlanCode": "BAR",
    "adults": 2,
    "children": 0
  }'
```

### Example 2: Create a Reservation

```bash
curl -X POST https://api.aihospitality.com/api/v1/reservations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "x-hotelid: hotel-123" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{
    "quoteId": "quote-789",
    "guest": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0100"
    },
    "payment": {
      "method": "credit_card",
      "token": "tok_visa_4242"
    }
  }'
```

### Example 3: Update ARI

```bash
curl -X POST https://api.aihospitality.com/api/v1/ari/rates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "x-hotelid: hotel-123" \
  -d '{
    "roomTypeCode": "deluxe-king",
    "ratePlanCode": "BAR",
    "updates": [
      { "date": "2026-06-01", "rate": 199.99 },
      { "date": "2026-06-02", "rate": 249.99 }
    ]
  }'
```

## 🔧 Testing in Postman

### Pre-request Scripts

Add this to collection pre-request script to auto-generate request IDs:

```javascript
// Auto-generate X-Request-ID if not present
if (!pm.request.headers.has('X-Request-ID')) {
    pm.request.headers.add({
        key: 'X-Request-ID',
        value: pm.variables.replaceIn('{{$guid}}')
    });
}
```

### Tests

Add this to collection tests to validate responses:

```javascript
// Validate status code
pm.test("Status code is 200 or 201", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

// Validate response time
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Validate JSON response
pm.test("Response is JSON", function () {
    pm.response.to.have.jsonBody();
});
```

## 📊 Response Formats

### Success Response

```json
{
  "data": {
    "id": "res-123",
    "status": "CONFIRMED",
    "pnr": "ABC123"
  },
  "meta": {
    "requestId": "req-456"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid check-in date",
    "details": [
      {
        "field": "checkIn",
        "message": "Check-in must be in the future"
      }
    ]
  },
  "meta": {
    "requestId": "req-456"
  }
}
```

## ⚠️ Rate Limiting

- **Limit:** 100 requests per minute per API key
- **Headers returned:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

When rate limited, you'll receive:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 60 seconds."
  }
}
```

## 🐛 Troubleshooting

### 401 Unauthorized
- Check your access token is valid
- Verify token hasn't expired
- Ensure `Authorization: Bearer {token}` header is present

### 400 Bad Request
- Check request body matches schema
- Validate all required fields are present
- Ensure date formats are `YYYY-MM-DD`

### 403 Forbidden
- Verify `x-hotelid` or `x-hubid` header
- Check you have access to the specified property
- Ensure you're not sending BOTH context headers

### 429 Too Many Requests
- Wait 60 seconds before retrying
- Implement exponential backoff
- Consider batching requests

## 📖 Additional Resources

- [API Documentation](https://docs.aihospitality.com/api/v1)
- [Swagger UI](https://api.aihospitality.com/api-docs)
- [SDKs](https://github.com/aihospitality/sdks)
- [Support](https://support.aihospitality.com)

## 📞 Support

For API support:
- Email: api-support@aihospitality.com
- Slack: [Join our channel](https://aihospitality.slack.com)
- Status Page: https://status.aihospitality.com
