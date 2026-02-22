# 🚫 403 Context Error - Runbook

## Overview

**Symptom:** API returning `403 Forbidden` due to invalid hotel/hub/channel context  
**Impact:** HIGH - Blocks property/channel operations  
**MTTR Target:** < 30 minutes

---

## Detection

### Symptoms
- `403 Forbidden` responses
- Error: "Hotel not found or access denied"
- Error: "Invalid channel credentials"
- Error: "x-hotelid and x-hubid are mutually exclusive"

### Monitoring Alerts
```
Alert: 403_error_rate > 5% for 5min
Alert: context_validation_failures > 100/min
```

---

## Root Causes

| Cause | Frequency | Fix Time |
|-------|-----------|----------|
| Wrong x-hotelid header | 40% | 5min |
| Both x-hotelid AND x-hubid | 30% | 5min |
| Hotel not in user's chain | 20% | 15min |
| Invalid channel credentials | 10% | 10min |

---

## Diagnosis

### Step 1: Check Request Headers

```bash
# Inspect actual request
curl -v https://api.aihospitality.com/api/v1/properties/rooms \
  -H "Authorization: Bearer TOKEN" \
  -H "x-hotelid: hotel-123" \
  -H "x-request-id: debug-001"
```

**Look for:**
- ✅ `x-hotelid` OR `x-hubid` (not both)
- ✅ Valid hotel/hub ID format
- ✅ Correct Authorization header

### Step 2: Validate Hotel ID

```sql
-- Check if hotel exists
SELECT id, name, chainId, active
FROM Property
WHERE id = 'hotel-123';

-- Check user access
SELECT hotelId
FROM UserAccess
WHERE userId = 'user-xyz'
  AND hotelId = 'hotel-123';
```

### Step 3: Check Logs

```sql
SELECT 
  timestamp,
  requestId,
  url,
  headers,
  error,
  userId
FROM api_logs
WHERE status = 403
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

---

## Common Scenarios

### Scenario 1: Both x-hotelid AND x-hubid

**Error:**
```json
{
  "status": 403,
  "error": "Bad Request",
  "message": "x-hotelid and x-hubid are mutually exclusive"
}
```

**Cause:** Client sending both headers

**Fix:**
```bash
# WRONG
-H "x-hotelid: hotel-123" \
-H "x-hubid: hub-456"

# CORRECT (choose one)
-H "x-hotelid: hotel-123"
# OR
-H "x-hubid: hub-456"
```

**Time:** 2min

---

### Scenario 2: Hotel Not Found

**Error:**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Hotel 'hotel-xyz' not found"
}
```

**Diagnosis:**
```sql
SELECT id, name, active, chainId
FROM Property
WHERE id = 'hotel-xyz';
-- Returns empty
```

**Possible Causes:**
1. Typo in hotel ID
2. Hotel deleted/archived
3. Wrong environment (staging vs production)

**Fix:**
```bash
# Verify correct hotel ID
SELECT id, name FROM Property WHERE name ILIKE '%hotel name%';

# Use correct ID
-H "x-hotelid: correct-hotel-id"
```

**Time:** 5min

---

### Scenario 3: Access Denied

**Error:**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Access denied to hotel 'hotel-123'"
}
```

**Diagnosis:**
```sql
-- Check user's chain
SELECT chainId FROM Users WHERE id = 'user-xyz';

-- Check hotel's chain
SELECT chainId FROM Property WHERE id = 'hotel-123';

-- Different chains = Access Denied
```

**Fix:**

**Option A:** User needs access grant
```sql
INSERT INTO UserAccess (userId, hotelId)
VALUES ('user-xyz', 'hotel-123');
```

**Option B:** Wrong hotel ID
```bash
# Use hotel from correct chain
-H "x-hotelid: hotel-in-users-chain"
```

**Time:** 10-15min

---

### Scenario 4: Invalid Channel Credentials

**Error:**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Invalid channel credentials"
}
```

**Diagnosis:**
```sql
SELECT 
  id,
  name,
  appKey,
  active,
  provisionedAt
FROM Channel
WHERE code = 'OTA-001';
```

**Check:**
1. Channel exists
2. App-key matches
3. Channel is active
4. Not expired/suspended

**Fix:**
```bash
# Regenerate app-key via partner portal
# Or contact support to reactivate channel

# Use correct credentials
-H "x-channelcode: OTA-001" \
-H "x-app-key: NEW_APP_KEY"
```

**Time:** 10min

---

## Resolution Checklist

### For Property APIs:

- [ ] ✅ Has Authorization header
- [ ] ✅ Has x-hotelid **OR** x-hubid (not both)
- [ ] ✅ Hotel/hub exists in database
- [ ] ✅ User has access to hotel/hub
- [ ] ✅ Hotel is active (not archived)

### For Distribution APIs:

- [ ] ✅ Has Authorization header
- [ ] ✅ Has x-channelCode header
- [ ] ✅ Has x-app-key header
- [ ] ✅ Channel is provisioned
- [ ] ✅ App-key matches channel
- [ ] ✅ Channel is active

---

## Quick Fix Reference

| Error | Quick Fix |
|-------|-----------|
| "mutually exclusive" | Remove one of x-hotelid/x-hubid |
| "Hotel not found" | Verify hotel ID, check environment |
| "Access denied" | Grant user access or use correct hotel |
| "Invalid channel" | Check channel code and app-key |

---

## Prevention

### Client-Side Validation

```typescript
// Validate before sending
function validatePropertyHeaders(headers: Headers): void {
  const hasHotel = headers.get('x-hotelid');
  const hasHub = headers.get('x-hubid');
  
  if (hasHotel && hasHub) {
    throw new Error('Cannot use both x-hotelid and x-hubid');
  }
  
  if (!hasHotel && !hasHub) {
    throw new Error('Either x-hotelid or x-hubid is required');
  }
}
```

### API Middleware

```typescript
// Server-side early validation
export function validateContext(req, res, next) {
  const hotelId = req.headers['x-hotelid'];
  const hubId = req.headers['x-hubid'];
  
  // Mutual exclusivity
  if (hotelId && hubId) {
    return res.status(400).json({
      error: 'x-hotelid and x-hubid are mutually exclusive'
    });
  }
  
  // At least one required
  if (!hotelId && !hubId) {
    return res.status(400).json({
      error: 'Either x-hotelid or x-hubid is required'
    });
  }
  
  next();
}
```

---

## Escalation

### When to Escalate

- User cannot access assigned hotels
- Systematic 403 errors across multiple channels
- Database consistency issues

### Who to Contact

1. **L1 Support:** Verify credentials, check provisioning
2. **L2 Engineering:** Investigate access control logic
3. **DBA Team:** Database permissions issues

**Escalation SLA:** 30 minutes

---

## Validation

```bash
# Test successful request
curl -X GET https://api.aihospitality.com/api/v1/properties/hotel-123/rooms \
  -H "Authorization: Bearer TOKEN" \
  -H "x-hotelid: hotel-123"

# Expected: 200 OK
```

✅ Request succeeds  
✅ No 403 errors  
✅ Correct data returned

---

## Related Runbooks

- [Auth Expired](/docs/runbooks/auth-expired.md)
- [Duplicate Reservation](/docs/runbooks/duplicate-reservation.md)
- [Channel Onboarding](/docs/runbooks/channel-onboarding.md)
