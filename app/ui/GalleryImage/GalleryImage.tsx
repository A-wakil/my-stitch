import { useState } from 'react'
import Image from 'next/image'
import { CustomButton, CustomInput } from '../custom-components/custom-components'
import './GalleryImage.css'

interface GalleryImageProps {
  src: string
  alt: string
}

export function GalleryImage({ src, alt}: GalleryImageProps) {

  
  return (
    <>
      <div className="gallery-image">
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
    </>
  )
}

