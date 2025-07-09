import { getRedisClient } from '@/lib/redis/config'
import { getModelUsageStats } from '@/lib/utils/rate-limit'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '24h'
    
    const redis = await getRedisClient()
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not available' },
        { status: 500 }
      )
    }

    const now = Date.now()
    let startTime: number
    let hours: number

    switch (range) {
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000)
        hours = 7 * 24
        break
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000)
        hours = 30 * 24
        break
      default: // 24h
        startTime = now - (24 * 60 * 60 * 1000)
        hours = 24
        break
    }

    // Get real user statistics from Redis
    const userIds = new Set<string>()
    const authenticatedUsers = new Set<string>()
    const anonymousUsers = new Set<string>()
    
    // Get all rate limit keys to extract user information
    try {
      const allKeys = await redis.keys('rate_limit:*')
      
      for (const key of allKeys) {
        const parts = key.split(':')
        if (parts.length >= 3) {
          if (parts[1] === 'anonymous') {
            const userId = parts[2]
            anonymousUsers.add(userId)
            userIds.add(userId)
          } else {
            const userId = parts[1]
            authenticatedUsers.add(userId)
            userIds.add(userId)
          }
        }
      }
    } catch (error) {
      console.warn('Could not get user data from Redis:', error)
    }

    // Get real hourly request data
    const hourlyRequests: Array<{ hour: string; count: number }> = []
    const hourlyData: { [key: string]: number } = {}
    
    // Generate hourly buckets
    for (let i = hours - 1; i >= 0; i--) {
      const hourTime = now - (i * 60 * 60 * 1000)
      const hourKey = new Date(hourTime).toISOString().slice(0, 13) + ':00:00.000Z'
      hourlyData[hourKey] = 0
    }

    // Count real requests from Redis
    try {
      const allKeys = await redis.keys('rate_limit:*')
      for (const key of allKeys) {
        const requests = await redis.zrange(key, 0, -1)
        for (const req of requests) {
          const reqTime = parseInt(req)
          if (reqTime >= startTime) {
            const hourKey = new Date(reqTime).toISOString().slice(0, 13) + ':00:00.000Z'
            if (hourlyData[hourKey] !== undefined) {
              hourlyData[hourKey]++
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not get hourly data from Redis:', error)
    }

    // Convert to array format
    for (const [hour, count] of Object.entries(hourlyData)) {
      hourlyRequests.push({ hour, count })
    }
    
    // Sort by time in descending order (newest first)
    hourlyRequests.sort((a, b) => new Date(b.hour).getTime() - new Date(a.hour).getTime())

    // Get real daily request data
    const dailyRequests: Array<{ date: string; count: number }> = []
    const dailyData: { [key: string]: number } = {}
    
    const days = range === '30d' ? 30 : range === '7d' ? 7 : 1
    
    // Generate daily buckets
    for (let i = days - 1; i >= 0; i--) {
      const dayTime = now - (i * 24 * 60 * 60 * 1000)
      const dayKey = new Date(dayTime).toISOString().slice(0, 10)
      dailyData[dayKey] = 0
    }

    // Count real daily requests from Redis
    try {
      const allKeys = await redis.keys('rate_limit:*')
      for (const key of allKeys) {
        const requests = await redis.zrange(key, 0, -1)
        for (const req of requests) {
          const reqTime = parseInt(req)
          if (reqTime >= startTime) {
            const dayKey = new Date(reqTime).toISOString().slice(0, 10)
            if (dailyData[dayKey] !== undefined) {
              dailyData[dayKey]++
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not get daily data from Redis:', error)
    }

    // Convert to array format
    for (const [date, count] of Object.entries(dailyData)) {
      dailyRequests.push({ date, count })
    }
    
    // Sort by date in descending order (newest first)
    dailyRequests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Get real model usage statistics from Redis
    const topModels = await getModelUsageStats()

    // Calculate total requests
    const totalRequests = hourlyRequests.reduce((sum, hour) => sum + hour.count, 0)

    const stats = {
      totalUsers: userIds.size,
      totalRequests,
      hourlyRequests,
      dailyRequests,
      topModels,
      userTypes: {
        authenticated: authenticatedUsers.size,
        anonymous: anonymousUsers.size
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 