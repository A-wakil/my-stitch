'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type ProfileForm = {
  firstName: string
  lastName: string
  role: 'customer' | 'tailor'
}

const isValidRole = (value: unknown): value is 'customer' | 'tailor' | 'both' =>
  value === 'customer' || value === 'tailor' || value === 'both'

function normalizeRole(value: unknown): 'customer' | 'tailor' {
  return value === 'tailor' ? 'tailor' : 'customer'
}

function needsProfileCompletion(firstname: string | null | undefined, lastname: string | null | undefined, role: unknown) {
  const hasValidFirstName = Boolean(firstname && firstname.trim() && firstname.trim().toLowerCase() !== 'user')
  const hasValidLastName = Boolean(lastname && lastname.trim())
  const hasValidRole = role === 'customer' || role === 'tailor'
  return !hasValidFirstName || !hasValidLastName || !hasValidRole
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Finalizing your account...')
  const [isCompletingProfile, setIsCompletingProfile] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState('/')
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    role: 'customer',
  })

  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        const oauthError = searchParams.get('error')
        const oauthErrorDescription = searchParams.get('error_description')
        if (oauthError) {
          setMessage(oauthErrorDescription || 'We could not complete Google sign in. Please try again.')
          return
        }

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

        const metadataRole = user.user_metadata?.roles
        const metadataFirstName = user.user_metadata?.first_name
        const metadataLastName = user.user_metadata?.last_name

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

        const finalRole = normalizeRole(resolvedRole)
        const targetPath =
          nextPath && nextPath.startsWith('/')
            ? nextPath
            : finalRole === 'tailor'
              ? '/tailor'
              : '/'

        const firstNameValue = user.user_metadata?.first_name || profileData?.firstname || ''
        const lastNameValue = user.user_metadata?.last_name || profileData?.lastname || ''
        const roleValue = normalizeRole(profileData?.roles || metadataRole || intentRole || resolvedRole)
        const shouldForceGoogleCompletion =
          Boolean(intentRole) &&
          (!isValidRole(metadataRole) || !metadataFirstName || !metadataLastName)

        if (needsProfileCompletion(firstNameValue, lastNameValue, roleValue) || shouldForceGoogleCompletion) {
          setProfileForm({
            firstName: firstNameValue && firstNameValue.toLowerCase() !== 'user' ? firstNameValue : '',
            lastName: lastNameValue || '',
            role: roleValue,
          })
          setPendingRedirect(targetPath)
          setIsCompletingProfile(true)
          setMessage('Please complete your profile to continue.')
          return
        }

        router.replace(targetPath)
      } catch (error) {
        console.error('Auth callback error:', error)
        setMessage('We could not finish signing you in. Please try again.')
      }
    }

    finalizeAuth()
  }, [router, searchParams])

  const handleCompleteProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    const firstName = profileForm.firstName.trim()
    const lastName = profileForm.lastName.trim()
    const role = profileForm.role

    if (!firstName || !lastName) {
      setFormError('First name and last name are required.')
      return
    }

    setIsSavingProfile(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        setFormError('Session expired. Please sign in again.')
        setIsSavingProfile(false)
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          firstname: firstName,
          lastname: lastName,
          roles: role,
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          first_name: firstName,
          last_name: lastName,
          roles: role,
        },
      })

      setIsCompletingProfile(false)
      router.replace(role === 'tailor' && pendingRedirect === '/' ? '/tailor' : pendingRedirect)
    } catch (error) {
      console.error('Profile completion error:', error)
      setFormError('We could not save your profile. Please try again.')
      setIsSavingProfile(false)
    }
  }

  return (
    <>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <p>{message}</p>
      </div>
      {isCompletingProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#fff',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#111' }}>Complete your profile</h2>
            <p style={{ margin: '0 0 1rem', color: '#666' }}>
              We need your details before you continue.
            </p>
            <form onSubmit={handleCompleteProfile} style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.9rem', color: '#333' }}>
                First name
                <input
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  disabled={isSavingProfile}
                  placeholder="First name"
                  style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.65rem 0.75rem' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.9rem', color: '#333' }}>
                Last name
                <input
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  disabled={isSavingProfile}
                  placeholder="Last name"
                  style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.65rem 0.75rem' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.9rem', color: '#333' }}>
                Role
                <select
                  value={profileForm.role}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, role: e.target.value as 'customer' | 'tailor' }))}
                  disabled={isSavingProfile}
                  style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.65rem 0.75rem', background: '#fff' }}
                >
                  <option value="customer">Customer</option>
                  <option value="tailor">Tailor</option>
                </select>
              </label>
              {formError && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.86rem' }}>{formError}</p>}
              <button
                type="submit"
                disabled={isSavingProfile}
                style={{
                  marginTop: '0.25rem',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '0.75rem 1rem',
                  cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                  opacity: isSavingProfile ? 0.7 : 1,
                  fontWeight: 600,
                }}
              >
                {isSavingProfile ? 'Saving...' : 'Save and Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
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
