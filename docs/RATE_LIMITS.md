# Rate Limits

This document describes the rate limiting system implemented in the application.

## Overview

The rate limiting system uses Redis to track user requests and enforce limits based on user type and model usage.

## Rate Limit Rules

### Anonymous Users
- **Limit**: 10 requests per hour (all models combined)
- **Window**: 1 hour (3,600,000 milliseconds)
- **Storage**: Single shared limit across all models

### Authenticated Users
- **Hourly Limit**: 10 requests per hour (all models combined)
- **Lifetime Quota**: 50 requests total (lifetime)
- **Window**: 1 hour for hourly limit, 1 year for lifetime quota
- **Storage**: Separate tracking for hourly limit + lifetime quota

## Implementation Details

### Redis Keys
- Anonymous users: `rate_limit:anonymous:{userId}`
- Authenticated users: 
  - Hourly limit: `rate_limit:{userId}:hourly`
  - Lifetime quota: `rate_limit:{userId}:quota`

### Data Structure
Uses Redis sorted sets (ZSET) to store timestamps of requests, allowing efficient window-based filtering.

### Configuration
Rate limits are configured in `lib/config/rate-limits.ts`:

```typescript
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  anonymous: {
    maxRequests: 10, // 10 requests per hour for anonymous users
    windowMs: 60 * 60 * 1000 // 1 hour
  },
  authenticated: {
    maxRequests: 10, // 10 requests per hour for authenticated users
    windowMs: 60 * 60 * 1000 // 1 hour
  }
}

export const TOTAL_QUOTA: TotalQuotaConfig = {
  maxRequests: 50, // 50 total requests lifetime quota for authenticated users
  windowMs: 365 * 24 * 60 * 60 * 1000 // 1 year (effectively lifetime)
}
```

## API Integration

### Chat API (`/api/chat`)
- Checks rate limits before processing requests
- Returns 429 status with detailed error information when limits are exceeded
- Includes rate limit headers in responses

### Debug API (`/api/debug/user-calls`)
- Provides detailed information about user's current usage
- Useful for debugging and monitoring

## Error Responses

When rate limits are exceeded, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit or your lifetime quota. Please try again later.",
  "resetTime": "2024-01-01T12:00:00.000Z",
  "remaining": 0,
  "quotaRemaining": 5
}
```

### Response Headers
- `X-RateLimit-Reset`: ISO timestamp when limits reset
- `X-RateLimit-Remaining`: Remaining requests for current hour
- `X-RateLimit-Quota-Remaining`: Remaining lifetime quota (authenticated users only)

## Debugging

### Console Logging
The system provides detailed console logging for debugging:

```
🚀 New API call:
👤 User: user123
🤖 Model: gpt-4o-mini
🔐 Authenticated: true
📅 Time: 2024-01-01T12:00:00.000Z

📊 User Call Count Debug:
👤 User ID: user123
🤖 Model: gpt-4o-mini
🔐 Authenticated: true
⏰ Current Time: 2024-01-01T12:00:00.000Z
🕐 Window Start: 2024-01-01T11:00:00.000Z
📋 Config: {"maxRequests":10,"windowMs":3600000}

🔍 Checking authenticated user limits:
📝 Hourly Key: rate_limit:user123:hourly
📊 Quota Key: rate_limit:user123:quota

📈 Hourly requests:
   Total requests in Redis: 3
   Valid requests in window: 3
   Requests: [2024-01-01T11:30:00.000Z, 2024-01-01T11:45:00.000Z, 2024-01-01T12:00:00.000Z]

📊 Lifetime quota:
   Total requests in Redis: 8
   Quota used: 8
   Requests: [2024-01-01T11:15:00.000Z, 2024-01-01T11:30:00.000Z, ...]

📋 Limits:
   Hourly limit: 3/10
   Lifetime quota: 8/50
   Hourly remaining: 7
   Quota remaining: 42

✅ Rate limit check passed, proceeding with request
```

### Debug Page
Visit `/debug` to manually check rate limit status and view detailed information.

## Testing

### Reset Function
Use the `resetUserRateLimit` function to clear rate limits for testing:

```typescript
import { resetUserRateLimit } from '@/lib/utils/rate-limit'

// Reset all limits for a user
await resetUserRateLimit('user123')

// Reset specific model limit
await resetUserRateLimit('user123', 'gpt-4o-mini')
```

### Manual Testing
1. Make API calls to `/api/chat`
2. Check console for detailed logging
3. Visit `/debug` page to view current status
4. Use debug API to get detailed information

## Monitoring

The system provides comprehensive monitoring capabilities:

1. **Real-time Logging**: All rate limit checks are logged with detailed information
2. **Debug API**: Programmatic access to rate limit status
3. **Console Output**: Detailed debugging information for each request
4. **Error Tracking**: Clear error messages when limits are exceeded

## Future Enhancements

Potential improvements to consider:

1. **Dynamic Limits**: Environment variable overrides for different environments
2. **Admin Interface**: Web interface for managing rate limits
3. **Analytics**: Usage analytics and reporting
4. **Tiered Limits**: Different limits based on user subscription tiers
5. **Geographic Limits**: Different limits based on user location 