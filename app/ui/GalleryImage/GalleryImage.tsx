import { useState } from 'react'
import Image from 'next/image'
import { CustomButton, CustomInput } from '../custom-components/custom-components'
import './GalleryImage.css'

interface GalleryImageProps {
  src: string
  alt: string
  waitlistLink: string
}

export function GalleryImage({ src, alt, waitlistLink }: GalleryImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [height, setHeight] = useState(170)
  const [fitPreference, setFitPreference] = useState<string>('regular')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const specs = {
      height,
      fitPreference,
      additionalNotes,
    }
    window.location.href = `${waitlistLink}?specs=${encodeURIComponent(JSON.stringify(specs))}`
  }

  return (
    <>
      <div className="gallery-image" onClick={() => setIsModalOpen(true)}>
        <Image
          src={src}
          alt={alt}
          width={400}
          height={600}
          className="w-full h-full object-cover"
        />
        <div className="gallery-image-overlay">
          <span className="gallery-image-text">Order Now</span>
        </div>
      </div>

      {isModalOpen && (
        <div className="dialog-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog-title">Specify Your Order</h2>
            <p className="dialog-description">
              Please provide your measurements and preferences for your tailored item.
            </p>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-row">
                <label htmlFor="height" className="form-label">Height (cm)</label>
                <div className="form-input-group">
                  <input
                    type="range"
                    id="height"
                    min={150}
                    max={220}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full"
                  />
                  <span>{height}</span>
                </div>
              </div>
              <div className="form-row">
                <span className="form-label">Fit Preference</span>
                <div className="form-checkbox-group">
                  {['slim', 'regular', 'loose'].map((fit) => (
                    <label key={fit} className="form-checkbox-label">
                      <input
                        type="radio"
                        name="fitPreference"
                        value={fit}
                        checked={fitPreference === fit}
                        onChange={() => setFitPreference(fit)}
                      />
                      <span className="capitalize">{fit}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="additionalNotes" className="form-label">Additional Notes</label>
                <CustomInput
                  id="additionalNotes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
              <div className="form-footer">
                <CustomButton type="submit">Submit and Join Waitlist</CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

