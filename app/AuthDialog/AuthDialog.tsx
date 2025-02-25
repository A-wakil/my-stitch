'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import styles from './AuthDialog.module.css'
import { IoClose } from 'react-icons/io5'

interface AuthDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (email: string, password: string) => void
    onSignUp: (email: string, password: string, firstName: string, lastName: string) => void
    onGoogleSignIn: () => void
}

export function AuthDialog({ isOpen, onClose, onSubmit, onSignUp, onGoogleSignIn }: AuthDialogProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [errors, setErrors] = useState<{ 
        email?: string
        password?: string
        firstName?: string
        lastName?: string 
    }>({})
    const [isLoading, setIsLoading] = useState(false)

    const validateForm = () => {
        const newErrors: typeof errors = {}

        if (!email) {
            newErrors.email = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!password) {
            newErrors.password = 'Password is required'
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        if (isSignUp) {
            if (!firstName) newErrors.firstName = 'First name is required'
            if (!lastName) newErrors.lastName = 'Last name is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        try {
            setIsLoading(true)
            if (isSignUp) {
                await onSignUp(email, password, firstName, lastName)
            } else {
                await onSubmit(email, password)
            }
        } catch (error) {
            console.error('Auth error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true)
            await onGoogleSignIn()
        } catch (error) {
            console.error('Google sign-in error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (typeof window !== 'undefined') {
        if (isOpen) {
          document.body.style.overflow = 'hidden'
        } else {
          document.body.style.overflow = 'auto'
        }
    }

    return (
        <div className={`${styles.dialog} ${isOpen ? styles.open : ''}`} onClick={handleBackgroundClick}>
            <div className={`${styles.container} ${isSignUp ? styles.flipped : ''}`}>
                <div className={`${styles.card} ${isSignUp ? styles.signUp : styles.signIn}`}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>{!isSignUp ? 'Welcome back' : 'Create account'}</h1>
                        <p className={styles.subtitle}>
                            {!isSignUp
                                ? 'Enter your details to continue'
                                : 'Enter your details to create an account'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>Email</label>
                            <input
                                id="email"
                                type="email"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.email && <span className={styles.error}>{errors.email}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password" className={styles.label}>Password</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.password && <span className={styles.error}>{errors.password}</span>}
                        </div>

                        {isSignUp && (
                            <>
                                <div className={styles.formGroup}>
                                    <label htmlFor="firstName" className={styles.label}>First Name</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        className={styles.input}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="lastName" className={styles.label}>Last Name</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        className={styles.input}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
                                </div>
                            </>
                        )}

                        <button type="submit" className={styles.submitButton} disabled={isLoading}>
                            {isLoading && <Loader2 className={styles.loadingSpinner} size={16} />}
                            {!isSignUp ? 'Sign in' : 'Create account'}
                        </button>
                    </form>

                    {!isSignUp && (
                        <>
                            <div className={styles.divider}>
                                <span>or continue with</span>
                            </div>

                            <button
                                type="button"
                                className={styles.googleButton}
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18">
                                    <path
                                        fill="#4285F4"
                                        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.192 0 7.556 0 9s.348 2.808.957 4.039l3.007-2.332z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                                    />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}

                    <div className={styles.footer}>
                        {!isSignUp ? (
                            <>
                                Don't have an account?{' '}
                                <a href="#" onClick={() => setIsSignUp(true)}>Sign up</a>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <a href="#" onClick={() => setIsSignUp(false)}>Sign in</a>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

