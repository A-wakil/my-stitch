'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import styles from './DesignDetail.module.css'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import OrderConfirmationModal from '../../ui/orderConfirmationModal/OrderConfirmationModal'
import { Measurement } from '../../../lib/types'
import { IoArrowBack } from "react-icons/io5"
import { IoChevronDown, IoChevronUp } from "react-icons/io5"
import { IoInformationCircleOutline } from "react-icons/io5"
import { sendOrderNotification, notifyOrderParties } from '../../../lib/notifications'
import { IoPersonCircleOutline } from "react-icons/io5"
import { StarRating } from "../../../components/ui/StarRating"
import { useCurrency } from '../../../context/CurrencyContext'
import { useBag } from '../../../context/BagContext'

interface DesignDetail {
  id: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string
    yardPrice?: number
    stitchPrice?: number
    price?: number // Keep backward compatibility
    colors: Array<{ name: string; image: string }>
  }>
  created_by: string
  brand_name: string
  completion_time: number
  available_styles?: Array<{
    name: string;
    display_name: string;
    description?: string;
    recommended_yards: number;
    is_addition?: boolean;
  }>
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
      yardPrice?: number;
      stitchPrice?: number;
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
  const { formatAmount, convertToPreferred } = useCurrency()

  // Unwrap the promise to get the actual params
  const { id } = use(params)

  const [design, setDesign] = useState<DesignDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedFabric, setSelectedFabric] = useState(0)
  const [selectedColor, setSelectedColor] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [brandName, setBrandName] = useState<string>('')
  const [tailorId, setTailorId] = useState<string | null>(null)
  const router = useRouter()
  const [selectedAddress, setSelectedAddress] = useState<string>("")
  const [savedAddresses, setSavedAddresses] = useState<string[]>([])
  const [orderShippingAddress, setOrderShippingAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [savedMeasurements, setSavedMeasurements] = useState<Measurement[]>([])
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | undefined>(undefined)
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true)
  const [showMeasurementDetails, setShowMeasurementDetails] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<string>('')
  const [customYards, setCustomYards] = useState<number | null>(null)
  const [showYardInput, setShowYardInput] = useState(false)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [tailorDetails, setTailorDetails] = useState<any>(null)
  const [showTailorProfile, setShowTailorProfile] = useState(false)
  const [tailorNotes, setTailorNotes] = useState<string>('')
  const [formattedStitchPrice, setFormattedStitchPrice] = useState<string>('')
  const [formattedYardPrice, setFormattedYardPrice] = useState<string>('')
  const [formattedTotalPrice, setFormattedTotalPrice] = useState<string>('')
  const [formattedYardTotal, setFormattedYardTotal] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")

  // Bag context
  const { addItem } = useBag()

  // Add effect to get the current user's email
  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    }
    fetchCurrentUser();
  }, []);

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
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Error fetching design:', error)
          return
        }

      const { data: brandData, error: brandError } = await supabase
        .from('designs')
        .select('created_by')
        .eq('id', id)
        .single()

      if (brandError) {
        console.error('Error fetching brand:', brandError)
        return
      }

      if (!brandData || !brandData.created_by) {
        console.error('No created_by field found for design')
        return
      }

      setTailorId(brandData.created_by)

      // Add .maybeSingle() instead of .single() to handle cases with no rows
      const { data: brandName, error: brandNameError } = await supabase
        .from('tailor_details')
        .select('brand_name')
        .eq('id', brandData.created_by)
        .maybeSingle()

      if (brandNameError) {
        console.error('Error fetching brand name:', brandNameError)
        return
      }

      if (brandName) {
        setBrandName(brandName.brand_name)
      } else {
        console.log('No brand name found for tailor ID:', brandData.created_by)
        setBrandName('Unknown Brand')
      }

      // Set default selected style if available
      if (data.available_styles && data.available_styles.length > 0) {
        // Find a non-Agbada addition style as the default
        const defaultStyle = data.available_styles.find((style: {
          name: string;
          is_addition?: boolean;
        }) => 
          !style.is_addition && style.name !== 'agbada_addition'
        );
        setSelectedStyle(defaultStyle ? defaultStyle.name : 'kaftan');
      } else {
        // Fallback to default styles if none are specified
        setSelectedStyle('kaftan');
      }

      // Merge the brand_name into the design object
      const design = {
        ...data
      }
      setDesign(design)
    }

    fetchDesign()
  }, [id])

  useEffect(() => {
    async function fetchUserAddress() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Use maybeSingle() instead of single() to handle no rows gracefully
        const { data, error } = await supabase
          .from('customer_details')
          .select('street_address, city, state, postal_code, country')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching customer address:', error);
        } else if (data) {
          // Only add the address if all required fields exist
          if (data.street_address && data.city && data.state && data.postal_code) {
            const formattedAddress = `${data.street_address}, ${data.city}, ${data.state} ${data.postal_code}, ${data.country || 'United States'}`;
            setSavedAddresses([formattedAddress]);
          } else {
            setSavedAddresses([]);
          }
        } else {
          // No data found
          setSavedAddresses([]);
        }
      }
      setIsLoading(false);
    }

    fetchUserAddress();
  }, []);


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

  const getRecommendedYards = (styleType: string): number => {
    // First check if the design has available_styles with recommended_yards
    if (design?.available_styles) {
      // Check for the base style
      const styleOption = design.available_styles.find(style => style.name === styleType);
      if (styleOption && styleOption.recommended_yards) {
        // If this is a base style with Agbada, add the Agbada yardage
        const hasAgbadaAddition = selectedStyle.endsWith('_agbada');
        
        if (hasAgbadaAddition) {
          // Look for the Agbada addition in available styles
          const agbadaAddition = design.available_styles.find(
            style => style.name === 'agbada_addition' || style.name === 'agbada'
          );
          
          if (agbadaAddition) {
            return styleOption.recommended_yards + agbadaAddition.recommended_yards;
          }
        }
        
        return styleOption.recommended_yards;
      }
    }

    // Fallback to default values
    switch(styleType) {
      case 'kaftan':
        return 4.5;
      case 'agbada':
        return 3.5;
      case 'kaftan_agbada':
        return 8.0;
      case 'senator':
        return 4.0;
      case 'dashiki':
        return 3.0;
      case 'ankara':
        return 4.0;
      case 'senator_agbada':
        return 7.5;
      case 'dashiki_agbada':
        return 6.5;
      case 'ankara_agbada':
        return 7.5;
      default:
        return 4.5;
    }
  };

  const getFabricPrice = (fabric: any, measurement?: Measurement) => {
    // Default values if properties are undefined
    const stitchPrice = fabric.stitchPrice || 0;
    const yardPrice = fabric.yardPrice || 0;
    
    // Calculate based on yards needed
    if (selectedStyle) {
      const yards = customYards !== null ? customYards : getRecommendedYards(selectedStyle);
      return stitchPrice + (yards * yardPrice);
    } 
    
    // Fallback to previous logic if no style is selected
    if (fabric.price !== undefined) {
      return fabric.price;
    } else if (fabric.stitchPrice !== undefined) {
      return fabric.stitchPrice;
    } else {
      return 0; // Default price if none is available
    }
  }

  const totalPrice = useMemo(() => {
    if (!design || !design.fabrics[selectedFabric]) return 0;
    
    return getFabricPrice(design.fabrics[selectedFabric], selectedMeasurement);
  }, [design, selectedFabric, selectedMeasurement, selectedStyle, customYards, getRecommendedYards]);

  useEffect(() => {
    async function updatePrices() {
      if (!design?.fabrics[selectedFabric]) return

      const stitchPrice = design.fabrics[selectedFabric].stitchPrice || 0
      const yardPrice = design.fabrics[selectedFabric].yardPrice || 0
      const total = totalPrice

      const convertedStitchPrice = await convertToPreferred(stitchPrice, 'USD')
      const convertedYardPrice = await convertToPreferred(yardPrice, 'USD')
      const convertedTotal = await convertToPreferred(total, 'USD')

      setFormattedStitchPrice(formatAmount(convertedStitchPrice))
      setFormattedYardPrice(formatAmount(convertedYardPrice))
      setFormattedTotalPrice(formatAmount(convertedTotal))

      if (selectedStyle) {
        const yardTotal = (yardPrice || 0) * getRecommendedYards(selectedStyle)
        const convertedYardTotal = await convertToPreferred(yardTotal, 'USD')
        setFormattedYardTotal(formatAmount(convertedYardTotal))
      }
    }

    updatePrices()
  }, [design, selectedFabric, totalPrice, selectedStyle, convertToPreferred, formatAmount, getRecommendedYards]);

  const mapDesignToOrderFormat = (design: DesignDetail, brandName: string) => {
    return {
      id: design.id,
      title: design.title,
      fabrics: design.fabrics.map(fabric => ({
        name: fabric.name,
        price: getFabricPrice(fabric, selectedMeasurement),
        colors: fabric.colors.map(color => ({ name: color.name }))
      })),
      brand_name: brandName,
      completion_time: design.completion_time || 1,
      tailor_id: design.created_by
    };
  };

  const handleAddToCart = async () => {
    // Validate fields
    if (!selectedMeasurement) {
      toast.error('Please select your measurements')
      return
    }

    if (!selectedStyle) {
      toast.error('Please select a style option')
      return
    }

    if (selectedColor === null) {
      toast.error('Please select a color')
      return
    }

    if (!design) return

    const yardPrice = design.fabrics[selectedFabric].yardPrice ?? 0
    const stitchPrice = design.fabrics[selectedFabric].stitchPrice ?? design.fabrics[selectedFabric].price ?? 0

    await addItem({
      tailor_id: design.created_by,
      design_id: design.id,
      fabric_idx: selectedFabric,
      color_idx: selectedColor,
      style_type: selectedStyle,
      fabric_yards: customYards !== null ? customYards : getRecommendedYards(selectedStyle),
      yard_price: yardPrice,
      stitch_price: stitchPrice,
      tailor_notes: tailorNotes,
      measurement_id: selectedMeasurement?.id.toString()
    })

    router.push('/customer/bag')
  }

  const handleConfirmOrder = async () => {
    try {
      // Set processing state to true to disable the button
      setIsProcessingOrder(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to place an order');
        setIsProcessingOrder(false);
        return;
      }

      // Get tailor_id from the design
      const { data: designData } = await supabase
        .from('designs')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!designData?.created_by) {
        toast.error('Invalid design data');
        setIsProcessingOrder(false);
        return;
      }

      // Use the new yard calculation
      const yards = customYards !== null ? customYards : (selectedStyle ? getRecommendedYards(selectedStyle) : 4.5);

      // Format shipping address as a proper JSON string
      const shippingAddressJson = JSON.stringify({
        street_address: orderShippingAddress.split(',')[0].trim(),
        city: orderShippingAddress.split(',')[1].trim(),
        state: orderShippingAddress.split(',')[2].split(' ')[1],
        zip_code: orderShippingAddress.split(',')[2].split(' ')[2],
        country: orderShippingAddress.split(',')[3].trim()
      });

      // Format measurements as a proper JSON string
      const measurementsJson = JSON.stringify(selectedMeasurement || {});

      const orderData = {
        user_id: user.id,
        tailor_id: designData.created_by,
        design_id: id,
        status: 'pending',
        total_amount: totalPrice,
        measurements: measurementsJson,
        shipping_address: shippingAddressJson,
        fabric_name: design?.fabrics[selectedFabric].name,
        color_name: selectedColor !== null ? design?.fabrics[selectedFabric].colors[selectedColor].name : '',
        style_type: selectedStyle,
        estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        fabric_yards: yards,
        tailor_notes: tailorNotes || null
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('Order insertion error:', error);
        setIsProcessingOrder(false);
        throw error;
      }

      // Fetch customer profile
      const { data: customerProfile, error: customerProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (customerProfileError) {
        console.error('Error fetching customer profile:', customerProfileError);
        setIsProcessingOrder(false);
      } else {
        // Fetch tailor profile
        const { data: tailorProfile, error: tailorProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', designData.created_by)
          .single();

        if (tailorProfileError) {
          console.error('Error fetching tailor profile:', tailorProfileError);
          setIsProcessingOrder(false);
        } else {
          // Send notifications
          try {
            // Use the notifyOrderParties helper instead of separate calls
            await notifyOrderParties(
              'order_placed',
              data,
              customerProfile,
              tailorProfile,
              { totalAmount: totalPrice }
            );
            
            console.log('Order notifications sent successfully');
          } catch (notificationError) {
            console.error('Error sending order notifications:', notificationError);
          }
        }
      }

      toast.success('Order placed successfully!');
      setIsModalOpen(false);
      // Keep processing true during redirect
      router.push('/customer/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
      setIsProcessingOrder(false);
    }
  };

  const handleAddressUpdate = (address: string) => {
    setOrderShippingAddress(address)
  }

  const handleMeasurementUpdate = (measurement: Measurement | undefined) => {
    setSelectedMeasurement(measurement);
  };

  // Add a check to determine if this is a simple pricing design or has real fabrics
  const hasRealFabrics = useMemo(() => {
    if (!design?.fabrics) return false;
    return design.fabrics.some(fabric => 
      fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0)
    );
  }, [design?.fabrics]);

  const calculateAverageRating = (tailor: any) => {
    if (tailor?.rating_count && tailor.rating_count > 0 && tailor.rating_sum) {
      return parseFloat((tailor.rating_sum / tailor.rating_count).toFixed(1));
    }
    return null; // Return null instead of 0 for no ratings
  };

  if (!design) {
    return <div>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.push('/')}
        className={styles.backButton}
      >
        <IoArrowBack /> Back to Home
      </button>

      <div className={styles.productGrid}>
        {/* Left side - Image gallery */}
        <div className={styles.imageSection}>
          <div className={styles.mainImage}>
            <img 
              src={design.images[selectedImage]} 
              alt={design.title}
              className={styles.primaryImage}
            />
          </div>
          <div className={styles.thumbnails}>
            {design.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${design.title} view ${index + 1}`}
                className={`${styles.thumbnail} ${selectedImage === index ? styles.selected : ''}`}
                onClick={() => setSelectedImage(index)}
              />
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
                        <span className={styles.ratingCount}>
                          {tailorDetails.rating_count || 0} {(tailorDetails.rating_count === 1) ? 'review' : 'reviews'}
                        </span>
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
                        <span className={styles.ratingCount}>
                          {tailorDetails.rating_count || 0} {(tailorDetails.rating_count === 1) ? 'review' : 'reviews'}
                        </span>
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
            <p>Stitching Price: {formattedStitchPrice}</p>
            <p>Fabric Price: {formattedYardPrice} per yard</p>
            {selectedStyle && (
              <>
                <p>
                  Selected Style: <span className={styles.styleValue}>
                    {(() => {
                      // Check if this is a style from the available_styles array
                      if (design.available_styles) {
                        const styleOption = design.available_styles.find(s => s.name === selectedStyle);
                        if (styleOption) {
                          return styleOption.display_name;
                        }
                      }
                      
                      // Fall back to hardcoded styles
                      switch(selectedStyle) {
                        case 'kaftan': return 'Kaftan';
                        case 'kaftan_agbada': return 'Kaftan & Agbada';
                        case 'agbada': return 'Agbada';
                        case 'senator': return 'Senator Style';
                        case 'dashiki': return 'Dashiki';
                        case 'ankara': return 'Ankara Design';
                        case 'senator_agbada': return 'Senator & Agbada';
                        case 'dashiki_agbada': return 'Dashiki & Agbada';
                        case 'ankara_agbada': return 'Ankara & Agbada';
                        default: return selectedStyle;
                      }
                    })()}
                  </span>
                </p>
                
                <div className={styles.yardageSection}>
                  <div className={styles.yardageToggle}>
                    <button 
                      className={`${styles.yardageButton} ${!showYardInput ? styles.activeButton : ''}`}
                      onClick={() => setShowYardInput(false)}
                    >
                      Use Recommended
                    </button>
                    <button 
                      className={`${styles.yardageButton} ${showYardInput ? styles.activeButton : ''}`}
                      onClick={() => setShowYardInput(true)}
                    >
                      Custom Yardage
                    </button>
                    <span className={styles.yardageInfo}>
                      <IoInformationCircleOutline className={styles.infoIcon} />
                      <div className={styles.yardageTooltip}>
                        Use "Custom Yardage" if you already know exactly how much fabric you need. 
                        Otherwise, we recommend using our standard estimates based on your style choice.
                      </div>
                    </span>
                  </div>
                  
                  {showYardInput ? (
                    <div className={styles.customYardInput}>
                      <label htmlFor="custom-yards">Enter yards needed:</label>
                      <input 
                        id="custom-yards"
                        type="number" 
                        min="1" 
                        step="0.5" 
                        value={customYards || ''}
                        onChange={(e) => setCustomYards(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter yards..."
                      />
                    </div>
                  ) : (
                    <p>
                      Recommended fabric: {getRecommendedYards(selectedStyle).toFixed(1)} yards = {formattedYardTotal}
                    </p>
                  )}
                </div>
                
                <p className={styles.estimatedTotal}>
                  Total Price: {formattedTotalPrice}
                </p>
              </>
            )}
          </div>

          {/* Only show Fabrics section if there are real fabrics */}
          {hasRealFabrics && (
            <div className={styles.fabricSelection}>
              <h3>Fabrics</h3>
              <div className={styles.fabricOptions}>
                {design.fabrics
                  .filter(fabric => fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0))
                  .map((fabric, index) => (
                    <div
                      key={index}
                      className={`${styles.fabricOption} ${selectedFabric === index ? styles.selectedFabric : ''}`}
                      onClick={() => {
                        setSelectedFabric(index);
                        setSelectedColor(0);
                      }}
                    >
                      <img src={fabric.image} alt={fabric.name} />
                      <span>{fabric.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Only show Colors section if the selected fabric has colors */}
          {hasRealFabrics && design.fabrics[selectedFabric].colors && design.fabrics[selectedFabric].colors.length > 0 && (
            <div className={styles.colorSelection}>
              <h3>Colors</h3>
              <div className={styles.colorOptions}>
                {design.fabrics[selectedFabric].colors.map((color, index) => (
                  <div
                    key={index}
                    className={styles.colorOption}
                    onClick={() => setSelectedColor(index)}
                  >
                    <div 
                      className={`${styles.colorPill} ${selectedColor === index ? styles.selectedColor : ''}`}
                      style={{ backgroundColor: color.name }}
                      title={color.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
                          .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'name'].includes(key) && typeof selectedMeasurement[key as keyof Measurement] === 'number')
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
                disabled={loading || !selectedMeasurement || isProcessingOrder}
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
                        <span className={styles.ratingCount}>
                          {tailorDetails.rating_count || 0} {(tailorDetails.rating_count === 1) ? 'review' : 'reviews'}
                        </span>
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

      <OrderConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        orderDetails={{
          design: mapDesignToOrderFormat(design, brandName),
          selectedFabric,
          selectedColor,
          shippingAddress: orderShippingAddress,
          total: totalPrice,
          measurement: selectedMeasurement,
          tailorNotes: tailorNotes,
          userEmail: currentUserEmail,
          fabric_yards: customYards !== null ? customYards : getRecommendedYards(selectedStyle),
          style_type: selectedStyle
        }}
        savedAddresses={savedAddresses}
        savedMeasurements={savedMeasurements}
        onAddressChange={handleAddressUpdate}
        onMeasurementChange={(measurement) => {
          setSelectedMeasurement(measurement);
          // Recalculation happens automatically through the useMemo
        }}
        onTailorNotesChange={(notes) => setTailorNotes(notes)}
        isLoading={isLoading}
        isLoadingMeasurements={isLoadingMeasurements}
        isProcessingOrder={isProcessingOrder}
      />
    </div>
  )
}
