import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X } from "lucide-react"

interface ImageUploadProps {
  images: File[]
  setImages: React.Dispatch<React.SetStateAction<File[]>>
  initialImages?: string[]
}

export function ImageUpload({ images, setImages }: ImageUploadProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prevImages) => [...prevImages, ...Array.from(e.target.files || [])])
    }
  }

  const removeImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Label htmlFor="images">Upload Images</Label>
      <Input id="images" type="file" multiple accept="image/*" onChange={handleImageUpload} />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={URL.createObjectURL(image) || "/placeholder.svg"}
              alt={`Uploaded image ${index + 1}`}
              className="w-full h-32 object-cover rounded"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1"
              onClick={() => removeImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

