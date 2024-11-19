// components/admin/AdminLink.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

export const AdminLink = () => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/check-admin')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])

  if (!isAdmin) return null

  return (
    <Link
      href="/admin"
      className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Administration
    </Link>
  )
}

// hooks/useAdmin.ts
import { useEffect, useState } from 'react'

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/check-admin')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkAdmin()
  }, [])

  return { isAdmin, isLoading }
}

// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { User } from '@supabase/auth-helpers-nextjs'

type AuthContextType = {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabaseClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const res = await fetch('/api/check-admin')
          const data = await res.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)