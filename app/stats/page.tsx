'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DailyRequestsChart } from '@/components/daily-requests-chart'
import { HourlyRequestsChart } from '@/components/hourly-requests-chart'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Clock,
  Cpu,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  UserX
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface StatsData {
  totalUsers: number
  totalRequests: number
  hourlyRequests: Array<{ hour: string; count: number }>
  dailyRequests: Array<{ date: string; count: number }>
  topModels: Array<{ model: string; count: number }>
  userTypes: {
    authenticated: number
    anonymous: number
  }
}

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/stats?range=${timeRange}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setStats(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d':
        return '7 Days'
      case '30d':
        return '30 Days'
      default:
        return '24 Hours'
    }
  }

  const totalModelRequests = stats?.topModels.reduce((sum, model) => sum + model.count, 0) || 0

  if (loading && !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading statistics...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4">Error loading statistics</div>
            <Button onClick={fetchStats} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Statistics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time usage statistics from Redis
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Button
              onClick={fetchStats}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </header>

        <div className="flex space-x-2 mb-6">
          {(['24h', '7d', '30d'] as const).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="px-4"
            >
              {range === '24h'
                ? '24 Hours'
                : range === '7d'
                ? '7 Days'
                : '30 Days'}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalUsers || 0}
              </div>
              <div className="flex flex-col text-xs text-muted-foreground mt-1 space-y-1">
                <div className="flex items-center">
                  <UserCheck className="h-3 w-3 mr-1 text-green-500" />
                  <span>{stats?.userTypes.authenticated || 0} authenticated</span>
                </div>
                <div className="flex items-center">
                  <UserX className="h-3 w-3 mr-1 text-orange-500" />
                  <span>{stats?.userTypes.anonymous || 0} anonymous</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                in the last {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Requests/Hour
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.hourlyRequests.length
                  ? Math.round(stats.totalRequests / stats.hourlyRequests.length)
                  : 0}
              </div>
               <p className="text-xs text-muted-foreground mt-1">
                based on {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Period
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTimeRangeLabel()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Time range selected
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-3">
            <HourlyRequestsChart data={stats?.hourlyRequests || []} />
          </div>
          <div className="lg:col-span-2">
            <DailyRequestsChart data={stats?.dailyRequests || []} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="h-5 w-5 mr-2" />
              Popular Models
            </CardTitle>
             <p className="text-sm text-muted-foreground pt-1">
              Model usage based on the selected time range.
            </p>
          </CardHeader>
          <CardContent>
            {stats?.topModels && stats.topModels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {stats.topModels.map((model, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium truncate pr-2">{model.model}</span>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {model.count} requests
                      </Badge>
                    </div>
                    <Progress
                      value={(model.count / totalModelRequests) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No model usage data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 