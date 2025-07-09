import { getEffectiveRateLimit, getTotalQuotaConfig } from '@/lib/config/rate-limits'
import { getRedisClient, RedisWrapper } from '@/lib/redis/config'

// Rate limit configuration
export interface RateLimitConfig {
  maxRequests: number // Maximum requests per time window
  windowMs: number // Time window in milliseconds
}


let redisWrapper: RedisWrapper | null = null

// Initialize Redis client
async function initializeRedisClient() {
  if (redisWrapper) return redisWrapper

  try {
    redisWrapper = await getRedisClient()
    return redisWrapper
  } catch (error) {
    console.error('Failed to initialize Redis client:', error)
    return null
  }
}


// Debug function to print user's call count and details
export async function printUserCallCount(
  userId: string,
  modelId: string,
  isAuthenticated: boolean = false
): Promise<void> {
  const redis = await initializeRedisClient()
  if (!redis) {
    console.log('❌ Redis not available')
    return
  }

  const userType = isAuthenticated ? 'authenticated' : 'anonymous'
  const config = getEffectiveRateLimit(userType)
  const now = Date.now()
  const windowStart = now - config.windowMs

  console.log(`\n📊 User Call Count Debug:`)
  console.log(`👤 User ID: ${userId}`)
  console.log(`🤖 Model: ${modelId}`)
  console.log(`🔐 Authenticated: ${isAuthenticated}`)
  console.log(`⏰ Current Time: ${new Date(now).toISOString()}`)
  console.log(`🕐 Window Start: ${new Date(windowStart).toISOString()}`)
  console.log(`📋 Config: ${JSON.stringify(config, null, 2)}`)

  try {
    if (isAuthenticated) {
      // For authenticated users, check both hourly limit and lifetime quota
      const hourlyKey = `rate_limit:${userId}:hourly`
      const quotaKey = `rate_limit:${userId}:quota`
      
      console.log(`\n🔍 Checking authenticated user limits:`)
      console.log(`📝 Hourly Key: ${hourlyKey}`)
      console.log(`📊 Quota Key: ${quotaKey}`)
      
      // Check hourly limit
      const hourlyRequests = await redis.zrange(hourlyKey, 0, -1)
      const hourlyCount = hourlyRequests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length
      
      console.log(`\n📈 Hourly requests:`)
      console.log(`   Total requests in Redis: ${hourlyRequests.length}`)
      console.log(`   Valid requests in window: ${hourlyCount}`)
      console.log(`   Requests: [${hourlyRequests.map(req => new Date(parseInt(req)).toISOString()).join(', ')}]`)
      
      // Check lifetime quota
      const quotaRequests = await redis.zrange(quotaKey, 0, -1)
      const quotaCount = quotaRequests.length
      const quotaConfig = getTotalQuotaConfig()
      
      console.log(`\n📊 Lifetime quota:`)
      console.log(`   Total requests in Redis: ${quotaRequests.length}`)
      console.log(`   Quota used: ${quotaCount}`)
      console.log(`   Requests: [${quotaRequests.map(req => new Date(parseInt(req)).toISOString()).join(', ')}]`)
      
      console.log(`\n📋 Limits:`)
      console.log(`   Hourly limit: ${hourlyCount}/${config.maxRequests}`)
      console.log(`   Lifetime quota: ${quotaCount}/${quotaConfig.maxRequests}`)
      console.log(`   Hourly remaining: ${Math.max(0, config.maxRequests - hourlyCount)}`)
      console.log(`   Quota remaining: ${Math.max(0, quotaConfig.maxRequests - quotaCount)}`)
      
    } else {
      // For anonymous users, use a single shared limit
      const key = `rate_limit:anonymous:${userId}`
      
      console.log(`\n🔍 Checking anonymous user limits:`)
      console.log(`📝 Key: ${key}`)
      
      const requests = await redis.zrange(key, 0, -1)
      const currentCount = requests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length

      console.log(`\n📈 Anonymous user requests:`)
      console.log(`   Total requests in Redis: ${requests.length}`)
      console.log(`   Valid requests in window: ${currentCount}`)
      console.log(`   Requests: [${requests.map(req => new Date(parseInt(req)).toISOString()).join(', ')}]`)
      
      console.log(`\n📋 Limits:`)
      console.log(`   Current usage: ${currentCount}/${config.maxRequests}`)
      console.log(`   Remaining: ${Math.max(0, config.maxRequests - currentCount)}`)
    }
    
    console.log(`\n✅ Debug info printed successfully`)
  } catch (error) {
    console.error('❌ Error printing debug info:', error)
  }
}

