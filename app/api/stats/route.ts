import { getRedisClient } from '@/lib/redis/config'
import { getModelUsageStats } from '@/lib/utils/rate-limit'
import { NextResponse } from 'next/server'

export const revalidate = 60 // Revalidate every 60 seconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '24h'
    
    const redis = await getRedisClient()
    if (!redis) {
      return NextResponse.json({ error: 'Redis not available' }, { status: 500 })
    }

    const now = new Date()
    let hours: number
    switch (range) {
      case '7d':
        hours = 7 * 24
        break
      case '30d':
        hours = 30 * 24
        break
      default: // 24h
        hours = 24
        break
    }

    // Get user statistics
    const authenticatedUsers = await redis.scard('stats:users:authenticated')
    const anonymousUsers = await redis.scard('stats:users:anonymous')
    const totalUsers = authenticatedUsers + anonymousUsers

    // Get hourly request data
    const hourlyRequests: Array<{ hour: string; count: number }> = []
    const hourlyData = (await redis.hgetall('stats:requests:hourly')) || {}
    for (let i = 0; i < hours; i++) {
        const hourTime = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourKey = hourTime.toISOString().slice(0, 13) // YYYY-MM-DDTHH
        hourlyRequests.push({
            hour: `${hourKey}:00:00.000Z`, // The frontend expects this format
            count: parseInt(hourlyData[hourKey] || '0'),
        })
    }
    hourlyRequests.sort((a, b) => new Date(b.hour).getTime() - new Date(a.hour).getTime())


    // Get daily request data
    const dailyRequests: Array<{ date: string; count: number }> = []
    const dailyData = (await redis.hgetall('stats:requests:daily')) || {}
    const days = range === '30d' ? 30 : range === '7d' ? 7 : 1

    for (let i = 0; i < days; i++) {
        const dayTime = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayKey = dayTime.toISOString().slice(0, 10)
        dailyRequests.push({
            date: dayKey,
            count: parseInt(dailyData[dayKey] || '0'),
        })
    }
    dailyRequests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Get model usage statistics
    const topModels = await getModelUsageStats()

    // Calculate total requests
    const totalRequests = hourlyRequests.reduce((sum, hour) => sum + hour.count, 0)

    const stats = {
      totalUsers,
      totalRequests,
      hourlyRequests,
      dailyRequests,
      topModels,
      userTypes: {
        authenticated: authenticatedUsers,
        anonymous: anonymousUsers
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