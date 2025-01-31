import { NextResponse } from "next/server"

interface Design {
  id: string;
  title: string;
  description: string;
  images: string[];
  fabrics: {
    name: string;
    image: string;
    colors: { name: string; image: string; }[];
  }[];
}

// Mock data for demonstration purposes
export const designs: Design[] = [
  {
    id: "1",
    title: "Summer Dress",
    description: "A light and airy summer dress",
    images: ["/placeholder.svg", "/placeholder.svg"],
    fabrics: [
      { 
        name: "Cotton", 
        image: "/fabric-cotton.svg",
        colors: [
          { name: "Red", image: "/color-red.svg" },
          { name: "Blue", image: "/color-blue.svg" }
        ]
      },
      { 
        name: "Linen", 
        image: "/fabric-linen.svg",
        colors: [
          { name: "Black", image: "/color-black.svg" },
          { name: "Gray", image: "/color-gray.svg" }
        ]
      }
    ]
  },
  {
    id: "2",
    title: "Winter Coat",
    description: "A warm and stylish winter coat",
    images: ["/placeholder.svg"],
    fabrics: [
      { 
        name: "Wool", 
        image: "/fabric-wool.svg",
        colors: [
          { name: "Black", image: "/color-black.svg" },
          { name: "Gray", image: "/color-gray.svg" }
        ]
      },
      { 
        name: "Cashmere", 
        image: "/fabric-cashmere.svg",
        colors: [
          { name: "Beige", image: "/color-beige.svg" },
          { name: "Brown", image: "/color-brown.svg" }
        ]
      }
    ],
  },
]

export async function GET() {
  return NextResponse.json(designs)
}

export async function POST(request: Request) {
  const formData = await request.formData()

  // Parse the fabrics JSON string
  const fabricsData = JSON.parse(formData.get("fabrics") as string)
  
  // Get any fabric images that were uploaded
  const fabricImages: Record<number, File> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('fabricImages[')) {
      const index = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0')
      fabricImages[index] = value as File
    }
  }

  const newDesign: Design = {
    id: Date.now().toString(),
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    images: formData.getAll("images").map((image) => URL.createObjectURL(image as File)),
    fabrics: fabricsData.map((fabric: any, index: number) => ({
      name: fabric.name,
      image: fabricImages[index] 
        ? URL.createObjectURL(fabricImages[index])
        : "/placeholder.svg",
      colors: fabric.colors.map((color: { name: string; image: string | null; }) => ({
        name: color.name,
        image: color.image || "/placeholder.svg"
      }))
    }))
  }

  designs.push(newDesign)

  return NextResponse.json(
    { message: "Design submitted successfully", design: newDesign }, 
    { status: 201 }
  )
}

