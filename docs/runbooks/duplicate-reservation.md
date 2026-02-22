# 🔁 Duplicate Reservation - Runbook

## Overview

**Symptom:** Same booking created multiple times  
**Impact:** CRITICAL - Guest confusion, overbooking, revenue leakage  
**MTTR Target:** < 20 minutes

---

## Detection

### Symptoms
- Multiple confirmations for same guest/dates
- Duplicate PNRs in system
- Guest calling about multiple charges
- Inventory double-counted as sold

### Monitoring Alerts
```
Alert: duplicate_reservations_detected
Alert: idempotency_key_collision
Alert: same_guest_same_dates within 1min
```

---

## Root Causes

| Cause | Frequency | Fix Time |
|-------|-----------|----------|
| Retry without idempotency key | 60% | 10min |
| Network timeout + retry | 25% | 15min |
| Missing deduplication logic | 10% | 20min |
| Race condition (concurrent requests) | 5% | 30min |

---

## Diagnosis

### Step 1: Identify Duplicates

```sql
-- Find potential duplicates
SELECT 
  guestEmail,
  checkIn,
  checkOut,
  roomTypeId,
  COUNT(*) as booking_count,
  ARRAY_AGG(id) as reservation_ids
FROM Reservation
WHERE createdAt > NOW() - INTERVAL '24 hours'
GROUP BY guestEmail, checkIn, checkOut, roomTypeId
HAVING COUNT(*) > 1
ORDER BY booking_count DESC;
```

### Step 2: Check Idempotency Keys

```sql
-- Check if idempotency was used
SELECT 
  r.id,
  r.guestEmail,
  r.createdAt,
  i.idempotencyKey,
  i.attempts
FROM Reservation r
LEFT JOIN IdempotencyRecord i ON r.id = i.resourceId
WHERE r.id IN ('res-123', 'res-124', 'res-125')
ORDER BY r.createdAt;
```

**Red flags:**
- Missing idempotency records
- Different keys for same booking
- Multiple attempts with same key but different results

### Step 3: Check Request Logs

```sql
SELECT 
  timestamp,
  requestId,
  correlationId,
  idempotencyKey,
  guestEmail,
  response,
  duration
FROM api_logs
WHERE endpoint = '/api/v1/reservations'
  AND method = 'POST'
  AND timestamp > NOW() - INTERVAL '1 hour'
  AND guestEmail = 'john@example.com'
ORDER BY timestamp;
```

---

## Common Scenarios

### Scenario 1: Client Retry Without Idempotency Key

**Symptoms:**
- 2-3 bookings created within seconds
- No idempotency key in requests
- Different confirmation numbers

**Diagnosis:**
```sql
SELECT 
  id,
  guestEmail,
  createdAt,
  (createdAt - LAG(createdAt) OVER (PARTITION BY guestEmail ORDER BY createdAt)) as time_diff
FROM Reservation
WHERE guestEmail = 'john@example.com'
  AND checkIn = '2026-02-15'
ORDER BY createdAt;
```

**Resolution:**

1. **Identify primary reservation:**
```sql
-- Usually the first one created
SELECT id FROM Reservation
WHERE guestEmail = 'john@example.com'
  AND checkIn = '2026-02-15'
ORDER BY createdAt
LIMIT 1;
```

2. **Cancel duplicates:**
```bash
# Cancel via API (preserves audit trail)
curl -X DELETE https://api.aihospitality.com/api/v1/reservations/res-124 \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "reason": "DUPLICATE",
    "primaryReservationId": "res-123",
    "refund": true
  }'
```

3. **Notify guest:**
```bash
# Send email explaining correction
curl -X POST https://api.aihospitality.com/api/v1/notifications \
  -d '{
    "guestEmail": "john@example.com",
    "template": "duplicate_resolved",
    "data": {
      "keptReservation": "res-123",
      "cancelledReservations": ["res-124", "res-125"]
    }
  }'
```

**Time:** 10min

---

### Scenario 2: Timeout + Retry (Network Issue)

**Symptoms:**
- Client received timeout error
- Booking was actually created
- Client retried, creating duplicate

**Diagnosis:**
```sql
-- Check for slow requests
SELECT 
  id,
  duration,
  status,
  error
FROM api_logs
WHERE endpoint = '/api/v1/reservations'
  AND duration > 30000  -- 30s+
  AND timestamp > NOW() - INTERVAL '1 hour';
```

**Resolution:**

1. **Verify which booking succeeded:**
```sql
SELECT 
  r.id,
  r.status,
  r.createdAt,
  p.status as payment_status,
  p.amount
FROM Reservation r
LEFT JOIN Payment p ON p.reservationId = r.id
WHERE r.guestEmail = 'john@example.com'
  AND r.checkIn = '2026-02-15'
ORDER BY r.createdAt;
```

2. **Keep booking with successful payment:**
```sql
-- If first booking has payment, keep it
-- Cancel second booking without charge
```

3. **Implement idempotency enforcement:**
```typescript
// Middleware to require idempotency key
if (!req.headers['idempotency-key']) {
  return res.status(400).json({
    error: 'Idempotency-Key header required for booking requests'
  });
}
```

**Time:** 15min

---

### Scenario 3: Race Condition (Concurrent Requests)

**Symptoms:**
- Two bookings created at exact same time
- Both used same idempotency key
- Lock acquisition failed

**Diagnosis:**
```sql
-- Check concurrent creations
SELECT 
  id,
  createdAt,
  idempotencyKey
FROM Reservation
WHERE guestEmail = 'john@example.com'
  AND ABS(EXTRACT(EPOCH FROM (createdAt - '2026-02-07 10:15:23'))) < 1
ORDER BY createdAt;
```

**Resolution:**

