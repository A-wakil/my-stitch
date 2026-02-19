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
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const nextPath = searchParams.get('next')
        const intentRole = searchParams.get('intent_role')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.warn('Exchange code error:', error)
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change',
          })
          if (error) {
            console.warn('Verify OTP error:', error)
          }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setMessage('No session found. Please sign in.')
          return
        }

        const isValidRole = (value: unknown): value is 'customer' | 'tailor' | 'both' =>
          value === 'customer' || value === 'tailor' || value === 'both'

        const metadataRole = user.user_metadata?.roles

        const { data: profileData } = await supabase
          .from('profiles')
          .select('roles, firstname, lastname')
          .eq('id', user.id)
          .single()

        const resolvedRole =
          (isValidRole(profileData?.roles) && profileData.roles) ||
          (isValidRole(metadataRole) && metadataRole) ||
          (isValidRole(intentRole) && intentRole) ||
          'customer'

        const { data: updated } = await supabase
          .from('profiles')
          .update({
            roles: resolvedRole,
            email: user.email,
            firstname: user.user_metadata?.first_name || profileData?.firstname || 'User',
            lastname: user.user_metadata?.last_name || profileData?.lastname || null,
          })
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
              roles: resolvedRole,
            })
        }

        if (nextPath && nextPath.startsWith('/')) {
          router.replace(nextPath)
          return
        }

        if (resolvedRole === 'tailor' || resolvedRole === 'both') {
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
