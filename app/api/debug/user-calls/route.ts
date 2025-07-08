import { getCurrentUser, getCurrentUserId } from '@/lib/auth/get-current-user'
import { printUserCallCount } from '@/lib/utils/rate-limit'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const user = await getCurrentUser()
    const isAuthenticated = user !== null
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get('modelId') || 'gpt-4o-mini'

    console.log(`\n🔍 Debug API called:`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`🤖 Model: ${modelId}`)
    console.log(`🔐 Authenticated: ${isAuthenticated}`)

    // Print detailed call count information
    await printUserCallCount(userId, modelId, isAuthenticated)

    return NextResponse.json({
      message: 'Debug information printed to console',
      userId,
      modelId,
      isAuthenticated,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to print debug information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 