// Check if user has exceeded rate limit
export async function checkRateLimit(
  userId: string,
  modelId: string,
  isAuthenticated: boolean = false
): Promise<{ allowed: boolean; remaining: number; resetTime: number; quotaRemaining?: number }> {
  const redis = await initializeRedisClient()
  if (!redis) {
    // If Redis is not available, allow all requests
    return { allowed: true, remaining: 999, resetTime: Date.now() + 3600000 }
  }

  const userType = isAuthenticated ? 'authenticated' : 'anonymous'
  const config = getEffectiveRateLimit(userType)
  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    if (isAuthenticated) {
      // For authenticated users: 10 per hour, 50 lifetime quota
      const hourlyKey = `rate_limit:${userId}:hourly`
      const quotaKey = `rate_limit:${userId}:quota`
      
      // Check hourly limit (10 per hour)
      const hourlyRequests = await redis.zrange(hourlyKey, 0, -1)
      const hourlyCount = hourlyRequests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length
      
      // Check lifetime quota (50 total)
      const quotaRequests = await redis.zrange(quotaKey, 0, -1)
      const quotaCount = quotaRequests.length
      const quotaConfig = getTotalQuotaConfig()
      
      if (hourlyCount >= config.maxRequests) {
        // Hourly limit exceeded (10 per hour)
        const oldestRequest = await redis.zrange(hourlyKey, 0, 0)
        const resetTime = oldestRequest.length > 0 
          ? parseInt(oldestRequest[0]) + config.windowMs 
          : now + config.windowMs

        return {
          allowed: false,
          remaining: 0,
          resetTime: resetTime,
          quotaRemaining: Math.max(0, quotaConfig.maxRequests - quotaCount)
        }
      }
      
      if (quotaCount >= quotaConfig.maxRequests) {
        // Lifetime quota exceeded (50 total)
        return {
          allowed: false,
          remaining: Math.max(0, config.maxRequests - hourlyCount),
          resetTime: now + 365 * 24 * 60 * 60 * 1000, // 1 year from now
          quotaRemaining: 0
        }
      }

      // Add current request to both sorted sets
      await redis.zadd(hourlyKey, now, now.toString())
      await redis.zadd(quotaKey, now, now.toString())
      
      // Remove old entries outside the window (simplified approach)
      const hourlyRequestsToRemove = hourlyRequests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime < windowStart
      })
      for (const req of hourlyRequestsToRemove) {
        await redis.zrem(hourlyKey, req)
      }

      return {
        allowed: true,
        remaining: config.maxRequests - hourlyCount - 1,
        resetTime: now + config.windowMs,
        quotaRemaining: quotaConfig.maxRequests - quotaCount - 1
      }
    } else {
      // For anonymous users, use a single shared limit
      const key = `rate_limit:anonymous:${userId}`
      const requests = await redis.zrange(key, 0, -1)
      const currentCount = requests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length

      if (currentCount >= config.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = await redis.zrange(key, 0, 0)
        const resetTime = oldestRequest.length > 0 
          ? parseInt(oldestRequest[0]) + config.windowMs 
          : now + config.windowMs

        return {
          allowed: false,
          remaining: 0,
          resetTime: resetTime
        }
      }

      // Add current request to the sorted set
      await redis.zadd(key, now, now.toString())
      
      // Remove old entries outside the window
      const requestsToRemove = requests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime < windowStart
      })
      for (const req of requestsToRemove) {
        await redis.zrem(key, req)
      }

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetTime: now + config.windowMs
      }
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // If there's an error, allow the request
    return { allowed: true, remaining: 999, resetTime: now + 3600000 }
  }
}

