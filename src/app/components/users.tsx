'use client'
import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export default function UserList() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  // The `useUser()` hook is used to ensure that Clerk has loaded data about the signed in user
  const { user } = useUser()
  // The `useSession()` hook is used to get the Clerk session object
  // The session object is used to get the Clerk session token
  const { session } = useSession()

  // Create a custom Supabase client that injects the Clerk session token into the request headers
  function createClerkSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        async accessToken() {
          return session?.getToken() ?? null
        },
      },
    )
  }

  // Create a `client` object for accessing Supabase data using the Clerk token
  const client = createClerkSupabaseClient()

  // This `useEffect` will wait for the User object to be loaded before requesting
  // the tasks for the signed in user
  useEffect(() => {
    if (!user) return

    async function loadUsers() {
      setLoading(true)
      const { data, error } = await client.from('users').select()
      if (!error) setUsers(data)
      setLoading(false)
    }

    loadUsers()
  }, [user])

  return (
    <div>
      <h1>Useres</h1>

      {loading && <p>Loading...</p>}

      {!loading && users.length > 0 && <p>{users}</p>}

      {!loading && users.length === 0 && <p>No users found</p>}

    
    </div>
  )
}