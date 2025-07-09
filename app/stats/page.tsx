'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Activity,
    BarChart3,
    Clock,
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return '7 Days'
      case '30d': return '30 Days'
      default: return '24 Hours'
    }
  }

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
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Statistics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time usage statistics from Redis
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchStats}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex space-x-2 mb-6">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </Button>
          ))}
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="flex items-center space-x-2 mt-2">
                <UserCheck className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">
                  {stats?.userTypes.authenticated || 0} authenticated
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <UserX className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-muted-foreground">
                  {stats?.userTypes.anonymous || 0} anonymous
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground">
                Last {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Requests/Hour</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.hourlyRequests.length 
                  ? Math.round(stats.totalRequests / stats.hourlyRequests.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Period</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTimeRangeLabel()}</div>
              <p className="text-xs text-muted-foreground">
                Time range selected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Hourly Requests Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Hourly Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto custom-scrollbar">
                {stats?.hourlyRequests && stats.hourlyRequests.length > 0 ? (
                  <div className="space-y-2 pr-2">
                    {stats.hourlyRequests.map((hour, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm text-muted-foreground min-w-[60px]">
                          {formatTime(hour.hour)}
                        </span>
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, (hour.count / Math.max(...stats.hourlyRequests.map(h => h.count))) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {hour.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No hourly data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily Requests Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Daily Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto custom-scrollbar">
                {stats?.dailyRequests && stats.dailyRequests.length > 0 ? (
                  <div className="space-y-2 pr-2">
                    {stats.dailyRequests.map((day, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm text-muted-foreground min-w-[60px]">
                          {formatDate(day.date)}
                        </span>
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, (day.count / Math.max(...stats.dailyRequests.map(d => d.count))) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {day.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No daily data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Models Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Popular Models</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topModels && stats.topModels.length > 0 ? (
              <div className="space-y-2">
                {stats.topModels.map((model, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{model.model}</span>
                    <Badge variant="secondary">{model.count} requests</Badge>
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