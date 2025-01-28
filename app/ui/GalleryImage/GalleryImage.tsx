import { useState } from 'react'
import Image from 'next/image'
import { CustomButton, CustomInput } from '../custom-components/custom-components'
import './GalleryImage.css'

interface GalleryImageProps {
  src: string
  alt: string
  onClick: () => void
}

export function GalleryImage({ src, alt, onClick }: GalleryImageProps) {
  return (
    <div className="gallery-image-container" onClick={onClick}>
      <Image
        src={src}
        alt={alt}
        width={400}
        height={600}
        className="gallery-image w-full h-full object-cover"
      />
      <div className="gallery-image-overlay">
        <span className="gallery-image-text">Order Now</span>
      </div>
    </div>
  )
}

