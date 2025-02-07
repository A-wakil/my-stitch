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
    colors: [
      { name: "Red", image: "/color-red.svg" },
      { name: "Blue", image: "/color-blue.svg" },
      { name: "Green", image: "/color-green.svg" },
    ],
    fabrics: [
      { name: "Cotton", image: "/fabric-cotton.svg" },
      { name: "Linen", image: "/fabric-linen.svg" },
    ],
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Colors:</h4>
            <div className="flex flex-wrap gap-2">
              {design.colors.map((color, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <img src={color.image || "/placeholder.svg"} alt={color.name} className="w-6 h-6 rounded-full" />
                  <span>{color.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Fabrics:</h4>
            <div className="flex flex-wrap gap-2">
              {design.fabrics.map((fabric, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <img src={fabric.image || "/placeholder.svg"} alt={fabric.name} className="w-6 h-6 rounded" />
                  <span>{fabric.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

