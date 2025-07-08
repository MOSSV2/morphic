'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function DebugPage() {
  const [modelId, setModelId] = useState('gpt-4o-mini')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkUserCalls = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/user-calls?modelId=${modelId}`)
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.message || 'Failed to check user calls')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Rate Limit Debug</h1>
          <p className="text-gray-600">
            Check your current call count and rate limit status.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Check User Calls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID</Label>
              <Input
                id="modelId"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g., gpt-4o-mini"
              />
            </div>

            <Button 
              onClick={checkUserCalls} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Check Call Count
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 p-3 bg-red-50 rounded">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-4 bg-green-50 rounded">
                <h3 className="font-semibold text-green-800 mb-2">Debug Information</h3>
                <pre className="text-sm text-green-700 bg-green-100 p-3 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <p className="text-sm text-green-600 mt-2">
                  Check the console for detailed call count information.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Enter a model ID (e.g., gpt-4o-mini, gpt-4o, claude-3-5-sonnet)</li>
              <li>Click "Check Call Count" to see your current usage</li>
              <li>Check the browser console for detailed debug information</li>
              <li>Make some API calls and check again to see the count increase</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span><strong>Anonymous users:</strong> 10 requests per hour (all models combined)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span><strong>Authenticated users:</strong> 10 requests per hour (all models combined), 50 requests lifetime quota</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 