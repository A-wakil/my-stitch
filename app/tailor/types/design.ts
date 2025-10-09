export interface Color {
  name: string
  image: File | null
}

export interface Fabric {
  name: string
  image: string | File | null
  totalPrice: number
  colors: Array<{
    name: string
    image: string | File | null
  }>
}
export type Profile = {
  brandName: string
  tailorName: string
  logo: string
  bannerImage: string
  address: string
  phone: string
  email: string
  bio: string
  rating: number
  website: string
  experience: string
  specializations: string[]
}
