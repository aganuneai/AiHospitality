# 🔐 Authentication Expired - Runbook

## Overview

**Symptom:** API requests failing with `401 Unauthorized` after token expiration  
**Impact:** HIGH - Blocks all API operations  
**MTTR Target:** < 15 minutes

---

## Detection

### Symptoms
- API returning `401 Unauthorized`
- Error message: "Token expired" or "Invalid token"
- Sudden spike in authentication failures
- Previously working integrations now failing

### Monitoring Alerts
```
Alert: auth_failure_rate > 10% for 5min
Alert: token_expiration_within_5min
Alert: refresh_token_expired
```

---

## Root Causes

| Cause | Frequency | Fix Time |
|-------|-----------|----------|
| Access token expired (< 1h TTL) | 90% | 2min |
| Refresh token expired (> 30d) | 8% | 10min |
| Token revoked/invalidated | 2% | 15min |

---

## Diagnosis Steps

###  1. Check Token Expiration

```bash
# Decode JWT token
echo "YOUR_TOKEN" | base64 -d

# Check 'exp' field (Unix timestamp)
# Compare with current time
```

**Expected:** `exp` > current timestamp  
**If expired:** Token needs refresh

### 2. Verify Token Format

```bash
# Valid Bearer format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Common mistakes:**
- Missing "Bearer " prefix
- Extra spaces
- Truncated token

### 3. Check Logs

```sql
-- Query auth failures
SELECT timestamp, error, userId, ipAddress
FROM auth_logs
WHERE status = 'FAILED'
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## Resolution

### Solution 1: Refresh Access Token (90% of cases)

#### For Partner Integrations:

```bash
# POST to token refresh endpoint
curl -X POST https://api.aihospitality.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Response:**
```json
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Time:** 2 minutes

#### For Internal Services:

```typescript
// Auto-refresh logic
import { authService } from '@/lib/auth';

const token = await authService.getValidToken();
// Automatically refreshes if expired
```

### Solution 2: Re-authenticate (8% of cases)

If refresh token is also expired:

```bash
# Full OAuth flow
curl -X POST https://api.aihospitality.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Time:** 5-10 minutes

### Solution 3: Token Revoked (2% of cases)

If token was revoked (security incident):

1. **Investigate** why token was revoked
2. **Contact** security team
3. **Generate** new credentials via partner portal
4. **Update** integration with new credentials

**Time:** 15-30 minutes

---

## Prevention

### Implement Token Refresh Logic

```typescript
// lib/auth/token-manager.ts

class TokenManager {
  private refreshThreshold = 5 * 60 * 1000; // 5min before expiry

  async getValidToken(): Promise<string> {
    const token = this.getCurrentToken();
    const expiresAt = this.decodeExp(token);
    
    // Refresh proactively
    if (Date.now() + this.refreshThreshold >= expiresAt) {
      return await this.refreshToken();
    }
    
    return token;
  }

  private async refreshToken(): Promise<string> {
    // Refresh logic with retry
    const newToken = await this.oauth.refresh();
    this.saveToken(newToken);
    return newToken.access_token;
  }
}
```

### Monitoring

```typescript
// Alert 5min before expiration
if (tokenExpiresIn < 5 * 60) {
  logger.warn('Token expiring soon', {
    expiresIn: tokenExpiresIn,
    userId: token.sub
  });
}
```

### Best Practices

1. ✅ **Refresh proactively** (5min before expiry)
2. ✅ **Cache tokens** securely
3. ✅ **Monitor expiration**
4. ✅ **Implement retry** with refresh on 401
5. ✅ **Log all auth events**

---

## Escalation

### When to Escalate

- Refresh endpoint down (> 5min)
- Systematic token revocations
- OAuth provider issues

### Who to Contact

1. **L1 Support:** Verify partner credentials
2. **L2 Engineering:** Auth service issues
3. **Security Team:** Suspected compromise

**Escalation SLA:** 15 minutes

---

## Validation

After resolution, verify:

```bash
# Test API call
curl -X GET https://api.aihospitality.com/api/v1/health \
  -H "Authorization: Bearer NEW_TOKEN"

# Expected: 200 OK
```

✅ API calls succeed  
✅ No auth errors in logs  
✅ Token valid for > 50min

---

## Related Runbooks

- [403 Context Error](/docs/runbooks/403-context-error.md)
- [Rate Limiting](/docs/runbooks/rate-limiting.md)
- [Security Incidents](/docs/runbooks/security-incident.md)
