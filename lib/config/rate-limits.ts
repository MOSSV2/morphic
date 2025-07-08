// Rate limit configuration for different user types
export interface RateLimitConfig {
  maxRequests: number // Maximum requests per time window
  windowMs: number // Time window in milliseconds
}

// Rate limits for different user types
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

// Total quota configuration for authenticated users
export interface TotalQuotaConfig {
  maxRequests: number // Total maximum requests (lifetime quota)
  windowMs: number // Time window in milliseconds (set to a very large value for lifetime)
}

export const TOTAL_QUOTA: TotalQuotaConfig = {
  maxRequests: 50, // 50 total requests lifetime quota for authenticated users
  windowMs: 365 * 24 * 60 * 60 * 1000 // 1 year (effectively lifetime)
}

// Get effective rate limit for a user type
export function getEffectiveRateLimit(userType: 'anonymous' | 'authenticated'): RateLimitConfig {
  return RATE_LIMITS[userType] || RATE_LIMITS.anonymous
}

// Get total quota configuration
export function getTotalQuotaConfig(): TotalQuotaConfig {
  return TOTAL_QUOTA
} 