1. **Investigate lock failure:**
```sql
SELECT * FROM IdempotencyLock
WHERE key = 'book-xyz-123'
  AND createdAt > NOW() - INTERVAL '1 hour';
```

2. **Strengthen locking:**
```typescript
// Use distributed lock
import Redis from 'ioredis';
const redis = new Redis();

async function acquireBookingLock(key: string): Promise<boolean> {
  const acquired = await redis.set(
    `lock:${key}`,
    'locked',
    'NX',  // Only set if not exists
    'EX',  // Expiration
    30     // 30 seconds
  );
  
  return acquired === 'OK';
}
```

3. **Resolve duplicates:**
```bash
# Keep first, cancel others
# Refund any charges on cancelled bookings
```

**Time:** 20-30min

---

### Scenario 4: Missing Deduplication

**Symptoms:**
- Same booking data submitted twice
- Different idempotency keys (or none)
- System accepted both

**Diagnosis:**
```sql
-- Find exact duplicates
SELECT 
  COUNT(*) as dup_count,
  guestEmail,
  checkIn,
  checkOut,
  roomTypeId,
  rateAmount
FROM Reservation
WHERE createdAt > NOW() - INTERVAL '24 hours'
GROUP BY guestEmail, checkIn, checkOut, roomTypeId, rateAmount
HAVING COUNT(*) > 1;
```

**Resolution:**

1. **Implement duplicate detection:**
```typescript
async function detectDuplicate(booking: BookingRequest): Promise<string | null> {
  const existing = await prisma.reservation.findFirst({
    where: {
      guestEmail: booking.guestEmail,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomTypeId: booking.roomTypeId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  });
  
  return existing?.id || null;
}
```

2. **Merge duplicates if needed:**
```sql
-- Transfer payments/charges to primary
UPDATE Payment 
SET reservationId = 'res-123'
WHERE reservationId IN ('res-124', 'res-125');

-- Cancel duplicates
UPDATE Reservation
SET status = 'CANCELLED', cancelReason = 'DUPLICATE'
WHERE id IN ('res-124', 'res-125');
```

**Time:** 20min

---

## Resolution Checklist

For each duplicate set:

- [ ] ✅ Identify primary reservation (usually first created)
- [ ] ✅ Verify payment status on all duplicates
- [ ] ✅ Cancel duplicates via API (audit trail)
- [ ] ✅ Refund any duplicate charges
- [ ] ✅ Update inventory (remove double-count)
- [ ] ✅ Notify guest of resolution
- [ ] ✅ Log incident for analysis

---

## Prevention

### Client-Side

```typescript
// Generate idempotency key
import { v4 as uuidv4 } from 'uuid';

const idempotencyKey = `book-${uuidv4()}`;

fetch('/api/v1/reservations', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(booking)
});

// Store key to retry safely
localStorage.setItem('lastBookingKey', idempotencyKey);
```

### Server-Side

```typescript
// Idempotent booking handler
export async function createReservation(
  req: Request,
  res: Response
) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Idempotency-Key required'
    });
  }
  
  // Check for existing result
  const existing = await getIdempotencyRecord(idempotencyKey);
  if (existing) {
    // Return cached result
    return res.status(existing.statusCode).json(existing.response);
  }
  
  // Acquire lock
  const lock = await acquireLock(idempotencyKey);
  if (!lock) {
    return res.status(409).json({
      error: 'Request already in progress'
    });
  }
  
  try {
    // Create reservation
    const reservation = await bookingService.create(req.body);
    
    // Store result
    await storeIdempotencyRecord(idempotencyKey, {
      statusCode: 201,
      response: reservation
    });
    
    return res.status(201).json(reservation);
  } finally {
    await releaseLock(idempotencyKey);
  }
}
```

### Database Constraints

```sql
-- Unique constraint on guest + dates (soft dedup)
CREATE UNIQUE INDEX idx_reservation_dedup 
ON Reservation (guestEmail, checkIn, checkOut, roomTypeId)
WHERE status IN ('CONFIRMED', 'PENDING');
```

---

## Monitoring

```typescript
// Alert on duplicates
const duplicates = await prisma.reservation.groupBy({
  by: ['guestEmail', 'checkIn', 'checkOut'],
  _count: true,
  having: {
    _count: {
      gt: 1
    }
  },
  where: {
    createdAt: {
      gte: new Date(Date.now() - 60 * 60 * 1000)
    }
  }
});

if (duplicates.length > 0) {
  await alertOps({
    severity: 'HIGH',
    message: `${duplicates.length} duplicate bookings detected`,
    duplicates
  });
}
```

---

## Escalation

### When to Escalate

- > 5 duplicates in 1 hour
- Payment processing failures on cancellations
- Guest disputing charges
- Race conditions persisting after lock fix

### Who to Contact

1. **L1 Support:** Cancel duplicates, refund charges
2. **L2 Engineering:** Fix idempotency/lock issues
3. **Finance Team:** Reconcile payments
4. **Guest Relations:** Handle VIP complaints

**Escalation SLA:** 20 minutes

---

## Validation

```sql
-- Verify no duplicates remain
SELECT 
  guestEmail,
  checkIn,
  COUNT(*) as active_bookings
FROM Reservation
WHERE status IN ('CONFIRMED', 'PENDING')
  AND guestEmail = 'john@example.com'
GROUP BY guestEmail, checkIn
HAVING COUNT(*) > 1;

-- Expected: 0 rows
```

✅ Only 1 active booking per guest/dates  
✅ Duplicates cancelled  
✅ Refunds processed  
✅ Guest notified

---

## Related Runbooks

- [Idempotency Implementation](/docs/runbooks/idempotency.md)
- [Payment Refunds](/docs/runbooks/payment-refunds.md)
- [Inventory Reconciliation](/docs/runbooks/inventory-recon.md)
