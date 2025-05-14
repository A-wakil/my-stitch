'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { supabase } from '../../lib/supabaseClient'
import styles from './profile.module.css'
import { toast } from 'react-hot-toast'

interface AccountDetails {
    id: string;
    user_id: string;
    full_name: string;
    phone_number: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    email: string;
    created_at: string | null;
    updated_at: string | null;
}

export default function UserAccountDetails() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [accountDetails, setAccountDetails] = useState<AccountDetails>({
        id: '',
        user_id: '',
        full_name: '',
        phone_number: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        email: '',
        created_at: null,
        updated_at: null
    })

    // Fetch user details on component mount
    useEffect(() => {
        async function fetchUserDetails() {
            setIsLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    throw new Error('No user found')
                }

                const { data, error } = await supabase
                    .from('customer_details')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (error) {
                    throw error
                }

                if (data) {
                    setAccountDetails(data)
                } else {
                    // Initialize with empty default values
                    setAccountDetails({
                        id: '',
                        user_id: user.id,
                        full_name: '',
                        phone_number: '',
                        street_address: '',
                        city: '',
                        state: '',
                        postal_code: '',
                        country: '',
                        email: user.email || '', // Set from auth user
                        created_at: null,
                        updated_at: null
                    })
                }
            } catch (error: any) {
                console.error('Error fetching user details:', error.message || error)
                toast.error('Failed to load account details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserDetails()
    }, [])

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
            
            if (!user) {
                throw new Error('No user found')
            }

            // Remove id field when saving as it's auto-generated
            const { id, created_at, updated_at, ...dataToSave } = accountDetails;

            // Check if account details already exist
            const { data: existingData } = await supabase
                .from('customer_details')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingData) {
                // Update existing record
                const { error } = await supabase
                    .from('customer_details')
                    .update(dataToSave)
                    .eq('user_id', user.id)

                if (error) throw error
            } else {
                // Insert new record
                const { error } = await supabase
                    .from('customer_details')
                    .insert([{ ...dataToSave, user_id: user.id }])

                if (error) throw error
            }

            toast.success('Profile updated successfully')
        } catch (error: any) {
            console.error('Error saving profile:', error.message || error)
            toast.error('Failed to update profile')
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
