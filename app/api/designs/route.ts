import { NextResponse } from "next/server"

// Mock data for demonstration purposes
const designs = [
  {
    id: "1",
    title: "Summer Dress",
    description: "A light and airy summer dress",
    images: ["/placeholder.svg", "/placeholder.svg"],
    colors: [
      { name: "Red", image: "/color-red.svg" },
      { name: "Blue", image: "/color-blue.svg" },
    ],
    fabrics: [
      { name: "Cotton", image: "/fabric-cotton.svg" },
      { name: "Linen", image: "/fabric-linen.svg" },
    ],
  },
  {
    id: "2",
    title: "Winter Coat",
    description: "A warm and stylish winter coat",
    images: ["/placeholder.svg"],
    colors: [
      { name: "Black", image: "/color-black.svg" },
      { name: "Gray", image: "/color-gray.svg" },
    ],
    fabrics: [
      { name: "Wool", image: "/fabric-wool.svg" },
      { name: "Cashmere", image: "/fabric-cashmere.svg" },
    ],
  },
]

export async function GET() {
  return NextResponse.json(designs)
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const newDesign = {
    id: Date.now().toString(),
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    images: formData.getAll("images[]").map((image) => URL.createObjectURL(image as File)),
    colors: formData.getAll("colors[][name]").map((name, index) => ({
      name: name as string,
      image: formData.get(`colors[${index}][image]`)
        ? URL.createObjectURL(formData.get(`colors[${index}][image]`) as File)
        : "/placeholder.svg",
    })),
    fabrics: formData.getAll("fabrics[][name]").map((name, index) => ({
      name: name as string,
      image: formData.get(`fabrics[${index}][image]`)
        ? URL.createObjectURL(formData.get(`fabrics[${index}][image]`) as File)
        : "/placeholder.svg",
    })),
  }

  designs.push(newDesign)

  return NextResponse.json({ message: "Design submitted successfully", design: newDesign }, { status: 201 })
}

