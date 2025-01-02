'use client'


import "./page.css"
import AttireWrapper from "./ui/attire/attire";
import { sampleAttire } from "./ui/sample_attire";
import { useState, useCallback } from 'react'
import { Header } from "./ui/Header/Header";
import { GalleryImage } from "./ui/GalleryImage/GalleryImage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { Attire } from "./lib/definitions";


const sampleAttires = [
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Suit 1' },
  { src: '/image_1.webp', alt: 'Tailored Dress 1' },
  { src: '/image_1.webp', alt: 'Tailored Shirt 1' },
  { src: '/image_1.webp', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Pants 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
]


export default function Home() {
  const [attires, setAttires] = useState(sampleAttires)
  const [page, setPage] = useState(1)

  const loadMoreAttires = useCallback(() => {
    // Simulate loading more images
    setTimeout(() => {
      setAttires(prevAttires => [...prevAttires, ...sampleAttires])
      setPage(prevPage => prevPage + 1)
      setIsFetching(false)
    }, 1000)
  }, [])

  const { isFetching, setIsFetching } = useInfiniteScroll(loadMoreAttires)

  const waitlistLink = '/waitlistlink'




  return (
    <div className="min-h-screen">
      <Header waitlistLink={waitlistLink} />
      <main className="main-content container">
        <div className="gallery-grid">
          {attires.map((attire, index) => (
            <GalleryImage
              key={`${attire.alt}-${index}`}
              src={attire.src}
              alt={attire.alt}
              waitlistLink={waitlistLink}
            />
          ))}
        </div>
        {isFetching && <p className="loading-message">Loading more...</p>}
      </main>
    </div>
     
  );
}
