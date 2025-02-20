'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { supabase } from '../../lib/supabaseClient'
import styles from './profile.module.css'
import { AccountDetails } from '../../lib/types'
import { toast } from 'react-hot-toast'

export default function UserAccountDetails() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [accountDetails, setAccountDetails] = useState<Partial<AccountDetails>>({
        full_name: '',
        email: '',
        phone_number: '',
        card_number: '',
        expiration_date: '',
        cvv: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        language: 'en',
        currency: 'usd',
        email_notifications: true,
        sms_notifications: true,
    })

    // Fetch user details on component mount
    useEffect(() => {
        fetchUserDetails()
    }, [])

    const fetchUserDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            const { data, error } = await supabase
                .from('account_details')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error) throw error

            if (data) {
                setAccountDetails(data)
            }
            
        } catch (error) {
            console.error('Error fetching user details:', error)
            toast.error('Failed to load account details')
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (field: keyof AccountDetails, value: any) => {
        setAccountDetails(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            // Check if user already has account details
            const { data: existingData } = await supabase
                .from('account_details')
                .select('id')
                .eq('user_id', user.id)
                .single()

            let error
            if (existingData) {
                // Update existing record
                ({ error } = await supabase
                    .from('account_details')
                    .update({
                        ...accountDetails,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id))
            } else {
                // Insert new record
                ({ error } = await supabase
                    .from('account_details')
                    .insert({
                        ...accountDetails,
                        user_id: user.id
                    }))
            }

            if (error) throw error

            toast.success('Account details saved successfully')
        } catch (error) {
            console.error('Error saving account details:', error)
            toast.error('Failed to save account details')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className={styles.loading}>Loading...</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <IoArrowBack size={24} />
                    <span>Back</span>
                </button>
                <h1 className={styles.title}>Account Details</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.gridContainer}>
                    {/* Left Column */}
                    <div className={styles.column}>
                        {/* Personal Information Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Personal Information</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Full Name
                                    <input
                                        type="text"
                                        value={accountDetails.full_name || ''}
                                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <label className={styles.label}>
                                    Email
                                    <input
                                        type="email"
                                        value={accountDetails.email || ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <label className={styles.label}>
                                    Phone Number
                                    <input
                                        type="tel"
                                        value={accountDetails.phone_number || ''}
                                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Payment Details Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Payment Details</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Card Number
                                    <input
                                        type="text"
                                        value={accountDetails.card_number || ''}
                                        onChange={(e) => handleInputChange('card_number', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        Expiration Date
                                        <input
                                            type="text"
                                            value={accountDetails.expiration_date || ''}
                                            onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                    <label className={styles.label}>
                                        CVV
                                        <input
                                            type="text"
                                            value={accountDetails.cvv || ''}
                                            onChange={(e) => handleInputChange('cvv', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className={styles.column}>
                        {/* Address Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Address</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Street Address
                                    <input
                                        type="text"
                                        value={accountDetails.street_address || ''}
                                        onChange={(e) => handleInputChange('street_address', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        City
                                        <input
                                            type="text"
                                            value={accountDetails.city || ''}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                    <label className={styles.label}>
                                        State
                                        <input
                                            type="text"
                                            value={accountDetails.state || ''}
                                            onChange={(e) => handleInputChange('state', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                </div>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        Postal Code
                                        <input
                                            type="text"
                                            value={accountDetails.postal_code || ''}
                                            onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                    <label className={styles.label}>
                                        Country
                                        <input
                                            type="text"
                                            value={accountDetails.country || ''}
                                            onChange={(e) => handleInputChange('country', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Preferences Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Preferences</h2>
                            <div className={styles.form}>
                                <div className={styles.settingsGroup}>
                                    <div className={styles.formRow}>
                                        <label className={styles.label}>
                                            Language
                                            <select
                                                value={accountDetails.language}
                                                onChange={(e) => handleInputChange('language', e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="en">English</option>
                                                <option value="es">Español</option>
                                            </select>
                                        </label>
                                        <label className={styles.label}>
                                            Currency
                                            <select
                                                value={accountDetails.currency}
                                                onChange={(e) => handleInputChange('currency', e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="usd">USD</option>
                                                <option value="eur">EUR</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.settingsGroup}>
                                    <h3 className={styles.subsectionTitle}>Notifications</h3>
                                    <div className={styles.checkboxContainer}>
                                        <div className={styles.checkboxGroup}>
                                            <input
                                                type="checkbox"
                                                id="emailNotifications"
                                                checked={accountDetails.email_notifications}
                                                onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                                                className={styles.checkbox}
                                            />
                                            <label htmlFor="emailNotifications" className={styles.checkboxLabel}>
                                                Email Notifications
                                            </label>
                                        </div>
                                        <div className={styles.checkboxGroup}>
                                            <input
                                                type="checkbox"
                                                id="smsNotifications"
                                                checked={accountDetails.sms_notifications}
                                                onChange={(e) => handleInputChange('sms_notifications', e.target.checked)}
                                                className={styles.checkbox}
                                            />
                                            <label htmlFor="smsNotifications" className={styles.checkboxLabel}>
                                                SMS Notifications
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className={styles.buttonContainer}>
                    <button type="submit" className={styles.saveButton} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}
