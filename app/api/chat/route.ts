import { getCurrentUser, getCurrentUserId } from '@/lib/auth/get-current-user'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { checkRateLimit, printUserCallCount } from '@/lib/utils/rate-limit'
import { isProviderEnabled } from '@/lib/utils/registry'
import { cookies } from 'next/headers'

export const maxDuration = 30

const DEFAULT_MODEL: Model = {
  id: 'gpt-4o-mini',
  name: 'GPT-4o mini',
  provider: 'OpenAI',
  providerId: 'openai',
  enabled: true,
  toolCallType: 'native',
  auth: false
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId } = await req.json()
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')
    const userId = await getCurrentUserId()
    const user = await getCurrentUser()
    const isAuthenticated = user !== null

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'

    let selectedModel = DEFAULT_MODEL

    if (modelJson) {
      try {
        selectedModel = JSON.parse(modelJson) as Model
      } catch (e) {
        console.error('Failed to parse selected model:', e)
      }
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    // Check if model requires authentication
    if (selectedModel.auth === true && !isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'This model requires authentication. Please sign in to use it.'
        }),
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Print debug information about user's call count
    console.log(`\n🚀 New API call:`)
    console.log(`👤 User: ${userId}`)
    console.log(`🤖 Model: ${selectedModel.id}`)
    console.log(`🔐 Authenticated: ${isAuthenticated}`)
    console.log(`📅 Time: ${new Date().toISOString()}`)
    
    // Print detailed call count information
    await printUserCallCount(userId, selectedModel.id, isAuthenticated)

    // Check rate limit for the selected model
    const rateLimitResult = await checkRateLimit(userId, selectedModel.id, isAuthenticated)
    
    console.log(`\n📊 Rate limit check result:`)
    console.log(`   Allowed: ${rateLimitResult.allowed}`)
    console.log(`   Remaining: ${rateLimitResult.remaining}`)
    console.log(`   Quota Remaining: ${rateLimitResult.quotaRemaining || 'N/A'}`)
    console.log(`   Reset Time: ${new Date(rateLimitResult.resetTime).toISOString()}`)
    
    if (!rateLimitResult.allowed) {
      const resetTime = new Date(rateLimitResult.resetTime).toISOString()
      const errorMessage = isAuthenticated 
        ? 'You have exceeded the rate limit or your lifetime quota. Please try again later.'
        : 'You have exceeded the rate limit. Please sign up for more requests.'
      
      console.log(`❌ Rate limit exceeded!`)
      console.log(`   Error: ${errorMessage}`)
      console.log(`   Reset time: ${resetTime}`)
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: errorMessage,
          resetTime: resetTime,
          remaining: rateLimitResult.remaining,
          quotaRemaining: rateLimitResult.quotaRemaining
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Reset': resetTime,
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            ...(rateLimitResult.quotaRemaining !== undefined && {
              'X-RateLimit-Quota-Remaining': rateLimitResult.quotaRemaining.toString()
            })
          }
        }
      )
    }

    console.log(`✅ Rate limit check passed, proceeding with request`)

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    return supportsToolCalling
      ? createToolCallingStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
