'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Finalizing your account...')

  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setMessage('We could not confirm your email. Please try signing in.')
            return
          }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setMessage('No session found. Please sign in.')
          return
        }

        const role = (user.user_metadata?.roles as string) || 'customer'

        const { data: updated } = await supabase
          .from('profiles')
          .update({ roles: role })
          .eq('id', user.id)
          .select('id')

        if (!updated || updated.length === 0) {
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              firstname: user.user_metadata?.first_name || 'User',
              lastname: user.user_metadata?.last_name || null,
              roles: role,
            })
        }

        if (role === 'tailor' || role === 'both') {
          router.replace('/tailor')
          return
        }

        router.replace('/')
      } catch (error) {
        console.error('Auth callback error:', error)
        setMessage('We could not finish signing you in. Please try again.')
      }
    }

    finalizeAuth()
  }, [router, searchParams])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>{message}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Finalizing your account...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
