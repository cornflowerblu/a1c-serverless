'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

type User = {
  id: string;
  name: string;
  email: string;
  // Add other fields as needed
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The `useUser()` hook is used to ensure that Clerk has loaded data about the signed in user
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/user')
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        
        const data = await response.json()
        setUsers(data.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isLoaded])

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4 text-center sm:text-left font-[family-name:var(--font-geist-sans)]">Users</h2>

      {loading && <p className="text-sm/6 tracking-[-.01em] font-[family-name:var(--font-geist-mono)]">Loading...</p>}
      
      {error && <p className="text-red-500 text-sm/6 tracking-[-.01em] font-[family-name:var(--font-geist-mono)]">Error: {error}</p>}

      {!loading && !error && users.length > 0 && (
        <ul className="space-y-3 text-sm/6 font-[family-name:var(--font-geist-mono)]">
          {users.map((user) => (
            <li key={user.id} className="p-3 bg-black/[.05] dark:bg-white/[.06] rounded-md">
              <p className="tracking-[-.01em]"><strong>Name:</strong> {user.name}</p>
              <p className="tracking-[-.01em]"><strong>Email:</strong> {user.email}</p>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && users.length === 0 && <p className="text-sm/6 tracking-[-.01em] font-[family-name:var(--font-geist-mono)]">No users found</p>}
    </div>
  )
}