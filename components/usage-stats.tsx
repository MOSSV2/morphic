'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getEffectiveRateLimit } from '@/lib/config/rate-limits'
import { AlertCircle, BarChart3, Clock, User, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UsageStats {
  userId: string
  modelId: string
  isAuthenticated: boolean
  totalRequests: number
  remainingRequests: number
  resetTime: string
  totalRequestsAll?: number
  remainingRequestsTotal?: number
}

interface UsageStatsProps {
  modelId?: string
  className?: string
}

export function UsageStats({ modelId = 'gpt-4o-mini', className }: UsageStatsProps) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/usage?modelId=${modelId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch usage stats')
        }
        
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [modelId])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span className="text-sm text-gray-600">Loading usage stats...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load usage stats</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const config = getEffectiveRateLimit(stats.isAuthenticated ? 'authenticated' : 'anonymous')
  const usedPercentage = ((stats.totalRequests / config.maxRequests) * 100)
  const timeUntilReset = new Date(stats.resetTime).getTime() - Date.now()
  const hoursUntilReset = Math.max(0, Math.floor(timeUntilReset / (1000 * 60 * 60)))
  const minutesUntilReset = Math.max(0, Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)))

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <span>Usage Statistics</span>
          <Badge variant="outline" className="text-xs">
            {modelId}
          </Badge>
          <Badge variant={stats.isAuthenticated ? "default" : "secondary"} className="text-xs">
            {stats.isAuthenticated ? (
              <>
                <UserCheck className="h-3 w-3 mr-1" />
                Registered
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Guest
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {stats.isAuthenticated ? 'Model Requests' : 'Requests Used'}
            </span>
            <span className="font-medium">
              {stats.totalRequests} / {config.maxRequests}
            </span>
          </div>
          <Progress value={usedPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Remaining: {stats.remainingRequests}</span>
            <span>{usedPercentage.toFixed(1)}% used</span>
          </div>
        </div>

        {stats.isAuthenticated && stats.totalRequestsAll !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Requests (All Models)</span>
              <span className="font-medium">
                {stats.totalRequestsAll} / 50
              </span>
            </div>
            <Progress value={((stats.totalRequestsAll / 50) * 100)} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Remaining: {stats.remainingRequestsTotal || 0}</span>
              <span>{((stats.totalRequestsAll / 50) * 100).toFixed(1)}% used</span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>
            Resets in {hoursUntilReset}h {minutesUntilReset}m
          </span>
        </div>

        {stats.remainingRequests <= 2 && (
          <div className="flex items-center space-x-2 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>
              {stats.isAuthenticated 
                ? 'You\'re approaching the rate limit'
                : 'You\'re approaching the limit. Sign up for more requests!'
              }
            </span>
          </div>
        )}

        {!stats.isAuthenticated && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            💡 Sign up to get 10 requests per model and 50 total requests per hour!
          </div>
        )}
      </CardContent>
    </Card>
  )
} 