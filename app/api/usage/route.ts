import { getCurrentUser, getCurrentUserId } from '@/lib/auth/get-current-user'
import { getUserUsageStats } from '@/lib/utils/rate-limit'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const user = await getCurrentUser()
    const isAuthenticated = user !== null
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get('modelId') || 'gpt-4o-mini'

    const usageStats = await getUserUsageStats(userId, modelId, isAuthenticated)

    return NextResponse.json({
      userId,
      modelId,
      isAuthenticated,
      ...usageStats,
      resetTime: new Date(usageStats.resetTime).toISOString()
    })
  } catch (error) {
    console.error('Usage stats error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 