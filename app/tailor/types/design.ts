export interface Color {
  name: string
  image: File | null
}

export interface Fabric {
  name: string
  image: string | File | null
  yardPrice: number
  stitchPrice: number
  colors: Array<{
    name: string
    image: string | File | null
  }>
} 
