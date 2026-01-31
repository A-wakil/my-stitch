import { useEffect, useState } from 'react'
import Image from 'next/image'
import './GalleryImage.css'
import { useCurrency } from '../../../context/CurrencyContext'
import { calculateCustomerPrice } from '../../../lib/pricing'
import { CurrencyCode } from '../../../lib/types'

interface GalleryImageProps {
  images: string[]
  alt: string
  onClick: () => void
  isNavigating?: boolean
  price?: number
  priceCurrency?: CurrencyCode
  isPriority?: boolean
}

export function GalleryImage({
  images,
  alt,
  onClick,
  isNavigating = false,
  price,
  priceCurrency = 'USD',
  isPriority = false
}: GalleryImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('');
  const [formattedPrice, setFormattedPrice] = useState<string | null>(null);
  const { formatAmount, convertToPreferred } = useCurrency()

  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    let isMounted = true

    const formatPrice = async () => {
      if (typeof price !== 'number' || Number.isNaN(price)) {
        if (isMounted) setFormattedPrice(null)
        return
      }

      const customerPrice = calculateCustomerPrice(price)
      try {
        const converted = await convertToPreferred(customerPrice, priceCurrency)
        if (isMounted) {
          setFormattedPrice(formatAmount(converted))
        }
      } catch (error) {
        console.error('Error converting price:', error)
        if (isMounted) {
          setFormattedPrice(formatAmount(customerPrice))
        }
      }
    }

    formatPrice()

    return () => {
      isMounted = false
    }
  }, [price, convertToPreferred, formatAmount])

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('slide-left');
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('slide-right');
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToSlide = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection(index > currentImageIndex ? 'slide-left' : 'slide-right');
    setCurrentImageIndex(index);
  };

  const handleClick = () => {
    if (isNavigating) return
    onClick()
  }

  return (
    <div
      className={`gallery-image-container ${isNavigating ? 'is-loading' : ''}`}
      onClick={handleClick}
    >
      <div className="image-wrapper">
        <Image
          key={currentImageIndex}
          src={images[currentImageIndex]}
          alt={alt}
          width={400}
          height={600}
          priority={isPriority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={`gallery-image ${slideDirection}`}
          onAnimationEnd={() => setSlideDirection('')}
        />
        {formattedPrice && (
          <div className="price-tag" aria-label={`Price ${formattedPrice}`}>
            {formattedPrice}
          </div>
        )}
        {isNavigating && (
          <div className="gallery-image-loading" role="status" aria-live="polite">
            <div className="gallery-image-spinner" aria-hidden="true" />
            <span>Opening design…</span>
          </div>
        )}
      </div>
      {hasMultipleImages && (
        <div className="gallery-controls">
          <button 
            className="minimal-button left" 
            onClick={prevImage}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button 
            className="minimal-button right" 
            onClick={nextImage}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
      <div className="dot-indicators">
        {images.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentImageIndex ? 'active' : ''}`}
            onClick={goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

