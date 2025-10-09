"use client"

import { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Updated mock data for designs
const designs = [
  {
    id: 1,
    title: "Summer Dress",
    images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
    price: 150.00,
  },
  // Add more designs here
]

export function DesignCarousel() {
  const [currentDesign, setCurrentDesign] = useState(0)
  const [currentImage, setCurrentImage] = useState(0)

  const nextDesign = () => {
    setCurrentDesign((prev) => (prev + 1) % designs.length)
    setCurrentImage(0)
  }

  const prevDesign = () => {
    setCurrentDesign((prev) => (prev - 1 + designs.length) % designs.length)
    setCurrentImage(0)
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % designs[currentDesign].images.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + designs[currentDesign].images.length) % designs[currentDesign].images.length)
  }

  const design = designs[currentDesign]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold">{design.title}</h3>
          <div>
            <Button variant="outline" size="icon" onClick={prevDesign}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextDesign}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative aspect-video mb-4">
          <img
            src={design.images[currentImage] || "/placeholder.svg"}
            alt={`${design.title} - Image ${currentImage + 1}`}
            className="object-cover w-full h-full"
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-2 transform -translate-y-1/2"
            onClick={prevImage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-2 transform -translate-y-1/2"
            onClick={nextImage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Price:</h4>
          <p className="text-2xl font-bold">${design.price.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