// Get user's current usage statistics
export async function getUserUsageStats(
  userId: string,
  modelId: string,
  isAuthenticated: boolean = false
): Promise<{ 
  totalRequests: number; 
  remainingRequests: number; 
  resetTime: number;
  quotaUsed?: number;
  quotaRemaining?: number;
}> {
  const redis = await initializeRedisClient()
  if (!redis) {
    return { totalRequests: 0, remainingRequests: 999, resetTime: Date.now() + 3600000 }
  }

  const userType = isAuthenticated ? 'authenticated' : 'anonymous'
  const config = getEffectiveRateLimit(userType)
  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    if (isAuthenticated) {
      // For authenticated users, get both hourly and quota stats
      const hourlyKey = `rate_limit:${userId}:hourly`
      const quotaKey = `rate_limit:${userId}:quota`
      
      const hourlyRequests = await redis.zrange(hourlyKey, 0, -1)
      const quotaRequests = await redis.zrange(quotaKey, 0, -1)
      
      const hourlyCount = hourlyRequests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length
      
      const quotaCount = quotaRequests.length
      const quotaConfig = getTotalQuotaConfig()
      
      return {
        totalRequests: hourlyCount,
        remainingRequests: Math.max(0, config.maxRequests - hourlyCount),
        resetTime: now + config.windowMs,
        quotaUsed: quotaCount,
        quotaRemaining: Math.max(0, quotaConfig.maxRequests - quotaCount)
      }
    } else {
      // For anonymous users, get shared limit stats
      const key = `rate_limit:anonymous:${userId}`
      const requests = await redis.zrange(key, 0, -1)
      const totalRequests = requests.filter(req => {
        const reqTime = parseInt(req)
        return reqTime >= windowStart
      }).length
      const remainingRequests = Math.max(0, config.maxRequests - totalRequests)
      const resetTime = now + config.windowMs

      return {
        totalRequests,
        remainingRequests,
        resetTime
      }
    }
  } catch (error) {
    console.error('Get usage stats error:', error)
    return { totalRequests: 0, remainingRequests: 999, resetTime: now + 3600000 }
  }
}

// Reset user's rate limit (for testing or admin purposes)
export async function resetUserRateLimit(userId: string, modelId?: string): Promise<void> {
  const redis = await initializeRedisClient()
  if (!redis) return

  try {
    if (modelId) {
      // Reset specific model limit (not used in new system)
      const hourlyKey = `rate_limit:${userId}:hourly`
      const quotaKey = `rate_limit:${userId}:quota`
      await redis.del(hourlyKey)
      await redis.del(quotaKey)
    } else {
      // Reset all limits for the user
      const commonKeys = [
        `rate_limit:${userId}:hourly`,
        `rate_limit:${userId}:quota`,
        `rate_limit:anonymous:${userId}`
      ]
      for (const key of commonKeys) {
        await redis.del(key)
      }
    }
  } catch (error) {
    console.error('Reset rate limit error:', error)
  }
}

// Track model usage statistics
export async function trackModelUsage(modelId: string): Promise<void> {
  const redis = await initializeRedisClient()
  if (!redis) {
    console.log('❌ Redis not available for model usage tracking')
    return
  }

  const now = Date.now()
  const modelUsageKey = `model_usage:${modelId}`
  
  try {
    // Add current usage to the model's sorted set
    await redis.zadd(modelUsageKey, now, now.toString())
    
    // Keep only the last 30 days of data (cleanup old entries)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    const oldEntries = await redis.zrangebyscore(modelUsageKey, 0, thirtyDaysAgo)
    for (const entry of oldEntries) {
      await redis.zrem(modelUsageKey, entry)
    }
    
    console.log(`✅ Tracked model usage for ${modelId}`)
  } catch (error) {
    console.error('❌ Error tracking model usage:', error)
  }
}

// Get model usage statistics
export async function getModelUsageStats(): Promise<Array<{ model: string; count: number }>> {
  const redis = await initializeRedisClient()
  if (!redis) {
    console.log('❌ Redis not available for model usage stats')
    return []
  }

  try {
    const modelKeys = await redis.keys('model_usage:*')
    const modelStats: Array<{ model: string; count: number }> = []
    
    for (const key of modelKeys) {
      const modelId = key.replace('model_usage:', '')
      const count = await redis.zcard(key)
      if (count > 0) {
        modelStats.push({ model: modelId, count })
      }
    }
    
    // Sort by count in descending order
    modelStats.sort((a, b) => b.count - a.count)
    
    return modelStats
  } catch (error) {
    console.error('❌ Error getting model usage stats:', error)
    return []
  }
} 