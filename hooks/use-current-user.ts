import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUser = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await createClient().auth.getSession()
      if (error) {
        console.error(error)
      }
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    fetchUser()

    // Listen for auth changes
    const { data: { subscription } } = createClient().auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, isAuthenticated: !!user }
} 