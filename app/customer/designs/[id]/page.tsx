'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import styles from './DesignDetail.module.css'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { CurrencyCode, Measurement } from '../../../lib/types'
import { IoArrowBack } from "react-icons/io5"
import { IoChevronDown, IoChevronUp } from "react-icons/io5"
import { IoInformationCircleOutline } from "react-icons/io5"
import { sendOrderNotification, notifyOrderParties } from '../../../lib/notifications'
import { IoPersonCircleOutline } from "react-icons/io5"
import { StarRating } from "../../../components/ui/StarRating"
import { useCurrency } from '../../../context/CurrencyContext'
import { useBag } from '../../../context/BagContext'
import { calculateCustomerPrice } from '../../../lib/pricing'

interface DesignDetail {
  id: string
  title: string
  description: string
  images: string[]
  videos?: string[]
  // Some existing designs may not have fabrics; fallback to price
  price?: number
  currency_code?: CurrencyCode
  fabrics?: Array<{
    name: string
    image: string
    totalPrice?: number
    price?: number // Keep backward compatibility
    colors: Array<{ name: string; image: string }>
  }>
  created_by: string
  brand_name: string
  completion_time: number
}

const designCache = new Map<string, DesignDetail>()
const designCacheKey = 'designs:cache'

type CachedDesignEntry = {
  design: DesignDetail
  brandName?: string
}

type MediaItem = {
  type: 'image' | 'video'
  url: string
  index: number
}

interface PaymentMethod {
  cardNumber: string;
  expirationDate: string;
}

interface OrderDetails {
  design: {
    title: string;
    fabrics: Array<{
      name: string;
      image?: string;
      price?: number;
      totalPrice?: number;
      colors: Array<{ name: string; image?: string }>;
    }>;
    brand_name: string;
    completion_time: number;
  };
  selectedFabric: number;
  selectedColor: number | null;
  shippingAddress: string;
  paymentMethod: string;
  total: number;
  measurement?: Measurement;
}

