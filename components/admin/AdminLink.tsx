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

export default AdminLink