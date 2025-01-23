'use client'
import React from 'react'
import { useState } from 'react'
import { Header } from "../ui/Header/Header"
import Image from 'next/image'
import styles from './page.module.css'

interface Design {
  id: string
  title: string
  images: string[]
  colors: string[]
  fabrics: {
    name: string
    texture: string
    price: number
  }[]
}

interface TailorProfile {
  brandName: string
  ownerName: string
  logo: string
  address: string
  rating: number
  reviews: number
  designs: Design[]
}

export default function Dashboard() {
  const [activeDesignIndex, setActiveDesignIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Mock data - would come from API/database in production
  const profile: TailorProfile = {
    brandName: "Elite Tailoring",
    ownerName: "John Smith",
    logo: "/tailor-logo.png",
    address: "123 Fashion St, New York, NY",
    rating: 4.8,
    reviews: 156,
    designs: [
      {
        id: "1",
        title: "Classic Three-Piece Suit",
        images: ["/suit1.jpg", "/suit2.jpg", "/suit3.jpg"],
        colors: ["Navy", "Charcoal", "Black"],
        fabrics: [
          { name: "Italian Wool", texture: "Fine Worsted", price: 899 },
          { name: "Cashmere Blend", texture: "Luxury", price: 1299 },
          { name: "Cotton Blend", texture: "Summer Weight", price: 699 }
        ]
      }
    ]
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <main className="container mx-auto px-4 py-8">
          {/* Tailor Profile Section */}
          <div className={styles.profileCard}>
            <div className={styles.profileInfo}>
              <Image
                src={profile.logo}
                alt={profile.brandName}
                width={100}
                height={100}
                className={styles.logo}
              />
              <div>
                <h1 className="text-2xl font-bold">{profile.brandName}</h1>
                <p className="text-gray-600">{profile.ownerName}</p>
                <p className="text-gray-500">{profile.address}</p>
                <div className={styles.rating}>
                  <span className={styles.starIcon}>★</span>
                  <span>{profile.rating}</span>
                  <span className="text-gray-400">({profile.reviews} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Designs Gallery */}
          <div className={styles.designsGallery}>
            <h2 className="text-xl font-semibold mb-6">My Designs</h2>
            
            {profile.designs.map((design, index) => (
              <div key={design.id} className="mb-8">
                <h3 className="text-lg font-medium mb-4">{design.title}</h3>
                
                {/* Image Carousel */}
                <div className={styles.imageCarousel}>
                  <Image
                    src={design.images[currentImageIndex]}
                    alt={`${design.title} view ${currentImageIndex + 1}`}
                    fill
                    className={styles.carouselImage}
                  />
                  <div className={styles.carouselDots}>
                    {design.images.map((_, imgIndex) => (
                      <button
                        key={imgIndex}
                        className={`${styles.dot} ${
                          currentImageIndex === imgIndex ? styles.dotActive : ''
                        }`}
                        onClick={() => setCurrentImageIndex(imgIndex)}
                      />
                    ))}
                  </div>
                </div>

                {/* Colors and Fabrics */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Available Colors</h4>
                    <div className="flex gap-2">
                      {design.colors.map((color) => (
                        <span
                          key={color}
                          className={styles.colorChip}
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Fabric Options</h4>
                    <div className="space-y-2">
                      {design.fabrics.map((fabric) => (
                        <div
                          key={fabric.name}
                          className={styles.fabricOption}
                        >
                          <div>
                            <span className="font-medium">{fabric.name}</span>
                            <span className={styles.fabricTexture}>
                              ({fabric.texture})
                            </span>
                          </div>
                          <span className="font-medium">${fabric.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}