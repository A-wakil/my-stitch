'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { Loader2 } from 'lucide-react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  
  const router = useRouter()

  useEffect(() => {
    // Handle the auth callback from the email link
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        toast.error('Invalid or expired reset link')
        router.push('/')
        return
      }

      if (!data.session) {
        toast.error('Invalid or expired reset link')
        router.push('/')
        return
      }
    }

    handleAuthCallback()
  }, [router])

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {}

    if (!password) newErrors.password = 'Password is required'
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      
      // Sign out and redirect to home
      await supabase.auth.signOut()
      router.push('/')
      
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Reset Your Password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '3rem',
                  border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                {errors.password}
              </span>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '3rem',
                  border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isLoading ? '#9ca3af' : '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
} 