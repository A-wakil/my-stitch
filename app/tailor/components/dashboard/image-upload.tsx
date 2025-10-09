import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X, Video, Image as ImageIcon, GripVertical } from "lucide-react"
import styles from './styles/ImageUpload.module.css'
import { toast } from 'react-hot-toast'

interface ImageUploadProps {
  images: File[]
  setImages: React.Dispatch<React.SetStateAction<File[]>>
  initialImages?: string[]
  setExistingImages?: React.Dispatch<React.SetStateAction<string[]>>
  videos?: File[]
  setVideos?: React.Dispatch<React.SetStateAction<File[]>>
  initialVideos?: string[]
  setExistingVideos?: React.Dispatch<React.SetStateAction<string[]>>
}

type MediaItem = {
  type: 'image' | 'video'
  url?: string
  file?: File
  index: number
  isExisting: boolean
}

export function ImageUpload({ 
  images, 
  setImages, 
  initialImages = [], 
  setExistingImages,
  videos = [], 
  setVideos, 
  initialVideos = [],
  setExistingVideos 
}: ImageUploadProps) {
  const existingImages = initialImages
  const existingVideos = initialVideos

  // Validate video duration
  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        const duration = video.duration
        if (duration > 20) {
          toast.error(`Video "${file.name}" is too long. Maximum duration is 20 seconds.`)
          resolve(false)
        } else {
          resolve(true)
        }
      }
      
      video.onerror = () => {
        toast.error(`Error loading video "${file.name}"`)
        resolve(false)
      }
      
      video.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prevImages) => [...prevImages, ...Array.from(e.target.files || [])])
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && setVideos) {
      const files = Array.from(e.target.files)
      const validVideos: File[] = []
      
      for (const file of files) {
        const isValid = await validateVideoDuration(file)
        if (isValid) {
          validVideos.push(file)
        }
      }
      
      if (validVideos.length > 0) {
        setVideos((prevVideos) => [...prevVideos, ...validVideos])
        toast.success(`${validVideos.length} video(s) added successfully`)
      }
    }
  }

  const removeNewImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    if (setExistingImages) {
      setExistingImages((prevImages) => prevImages.filter((_, i) => i !== index))
    }
  }

  const removeNewVideo = (index: number) => {
    if (setVideos) {
      setVideos((prevVideos) => prevVideos.filter((_, i) => i !== index))
    }
  }

  const removeExistingVideo = (index: number) => {
    if (setExistingVideos) {
      setExistingVideos((prevVideos) => prevVideos.filter((_, i) => i !== index))
    }
  }

  return (
    <div className={styles.uploadWrapper}>
      <div className={styles.uploadButtons}>
        <div className={styles.uploadGroup}>
          <Label htmlFor="images" className={styles.uploadLabel}>
            <ImageIcon className={styles.uploadIcon} />
            Upload Images
          </Label>
          <Input 
            id="images" 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleImageUpload}
            className={styles.fileInput}
          />
        </div>
        
        <div className={styles.uploadGroup}>
          <Label htmlFor="videos" className={styles.uploadLabel}>
            <Video className={styles.uploadIcon} />
            Upload Videos (max 20s)
          </Label>
          <Input 
            id="videos" 
            type="file" 
            multiple 
            accept="video/mp4,video/mov,video/webm" 
            onChange={handleVideoUpload}
            className={styles.fileInput}
          />
        </div>
      </div>

      <div className={styles['image-grid']}>
        {/* Existing Images */}
        {existingImages.map((imageUrl, index) => (
          <div key={`existing-img-${index}`} className={styles['image-container']}>
            <div className={styles.mediaTypeIndicator}>
              <ImageIcon className={styles.mediaIcon} />
            </div>
            <img
              src={imageUrl}
              alt={`Existing image ${index + 1}`}
              className={styles['design-image']}
            />
            <Button
              variant="destructive"
              size="icon"
              className={styles.deleteButton}
              onClick={() => removeExistingImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {/* Existing Videos */}
        {existingVideos.map((videoUrl, index) => (
          <div key={`existing-vid-${index}`} className={styles['image-container']}>
            <div className={styles.mediaTypeIndicator}>
              <Video className={styles.mediaIcon} />
            </div>
            <video
              src={videoUrl}
              className={styles['design-image']}
              muted
            />
            <div className={styles.videoDurationBadge}>Video</div>
            <Button
              variant="destructive"
              size="icon"
              className={styles.deleteButton}
              onClick={() => removeExistingVideo(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {/* New Images */}
        {images.map((image, index) => (
          <div key={`new-img-${index}`} className={styles['image-container']}>
            <div className={styles.mediaTypeIndicator}>
              <ImageIcon className={styles.mediaIcon} />
            </div>
            <img
              src={URL.createObjectURL(image)}
              alt={`New image ${index + 1}`}
              className={styles['design-image']}
            />
            <Button
              variant="destructive"
              size="icon"
              className={styles.deleteButton}
              onClick={() => removeNewImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {/* New Videos */}
        {videos.map((video, index) => (
          <div key={`new-vid-${index}`} className={styles['image-container']}>
            <div className={styles.mediaTypeIndicator}>
              <Video className={styles.mediaIcon} />
            </div>
            <video
              src={URL.createObjectURL(video)}
              className={styles['design-image']}
              muted
            />
            <div className={styles.videoDurationBadge}>Video</div>
            <Button
              variant="destructive"
              size="icon"
              className={styles.deleteButton}
              onClick={() => removeNewVideo(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

