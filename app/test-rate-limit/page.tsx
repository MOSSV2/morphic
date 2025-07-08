import { UsageStats } from '@/components/usage-stats'

export default function TestRateLimitPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Rate Limit Test Page</h1>
          <p className="text-gray-600">
            This page shows the current usage statistics for different models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageStats modelId="gpt-4o-mini" />
          <UsageStats modelId="gpt-4o" />
          <UsageStats modelId="claude-3-5-sonnet" />
          <UsageStats modelId="gemini-2.0-flash" />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Rate Limit Rules</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span><strong>Anonymous users:</strong> 10 requests per hour (all models combined)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span><strong>Authenticated users:</strong> 10 requests per hour per model, 50 total requests per hour</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span><strong>Reset time:</strong> Every hour from the first request</span>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Testing Instructions</h2>
          <ol className="space-y-2 text-sm list-decimal list-inside">
            <li>Try making multiple requests to see the rate limit in action</li>
            <li>Sign up/log in to test authenticated user limits</li>
            <li>Switch between different models to see model-specific limits</li>
            <li>Check the usage statistics to monitor your current usage</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 