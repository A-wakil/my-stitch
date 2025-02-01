export interface Color {
  name: string
  image: File | null
}

export interface Fabric {
  name: string
  image: File | null
  price: number
  colors: Color[]
} 