export default function DesignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { formatAmount, convertToPreferred, getExchangeRate } = useCurrency()

  // Unwrap the promise to get the actual params
  const { id } = use(params)

  const [design, setDesign] = useState<DesignDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [brandName, setBrandName] = useState<string>('')
  const [tailorId, setTailorId] = useState<string | null>(null)
  const router = useRouter()
  const [savedMeasurements, setSavedMeasurements] = useState<Measurement[]>([])
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | undefined>(undefined)
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true)
  const [showMeasurementDetails, setShowMeasurementDetails] = useState(false)
  const [tailorDetails, setTailorDetails] = useState<any>(null)
  const [showTailorProfile, setShowTailorProfile] = useState(false)
  const [tailorNotes, setTailorNotes] = useState<string>('')
  const [formattedTotalPrice, setFormattedTotalPrice] = useState<string>('')
  const [priceInUsdForBag, setPriceInUsdForBag] = useState<number>(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [designSequence, setDesignSequence] = useState<string[]>([])
  const [currentDesignIndex, setCurrentDesignIndex] = useState<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const [isMediaLoading, setIsMediaLoading] = useState(true)
  const [isDesignUnavailable, setIsDesignUnavailable] = useState(false)

  // Bag context
  const { addItem } = useBag()

  // Combine images and videos into a single media array
  const mediaItems = useMemo((): MediaItem[] => {
    if (!design) return []
    
    const items: MediaItem[] = []
    let currentIndex = 0
    
    // Add images first
    design.images.forEach((url) => {
      items.push({ type: 'image', url, index: currentIndex++ })
    })
    
    // Add videos
    design.videos?.forEach((url) => {
      items.push({ type: 'video', url, index: currentIndex++ })
    })
    
    return items
  }, [design])

  // Add effect to detect viewport size
  useEffect(() => {
    // Function to update state based on window width
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    async function fetchDesign() {
      setIsLoading(true)

      const cached = designCache.get(id)
      if (cached) {
        if (cached.approval_status && cached.approval_status !== 'approved') {
          setIsDesignUnavailable(true)
          setIsLoading(false)
          return
        }
        setDesign(cached)
        setTailorId(cached.created_by)
        setIsLoading(false)
        return
      }

      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`${designCacheKey}:${id}`)
        if (stored) {
          try {
            const parsed: CachedDesignEntry = JSON.parse(stored)
            if (parsed?.design?.id === id) {
              designCache.set(id, parsed.design)
              setDesign(parsed.design)
              setTailorId(parsed.design.created_by)
              if (parsed.brandName) {
                setBrandName(parsed.brandName)
              }
              setIsLoading(false)
              return
            }
          } catch (error) {
            console.error('Failed to parse design cache entry:', error)
          }
        }
      }

      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Error fetching design:', error)
        setIsLoading(false)
          return
        }

      if (data?.approval_status && data.approval_status !== 'approved') {
        setIsDesignUnavailable(true)
        setIsLoading(false)
        return
      }

      if (!data?.created_by) {
        console.error('No created_by field found for design')
        setIsLoading(false)
        return
      }

      setTailorId(data.created_by)

      // Add .maybeSingle() instead of .single() to handle cases with no rows
      const { data: brandName, error: brandNameError } = await supabase
        .from('tailor_details')
        .select('brand_name')
        .eq('id', data.created_by)
        .maybeSingle()

      if (brandNameError) {
        console.error('Error fetching brand name:', brandNameError)
        setIsLoading(false)
        return
      }

      if (brandName) {
        setBrandName(brandName.brand_name)
      } else {
        console.log('No brand name found for tailor ID:', data.created_by)
        setBrandName('Unknown Brand')
      }


      // Merge the brand_name into the design object
      const design = {
        ...data
      }
      designCache.set(id, design)
      setDesign(design)

      if (typeof window !== 'undefined') {
        try {
          const cacheEntry: CachedDesignEntry = {
            design,
            brandName: brandName?.brand_name || 'Unknown Brand'
          }
          sessionStorage.setItem(`${designCacheKey}:${id}`, JSON.stringify(cacheEntry))
        } catch (error) {
          console.error('Failed to store design cache entry:', error)
        }
      }

      setIsLoading(false)
    }

    fetchDesign()
  }, [id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem('designs:sequence')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setDesignSequence(parsed.filter((item) => typeof item === 'string'))
      }
    } catch (error) {
      console.error('Failed to parse design sequence:', error)
    }
  }, [])

  useEffect(() => {
    if (!designSequence.length) return
    const index = designSequence.indexOf(id)
    setCurrentDesignIndex(index >= 0 ? index : null)
  }, [designSequence, id])

  useEffect(() => {
    if (!mediaItems.length) return
    setIsMediaLoading(true)
  }, [selectedMediaIndex, mediaItems.length])



  useEffect(() => {
    async function fetchMeasurements() {
      setIsLoadingMeasurements(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('measurements')
          .select('*')
          .eq('user_id', user.id);
        
        if (data && !error) {
          setSavedMeasurements(data);
        }
      }
      setIsLoadingMeasurements(false);
    }

    fetchMeasurements();
  }, []);

  // New effect to fetch tailor details
  useEffect(() => {
    async function fetchTailorDetails() {
      if (!tailorId) return;

      const { data, error } = await supabase
        .from('tailor_details')
        .select('*')
        .eq('id', tailorId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tailor details:', error);
        return;
      }

      if (data) {
        setTailorDetails(data);
      } else {
        console.log('No tailor details found for ID:', tailorId);
      }
    }

    if (tailorId) {
      fetchTailorDetails();
    }
  }, [tailorId]);


  // Fabric pricing deprecated; only fallback to design.price
  const getFabricPrice = (_fabric: any, _measurement?: Measurement) => 0

  const totalPrice = useMemo(() => {
    if (!design) return 0;
    if (typeof design.price === 'number') {
      // Apply 30% markup with $10 minimum to tailor's price
      return calculateCustomerPrice(design.price);
    }
    return 0;
  }, [design]);

  useEffect(() => {
    async function updatePrices() {
      if (!design) return
      const total = totalPrice
      const designCurrency: CurrencyCode = design.currency_code || 'USD'
      const convertedTotal = await convertToPreferred(total, designCurrency)
      setFormattedTotalPrice(formatAmount(convertedTotal))

      try {
        const rateToUsd = await getExchangeRate(designCurrency, 'USD')
        setPriceInUsdForBag(total * rateToUsd)
      } catch (error) {
        console.error('Failed to convert price to USD for bag:', error)
        setPriceInUsdForBag(total)
      }
    }

    updatePrices()
  }, [design, totalPrice, convertToPreferred, formatAmount, getExchangeRate]);


  const handleAddToCart = async () => {
    // Validate fields
    if (!selectedMeasurement) {
      toast.error('Please select your measurements')
      return
    }


    if (!design) return

    try {
      setLoading(true)

      const itemTotalPrice = priceInUsdForBag || totalPrice

      await addItem({
        tailor_id: design.created_by,
        design_id: design.id,
        price: itemTotalPrice,
        tailor_notes: tailorNotes,
        measurement_id: selectedMeasurement?.id.toString()
      })

      router.push('/customer/bag')
    } catch (error) {
      console.error('Error adding to cart:', error)
      // Don't show error toast here since addItem already handles it
    } finally {
      setLoading(false)
    }
  }

  const navigateToIndex = (nextIndex: number) => {
    if (!designSequence.length) return
    if (nextIndex < 0 || nextIndex >= designSequence.length) return
    const nextId = designSequence[nextIndex]
    if (!nextId || nextId === id) return
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('designs:current', nextId)
    }
    router.push(`/customer/designs/${nextId}`)
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    if (currentDesignIndex === null) return
    if (direction === 'left') {
      navigateToIndex(currentDesignIndex + 1)
    } else {
      navigateToIndex(currentDesignIndex - 1)
    }
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return
    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    touchStartRef.current = null

    const swipeThreshold = 60
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
      return
    }

    if (deltaX < 0) {
      handleSwipe('left')
    } else {
      handleSwipe('right')
    }
  }

  const handlePrevMedia = () => {
    if (!mediaItems.length) return
    setSelectedMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  const handleNextMedia = () => {
    if (!mediaItems.length) return
    setSelectedMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }



  // Add a check to determine if this is a simple pricing design or has real fabrics
  const hasRealFabrics = useMemo(() => {
    const fabrics = design?.fabrics
    if (!Array.isArray(fabrics)) return false
    return fabrics.some(fabric => 
      fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0)
    )
  }, [design?.fabrics]);

  const calculateAverageRating = (tailor: any) => {
    if (tailor?.rating_count && tailor.rating_count > 0 && tailor.rating_sum) {
      return parseFloat((tailor.rating_sum / tailor.rating_count).toFixed(1));
    }
    return null; // Return null instead of 0 for no ratings
  };

  const fetchReviews = async () => {
    if (!tailorId) return;
    
    setIsLoadingReviews(true);
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        users:user_id (
          id,
          email
        )
      `)
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      setReviews(data || []);
    }
    setIsLoadingReviews(false);
  };

  const handleOpenReviews = () => {
    setShowReviewsModal(true);
    fetchReviews();
  };

  if (isDesignUnavailable) {
    return (
      <div className={styles.container}>
        <button 
          onClick={() => router.push('/')}
          className={styles.backButton}
        >
          <IoArrowBack /> Back to Home
        </button>
        <div className={styles.unavailableMessage}>
          This design is currently pending approval and is not yet visible to customers.
        </div>
      </div>
    )
  }

  if (!design || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonMedia} />
          <div className={styles.skeletonDetails}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
            <div className={styles.skeletonPrice} />
            <div className={styles.skeletonButton} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.push('/')}
        className={styles.backButton}
      >
        <IoArrowBack /> Back to Home
      </button>
      {designSequence.length > 1 && (
        <div className={styles.designNav}>
          <button
            className={styles.designNavButton}
            onClick={() => handleSwipe('right')}
            disabled={currentDesignIndex === null || currentDesignIndex <= 0}
            aria-label="Previous design"
          >
            ‹
          </button>
          <span className={styles.designNavLabel}>
            Browse designs
          </span>
          <button
            className={styles.designNavButton}
            onClick={() => handleSwipe('left')}
            disabled={
              currentDesignIndex === null ||
              currentDesignIndex >= designSequence.length - 1
            }
            aria-label="Next design"
          >
            ›
          </button>
        </div>
      )}

      <div className={styles.productGrid}>
        {/* Left side - Media gallery */}
        <div className={styles.imageSection}>
          <div
            className={`${styles.mainImage} ${isMediaLoading ? styles.mediaLoading : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {mediaItems.length > 1 && (
              <>
                <button
                  className={`${styles.mediaNavArrow} ${styles.mediaNavArrowLeft}`}
                  onClick={handlePrevMedia}
                  aria-label="Previous media"
                >
                  ‹
                </button>
                <button
                  className={`${styles.mediaNavArrow} ${styles.mediaNavArrowRight}`}
                  onClick={handleNextMedia}
                  aria-label="Next media"
                >
                  ›
                </button>
              </>
            )}
            {mediaItems[selectedMediaIndex]?.type === 'video' ? (
              <video 
                src={mediaItems[selectedMediaIndex]?.url}
                className={styles.primaryImage}
                autoPlay
                loop
                muted
                playsInline
                onLoadedData={() => setIsMediaLoading(false)}
              />
            ) : (
              <img 
                src={mediaItems[selectedMediaIndex]?.url}
                alt={design.title}
                className={styles.primaryImage}
                onClick={() => setIsImageZoomed(true)}
                style={{ cursor: 'zoom-in' }}
                onLoad={() => setIsMediaLoading(false)}
              />
            )}
            {isMediaLoading && <div className={styles.mediaSkeleton} />}
          </div>
          {designSequence.length > 1 && (
            <div className={styles.swipeHint}>
              {isMobile ? 'Swipe to browse designs' : 'Use the arrows above to browse designs'}
            </div>
          )}
          <div className={styles.thumbnails}>
            {mediaItems.map((item, index) => (
              <div 
                key={index}
                className={`${styles.thumbnailContainer} ${selectedMediaIndex === index ? styles.selected : ''}`}
                onClick={() => setSelectedMediaIndex(index)}
              >
                {item.type === 'video' ? (
                  <>
                    <video
                      src={item.url}
                      className={styles.thumbnail}
                      muted
                    />
                    <div className={styles.videoPlayIcon}>▶</div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={`${design.title} view ${index + 1}`}
                    className={styles.thumbnail}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Tailor Preview Section - desktop only */}
          {tailorDetails && !isMobile && (
            <div className={styles.tailorPreview} onClick={() => setShowTailorProfile(true)}>
              <div className={styles.tailorPreviewContent}>
                <div className={styles.tailorLogo}>
                  {tailorDetails.logo_url ? (
                    <img src={tailorDetails.logo_url} alt={tailorDetails.brand_name} />
                  ) : (
                    <IoPersonCircleOutline size={40} />
                  )}
                </div>
                <div className={styles.tailorInfo}>
                  <h3>{tailorDetails.brand_name}</h3>
                  <p>Designer: {tailorDetails.tailor_name}</p>
                  
                  <div className={styles.ratingDisplay}>
                    {calculateAverageRating(tailorDetails) !== null ? (
                      <>
                        <StarRating 
                          initialRating={calculateAverageRating(tailorDetails) || 0}
                          readOnly={true} 
                          onChange={() => {}} 
                        />
                        <button 
                          className={styles.viewReviewsButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReviews();
                          }}
                        >
                          View Reviews ({tailorDetails.rating_count})
                        </button>
                      </>
                    ) : (
                      <span className={styles.noRatings}>No ratings yet</span>
                    )}
                  </div>
                </div>
              </div>
              <button className={styles.viewProfileButton}>View Full Profile</button>
            </div>
          )}
        </div>

        {/* Right side - Product details */}
        <div className={styles.detailsSection}>
          <h1 className={styles.title}>{design.title}</h1>
          
          <div className={styles.description}>
            <p>{design.description}</p>
          </div>

          {/* Tailor Preview Section - mobile only */}
          {tailorDetails && isMobile && (
            <div className={styles.tailorPreview} onClick={() => setShowTailorProfile(true)}>
              <div className={styles.tailorPreviewContent}>
                <div className={styles.tailorLogo}>
                  {tailorDetails.logo_url ? (
                    <img src={tailorDetails.logo_url} alt={tailorDetails.brand_name} />
                  ) : (
                    <IoPersonCircleOutline size={40} />
                  )}
                </div>
                <div className={styles.tailorInfo}>
                  <h3>{tailorDetails.brand_name}</h3>
                  <p>Designer: {tailorDetails.tailor_name}</p>
                  
                  <div className={styles.ratingDisplay}>
                    {calculateAverageRating(tailorDetails) !== null ? (
                      <>
                        <StarRating 
                          initialRating={calculateAverageRating(tailorDetails) || 0}
                          readOnly={true} 
                          onChange={() => {}} 
                        />
                        <button 
                          className={styles.viewReviewsButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReviews();
                          }}
                        >
                          View Reviews ({tailorDetails.rating_count})
                        </button>
                      </>
                    ) : (
                      <span className={styles.noRatings}>No ratings yet</span>
                    )}
                  </div>
                </div>
              </div>
              <button className={styles.viewProfileButton}>View Full Profile</button>
            </div>
          )}
          
          <div className={styles.priceBreakdown}>
            <p className={styles.estimatedTotal}>
              Total Price: {formattedTotalPrice}
            </p>
          </div>


          {/* Add measurement selection section */}
          <div className={styles.measurementSelection}>
            <h3>Your Measurements</h3>
            {isLoadingMeasurements ? (
              <div className={styles.loadingMeasurements}>Loading measurements...</div>
            ) : savedMeasurements.length > 0 ? (
              <>
                <select
                  value={selectedMeasurement?.id.toString() || ''}
                  onChange={(e) => {
                    const measurementId = e.target.value;
                    if (measurementId) {
                      const measurement = savedMeasurements.find(m => m.id.toString() === measurementId);
                      if (measurement) {
                        setSelectedMeasurement(measurement);
                      }
                    } else {
                      setSelectedMeasurement(undefined);
                    }
                  }}
                  className={styles.measurementSelect}
                >
                  <option value="">Select your measurements...</option>
                  {savedMeasurements.map((measurement) => (
                    <option key={measurement.id} value={measurement.id.toString()}>
                      {measurement.name}
                    </option>
                  ))}
                </select>
                
                {selectedMeasurement && (
                  <div className={styles.selectedMeasurementDetails}>
                    <div 
                      className={styles.measurementDetailsHeader}
                      onClick={() => setShowMeasurementDetails(!showMeasurementDetails)}
                    >
                      <h4>{selectedMeasurement.name}</h4>
                      <div className={styles.showDetailsToggle}>
                        <span>{showMeasurementDetails ? 'Hide Details' : 'Show Details'}</span>
                        <button className={styles.toggleButton}>
                          {showMeasurementDetails ? <IoChevronUp /> : <IoChevronDown />}
                        </button>
                      </div>
                    </div>
                    
                    {showMeasurementDetails && (
                      <div className={styles.measurementGrid}>
                        {Object.entries(selectedMeasurement)
                          .filter(([key, value]) => {
                            // Exclude meta fields
                            if (['id', 'user_id', 'created_at', 'updated_at', 'name'].includes(key)) {
                              return false;
                            }
                            // Check if value is a number or can be converted to a number
                            const numValue = typeof value === 'number' ? value : parseFloat(value as string);
                            return !isNaN(numValue) && numValue > 0;
                          })
                          .map(([key, value]) => (
                            <div key={key} className={styles.measurementItem}>
                              <span className={styles.measurementLabel}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                              </span>
                              <span>
                                {value} inches
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noMeasurements}>
                <p>No measurements found. Please add your measurements in your profile first.</p>
                <button
                  onClick={() => router.push('/customer/measurements')}
                  className={styles.addMeasurementsButton}
                >
                  Add Measurements
                </button>
              </div>
            )}
          </div>

          {/* Add tailor notes section */}
          <div className={styles.tailorNotesSection}>
            <h3>Special Instructions for Tailor</h3>
            <textarea
              value={tailorNotes}
              onChange={(e) => setTailorNotes(e.target.value)}
              placeholder="Add any special instructions or requests for your tailor... (e.g., 'Please make sleeves a bit tighter', 'Add extra length', etc.)"
              className={styles.tailorNotesTextarea}
              maxLength={500}
            />
            <div className={styles.characterCount}>
              {tailorNotes.length}/500 characters
            </div>
          </div>
          
          {/* Add button at the bottom of the details section */}
          {!isMobile && (
            <div className={styles.desktopOrderButtonContainer}>
              <button 
                className={styles.addToCartButton}
                onClick={handleAddToCart}
                disabled={loading || !selectedMeasurement}
              >
                {loading ? 'Adding...' : 'Add to Bag'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only button fixed at bottom of screen */}
      {isMobile && (
        <button 
          className={styles.addToCartButton}
          onClick={handleAddToCart}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add to Bag'}
        </button>
      )}

      {/* Tailor Full Profile Modal */}
      {showTailorProfile && tailorDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowTailorProfile(false)}>
          <div className={styles.tailorProfileModal} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeModalButton} 
              onClick={() => setShowTailorProfile(false)}
            >
              ×
            </button>
            
            <div className={styles.tailorProfileContent}>
              {tailorDetails.banner_image_url && (
                <div className={styles.bannerImage}>
                  <img src={tailorDetails.banner_image_url} alt="Banner" />
                </div>
              )}
              
              <div className={styles.profileHeader}>
                <div className={styles.profileLogo}>
                  {tailorDetails.logo_url ? (
                    <img src={tailorDetails.logo_url} alt={tailorDetails.brand_name} />
                  ) : (
                    <IoPersonCircleOutline size={80} />
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <h2>{tailorDetails.brand_name}</h2>
                  <h3>{tailorDetails.tailor_name}</h3>
                  
                  {/* Add rating display in the profile modal */}
                  <div className={styles.profileRating}>
                    {calculateAverageRating(tailorDetails) !== null ? (
                      <>
                        <StarRating 
                          initialRating={calculateAverageRating(tailorDetails) || 0}
                          readOnly={true} 
                          onChange={() => {}} 
                        />
                        <button 
                          className={styles.viewReviewsButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTailorProfile(false);
                            handleOpenReviews();
                          }}
                        >
                          View Reviews ({tailorDetails.rating_count})
                        </button>
                      </>
                    ) : (
                      <span className={styles.noRatings}>No ratings yet</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={styles.profileBody}>
                <div className={styles.infoSection}>
                  <h4>About</h4>
                  <p>{tailorDetails.bio || "No bio available"}</p>
                </div>
                
                <div className={styles.infoSection}>
                  <h4>Experience</h4>
                  <p>{tailorDetails.experience} years</p>
                </div>
                
                <div className={styles.infoSection}>
                  <h4>Specializations</h4>
                  <div className={styles.specializationTags}>
                    {tailorDetails.specializations?.map((spec: string, index: number) => (
                      <span key={index} className={styles.specializationTag}>
                        {spec}
                      </span>
                    )) || "No specializations listed"}
                  </div>
                </div>
                
                <div className={styles.infoSection}>
                  <h4>Contact Information</h4>
                  <p>Email: {tailorDetails.email}</p>
                  <p>Phone: {tailorDetails.phone}</p>
                  <p>Website: <a href={tailorDetails.website} target="_blank" rel="noopener noreferrer">{tailorDetails.website}</a></p>
                  <p>Address: {tailorDetails.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Media Zoom Modal */}
      {isImageZoomed && mediaItems[selectedMediaIndex]?.type === 'image' && (
        <div className={styles.zoomModalOverlay} onClick={() => setIsImageZoomed(false)}>
          <div className={styles.zoomModalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.zoomCloseButton}
              onClick={() => setIsImageZoomed(false)}
            >
              ×
            </button>
            <img 
              src={mediaItems[selectedMediaIndex]?.url}
              alt={design.title}
              className={styles.zoomedImage}
            />
            <div className={styles.zoomImageInfo}>
              <p>{design.title} - View {selectedMediaIndex + 1} of {mediaItems.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className={styles.reviewsModalOverlay} onClick={() => setShowReviewsModal(false)}>
          <div className={styles.reviewsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.reviewsModalHeader}>
              <h2>Customer Reviews</h2>
              <button 
                className={styles.closeReviewsButton}
                onClick={() => setShowReviewsModal(false)}
              >
                ×
              </button>
            </div>
            
            {tailorDetails && (
              <div className={styles.reviewsSummary}>
                <div className={styles.overallRating}>
                  <div className={styles.ratingNumber}>
                    {calculateAverageRating(tailorDetails)?.toFixed(1) || 'N/A'}
                  </div>
                  <StarRating 
                    initialRating={calculateAverageRating(tailorDetails) || 0}
                    readOnly={true} 
                    onChange={() => {}} 
                  />
                  <p className={styles.totalReviews}>
                    Based on {tailorDetails.rating_count || 0} {tailorDetails.rating_count === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            )}

            <div className={styles.reviewsList}>
              {isLoadingReviews ? (
                <div className={styles.loadingReviews}>Loading reviews...</div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.reviewerAvatar}>
                          {review.users?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className={styles.reviewerName}>
                            {review.users?.email?.split('@')[0] || 'Anonymous'}
                          </div>
                          <div className={styles.reviewDate}>
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className={styles.reviewRating}>
                        <StarRating 
                          initialRating={review.rating}
                          readOnly={true} 
                          onChange={() => {}} 
                        />
                      </div>
                    </div>
                    {review.comment && (
                      <div className={styles.reviewComment}>
                        {review.comment}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.noReviews}>
                  <p>No reviews yet. Be the first to review this tailor!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
