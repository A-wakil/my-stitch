import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X } from "lucide-react"
import styles from './styles/ImageUpload.module.css'

interface ImageUploadProps {
  images: File[]
  setImages: React.Dispatch<React.SetStateAction<File[]>>
  initialImages?: string[]
}

export function ImageUpload({ images, setImages, initialImages = [] }: ImageUploadProps) {
  const [existingImages, setExistingImages] = useState<string[]>(initialImages || [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prevImages) => [...prevImages, ...Array.from(e.target.files || [])])
    }
  }

  const removeNewImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prevImages) => prevImages.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Label htmlFor="images">Upload Images</Label>
      <Input id="images" type="file" multiple accept="image/*" onChange={handleImageUpload} />
      <div className={styles['image-grid']}>
        {existingImages.map((imageUrl, index) => (
          <div key={`existing-${index}`} className={styles['image-container']}>
            <img
              src={imageUrl}
              alt={`Existing image ${index + 1}`}
              className={styles['design-image']}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeExistingImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {images.map((image, index) => (
          <div key={`new-${index}`} className={styles['image-container']}>
            <img
              src={URL.createObjectURL(image)}
              alt={`New image ${index + 1}`}
              className={styles['design-image']}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeNewImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

