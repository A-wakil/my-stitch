'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './admin.module.css'
import { isAdminEmail } from '../lib/admin'
import { formatCurrency } from '../lib/services/currencyService'
import { CurrencyCode } from '../lib/types'

type AdminTab = 'tailors' | 'designs' | 'orders'
type TailorFilter = 'all' | 'pending' | 'approved'
type DesignFilter = 'all' | 'pending' | 'approved' | 'rejected'

type Tailor = {
  id: string
  brand_name: string | null
  tailor_name: string | null
  email: string | null
  is_approved: boolean | null
  created_at: string
  logo_url?: string | null
  banner_image_url?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  bio?: string | null
  experience?: string | null
  specializations?: string[] | null
}

type Design = {
  id: string
  title: string
  created_by: string
  approval_status: 'pending' | 'approved' | 'rejected' | null
  rejection_reason: string | null
  created_at: string
  description?: string | null
  images?: string[] | null
  videos?: string[] | null
  price?: number | null
  currency_code?: CurrencyCode | null
}

type Order = {
  id: string
  created_at: string
  status: string
  total_amount: number
  user_id: string
  tailor_id: string
}

type Profile = {
  id: string
  firstname?: string | null
  lastname?: string | null
  email?: string | null
}

type TailorMap = Record<string, Tailor>
type ProfileMap = Record<string, Profile>

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('tailors')
  const [tailorFilter, setTailorFilter] = useState<TailorFilter>('pending')
  const [designFilter, setDesignFilter] = useState<DesignFilter>('pending')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tailors, setTailors] = useState<Tailor[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tailorMap, setTailorMap] = useState<TailorMap>({})
  const [profileMap, setProfileMap] = useState<ProfileMap>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [adminError, setAdminError] = useState<string | null>(null)

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email ?? null
    setUserEmail(email)
    setIsAuthorized(isAdminEmail(email))
  }

  const fetchTailors = async () => {
    setAdminError(null)
    const { data, error } = await supabase
      .from('tailor_details')
      .select('id, brand_name, tailor_name, email, is_approved, created_at, logo_url, banner_image_url, phone, address, website, bio, experience, specializations')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tailors:', error)
      setAdminError('Failed to load tailors. Please try again.')
      return
    }
    setTailors(data || [])
    const nextMap: TailorMap = {}
    ;(data || []).forEach((tailor) => {
      nextMap[tailor.id] = tailor
    })
    setTailorMap(nextMap)
  }

  const fetchDesigns = async () => {
    setAdminError(null)
    const { data, error } = await supabase
      .from('designs')
      .select('id, title, created_by, approval_status, rejection_reason, created_at, description, images, videos, price, currency_code')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching designs:', error)
      setAdminError('Failed to load designs. Please try again.')
      return
    }
    setDesigns(data || [])

    const creatorIds = Array.from(new Set((data || []).map((item) => item.created_by)))
    if (!creatorIds.length) return

    const { data: tailorsData, error: tailorsError } = await supabase
      .from('tailor_details')
      .select('id, brand_name, tailor_name, email, is_approved, created_at, logo_url, banner_image_url, phone, address, website, bio, experience, specializations')
      .in('id', creatorIds)

    if (tailorsError) {
      console.error('Error fetching design tailors:', tailorsError)
      return
    }

    const nextMap: TailorMap = {}
    ;(tailorsData || []).forEach((tailor) => {
      nextMap[tailor.id] = tailor
    })
    setTailorMap((prev) => ({ ...prev, ...nextMap }))
  }

  const fetchOrders = async () => {
    setAdminError(null)
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, status, total_amount, user_id, tailor_id')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      setAdminError('Failed to load orders. Please try again.')
      return
    }

    setOrders(data || [])

    const userIds = Array.from(new Set((data || []).map((item) => item.user_id)))
    const tailorIds = Array.from(new Set((data || []).map((item) => item.tailor_id)))

    if (userIds.length) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, email')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else {
        const nextProfiles: ProfileMap = {}
        ;(profiles || []).forEach((profile) => {
          nextProfiles[profile.id] = profile
        })
        setProfileMap(nextProfiles)
      }
    }

    if (tailorIds.length) {
      const { data: tailorsData, error: tailorsError } = await supabase
        .from('tailor_details')
        .select('id, brand_name, tailor_name, email, is_approved, created_at, logo_url, banner_image_url, phone, address, website, bio, experience, specializations')
        .in('id', tailorIds)

      if (tailorsError) {
        console.error('Error fetching order tailors:', tailorsError)
      } else {
        const nextTailors: TailorMap = {}
        ;(tailorsData || []).forEach((tailor) => {
          nextTailors[tailor.id] = tailor
        })
        setTailorMap((prev) => ({ ...prev, ...nextTailors }))
      }
    }
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchCurrentUser()
      if (isAdminEmail((await supabase.auth.getUser()).data.user?.email ?? null)) {
        await Promise.all([fetchTailors(), fetchDesigns()])
      }
      setIsLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!isAuthorized) return
    if (activeTab === 'orders') {
      fetchOrders()
    }
  }, [activeTab, isAuthorized])

  const sendAdminNotification = async (payload: Record<string, any>) => {
    try {
      console.log('[ADMIN] Sending notification:', payload.type, 'to:', payload.recipientEmail)
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      console.log('[ADMIN] Notification response:', result)
      if (!response.ok) {
        console.error('[ADMIN] Notification failed:', result.error)
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error)
    }
  }

  const handleApproveTailor = async (tailorId: string) => {
    if (!userEmail) return
    setAdminError(null)
    const { data, error } = await supabase
      .from('tailor_details')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: userEmail
      })
      .eq('id', tailorId)
      .select('id, is_approved')

    if (error) {
      console.error('Error approving tailor:', error)
      setAdminError('Failed to approve tailor. Please check permissions.')
      return
    }

    if (!data || data.length === 0) {
      setAdminError('Approval did not persist. Check row-level security policies for tailor_details.')
      return
    }

    setTailors((prev) =>
      prev.map((tailor) =>
        tailor.id === tailorId ? { ...tailor, is_approved: true } : tailor
      )
    )
    await fetchTailors()

    const tailor = tailorMap[tailorId]
    let recipientEmail = tailor?.email || null
    let recipientName = tailor?.tailor_name || tailor?.brand_name || 'Tailor'

    if (!recipientEmail) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, firstname, lastname')
        .eq('id', tailorId)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to fetch tailor profile email:', profileError)
      } else {
        recipientEmail = profile?.email ?? null
        const fullName = `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
        if (fullName) {
          recipientName = fullName
        }
      }
    }

    if (recipientEmail) {
      sendAdminNotification({
        type: 'tailor_approved',
        recipientEmail,
        recipientName,
        referenceId: tailorId
      })
    }
  }

  const handleApproveDesign = async (designId: string) => {
    if (!userEmail) return
    const { error } = await supabase
      .from('designs')
      .update({
        approval_status: 'approved',
        rejection_reason: null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userEmail
      })
      .eq('id', designId)

    if (error) {
      console.error('Error approving design:', error)
      return
    }

    setDesigns((prev) =>
      prev.map((design) =>
        design.id === designId
          ? { ...design, approval_status: 'approved', rejection_reason: null }
          : design
      )
    )

    const design = designs.find((item) => item.id === designId)
    const tailor = design ? tailorMap[design.created_by] : null
    let recipientEmail = tailor?.email || null
    let recipientName = tailor?.tailor_name || tailor?.brand_name || 'Tailor'

    if (!recipientEmail && design?.created_by) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, firstname, lastname')
        .eq('id', design.created_by)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to fetch tailor profile email:', profileError)
      } else {
        recipientEmail = profile?.email ?? null
        const fullName = `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
        if (fullName) {
          recipientName = fullName
        }
      }
    }

    if (recipientEmail) {
      sendAdminNotification({
        type: 'design_approved',
        recipientEmail,
        recipientName,
        referenceId: designId,
        additionalData: { designTitle: design?.title }
      })
    } else {
      setAdminError('Design approved, but no email found for the tailor.')
    }
  }

  const handleRejectDesign = async (designId: string) => {
    if (!userEmail) return
    const reason = rejectionReasons[designId]?.trim()
    if (!reason) return

    const { error } = await supabase
      .from('designs')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userEmail
      })
      .eq('id', designId)

    if (error) {
      console.error('Error rejecting design:', error)
      return
    }

    setDesigns((prev) =>
      prev.map((design) =>
        design.id === designId
          ? { ...design, approval_status: 'rejected', rejection_reason: reason }
          : design
      )
    )

    const design = designs.find((item) => item.id === designId)
    const tailor = design ? tailorMap[design.created_by] : null
    let recipientEmail = tailor?.email || null
    let recipientName = tailor?.tailor_name || tailor?.brand_name || 'Tailor'

    if (!recipientEmail && design?.created_by) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, firstname, lastname')
        .eq('id', design.created_by)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to fetch tailor profile email:', profileError)
      } else {
        recipientEmail = profile?.email ?? null
        const fullName = `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
        if (fullName) {
          recipientName = fullName
        }
      }
    }

    if (recipientEmail) {
      sendAdminNotification({
        type: 'design_rejected',
        recipientEmail,
        recipientName,
        referenceId: designId,
        additionalData: {
          designTitle: design?.title,
          reason
        }
      })
    } else {
      setAdminError('Design rejected, but no email found for the tailor.')
    }
  }

  const summary = useMemo(() => ({
    pendingTailors: tailors.filter((tailor) => !tailor.is_approved).length,
    pendingDesigns: designs.filter((design) => !design.approval_status || design.approval_status === 'pending').length
  }), [tailors, designs])

  const filteredTailors = useMemo(() => {
    if (tailorFilter === 'approved') {
      return tailors.filter((tailor) => !!tailor.is_approved)
    }
    if (tailorFilter === 'pending') {
      return tailors.filter((tailor) => !tailor.is_approved)
    }
    return tailors
  }, [tailors, tailorFilter])

  const filteredDesigns = useMemo(() => {
    if (designFilter === 'approved') {
      return designs.filter((design) => design.approval_status === 'approved')
    }
    if (designFilter === 'rejected') {
      return designs.filter((design) => design.approval_status === 'rejected')
    }
    if (designFilter === 'pending') {
      return designs.filter((design) => !design.approval_status || design.approval_status === 'pending')
    }
    return designs
  }, [designs, designFilter])

  if (isLoading) {
    return <div className={styles.center}>Loading...</div>
  }

  if (isAuthorized === false) {
    return (
      <div className={styles.center}>
        You do not have access to this page.
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Signed in as {userEmail}</p>
      </header>

      {adminError && <div className={styles.errorBanner}>{adminError}</div>}

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span>Pending Tailors</span>
          <strong>{summary.pendingTailors}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Pending Designs</span>
          <strong>{summary.pendingDesigns}</strong>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'tailors' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('tailors')}
        >
          Tailors
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'designs' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('designs')}
        >
          Designs
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'orders' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
      </div>

      {activeTab === 'tailors' && (
        <div className={styles.cardGrid}>
          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${tailorFilter === 'pending' ? styles.subTabActive : ''}`}
              onClick={() => setTailorFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`${styles.subTab} ${tailorFilter === 'approved' ? styles.subTabActive : ''}`}
              onClick={() => setTailorFilter('approved')}
            >
              Approved
            </button>
            <button
              className={`${styles.subTab} ${tailorFilter === 'all' ? styles.subTabActive : ''}`}
              onClick={() => setTailorFilter('all')}
            >
              All
            </button>
          </div>
          {filteredTailors.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No tailors found</h3>
              <p>There are no tailors in this view right now.</p>
            </div>
          ) : (
            filteredTailors.map((tailor) => (
              <div key={tailor.id} className={styles.tailorCard}>
                {tailor.banner_image_url && (
                  <div className={styles.banner}>
                    <img src={tailor.banner_image_url} alt={`${tailor.brand_name || 'Tailor'} banner`} />
                  </div>
                )}
                <div className={styles.tailorCardBody}>
                  <div className={styles.tailorHeader}>
                    <div className={styles.tailorAvatar}>
                      {tailor.logo_url ? (
                        <img src={tailor.logo_url} alt={`${tailor.brand_name || 'Tailor'} logo`} />
                      ) : (
                        <span>{(tailor.brand_name || tailor.tailor_name || 'T').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{tailor.brand_name || 'Unnamed Brand'}</strong>
                      <span className={styles.subtle}>{tailor.tailor_name || 'Tailor'}</span>
                      <span className={styles.subtle}>{tailor.email || '—'}</span>
                    </div>
                    <span className={tailor.is_approved ? styles.statusApproved : styles.statusPending}>
                      {tailor.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  {tailor.bio && <p className={styles.description}>{tailor.bio}</p>}
                  <div className={styles.detailGrid}>
                    <div>
                      <span className={styles.detailLabel}>Phone</span>
                      <span>{tailor.phone || '—'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Address</span>
                      <span>{tailor.address || '—'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Website</span>
                      <span>{tailor.website || '—'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Experience</span>
                      <span>{tailor.experience || '—'}</span>
                    </div>
                  </div>
                  {tailor.specializations && tailor.specializations.length > 0 && (
                    <div className={styles.tagRow}>
                      {tailor.specializations.map((spec) => (
                        <span key={spec} className={styles.tag}>
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionButton}
                      disabled={!!tailor.is_approved}
                      onClick={() => handleApproveTailor(tailor.id)}
                    >
                      Approve Tailor
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'designs' && (
        <div className={styles.cardGrid}>
          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${designFilter === 'pending' ? styles.subTabActive : ''}`}
              onClick={() => setDesignFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`${styles.subTab} ${designFilter === 'approved' ? styles.subTabActive : ''}`}
              onClick={() => setDesignFilter('approved')}
            >
              Approved
            </button>
            <button
              className={`${styles.subTab} ${designFilter === 'rejected' ? styles.subTabActive : ''}`}
              onClick={() => setDesignFilter('rejected')}
            >
              Rejected
            </button>
            <button
              className={`${styles.subTab} ${designFilter === 'all' ? styles.subTabActive : ''}`}
              onClick={() => setDesignFilter('all')}
            >
              All
            </button>
          </div>
          {filteredDesigns.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No designs found</h3>
              <p>There are no designs in this view right now.</p>
            </div>
          ) : (
            filteredDesigns.map((design) => {
              const tailor = tailorMap[design.created_by]
              const priceValue = typeof design.price === 'number' ? design.price : null
              const currencyCode = (design.currency_code || 'USD') as CurrencyCode
              return (
                <div key={design.id} className={styles.designCard}>
                  <div className={styles.mediaColumn}>
                    <div className={styles.mediaPrimary}>
                      {design.images?.[0] ? (
                        <img src={design.images[0]} alt={design.title} />
                      ) : (
                        <div className={styles.mediaPlaceholder}>No image</div>
                      )}
                    </div>
                    <div className={styles.mediaStrip}>
                      {design.images?.slice(1, 4).map((image, index) => (
                        <img key={index} src={image} alt={`${design.title} ${index + 2}`} />
                      ))}
                      {!!design.videos?.length && (
                        <span className={styles.mediaBadge}>
                          {design.videos.length} video{design.videos.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.designContent}>
                    <div className={styles.designHeader}>
                      <div>
                        <strong>{design.title}</strong>
                        <span className={styles.subtle}>Created {new Date(design.created_at).toLocaleDateString()}</span>
                      </div>
                      <span
                        className={
                          design.approval_status === 'approved'
                            ? styles.statusApproved
                            : design.approval_status === 'rejected'
                              ? styles.statusRejected
                              : styles.statusPending
                        }
                      >
                        {design.approval_status || 'pending'}
                      </span>
                    </div>
                    {design.description && <p className={styles.description}>{design.description}</p>}
                    <div className={styles.designMeta}>
                      <div>
                        <span className={styles.detailLabel}>Tailor</span>
                        <span>{tailor?.brand_name || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className={styles.detailLabel}>Price</span>
                        <span>
                          {priceValue !== null ? formatCurrency(priceValue, currencyCode) : '—'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.reviewControlsInline}>
                      <button
                        className={styles.approveButton}
                        onClick={() => handleApproveDesign(design.id)}
                      >
                        Approve
                      </button>
                      <input
                        className={styles.rejectInput}
                        placeholder="Rejection reason"
                        value={rejectionReasons[design.id] || ''}
                        onChange={(event) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [design.id]: event.target.value
                          }))
                        }
                      />
                      <button
                        className={styles.rejectButton}
                        onClick={() => handleRejectDesign(design.id)}
                        disabled={!rejectionReasons[design.id]?.trim()}
                      >
                        Reject
                      </button>
                    </div>
                    {design.rejection_reason && (
                      <p className={styles.rejectionNote}>Reason: {design.rejection_reason}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Order</span>
            <span>Customer</span>
            <span>Tailor</span>
            <span>Status</span>
            <span>Total</span>
          </div>
          {orders.map((order) => {
            const customer = profileMap[order.user_id]
            const tailor = tailorMap[order.tailor_id]
            return (
              <div key={order.id} className={styles.tableRow}>
                <div>
                  <strong>#{order.id.slice(0, 8)}</strong>
                  <span className={styles.subtle}>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <span>{customer?.email || '—'}</span>
                <span>{tailor?.brand_name || '—'}</span>
                <span>{order.status}</span>
                <span>${Number(order.total_amount || 0).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
