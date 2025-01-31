import { NextResponse } from "next/server"
import { designs } from "../route"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const design = designs.find((d) => d.id === id)

  if (design) {
    return NextResponse.json(design)
  } else {
    return NextResponse.json({ message: "Design not found" }, { status: 404 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const formData = await request.formData()

  const designIndex = designs.findIndex((d) => d.id === id)

  if (designIndex !== -1) {
    designs[designIndex] = {
      ...designs[designIndex],
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      images: formData.getAll("images[]").map((image) => URL.createObjectURL(image as File)),
      fabrics: formData.getAll("fabrics[][name]").map((name, index) => ({
        name: name as string,
        image: formData.get(`fabrics[${index}][image]`)
          ? URL.createObjectURL(formData.get(`fabrics[${index}][image]`) as File)
          : designs[designIndex].fabrics[index].image,
        colors: formData.getAll(`fabrics[${index}][colors][][name]`).map((colorName, colorIndex) => ({
          name: colorName as string,
          image: formData.get(`fabrics[${index}][colors][${colorIndex}][image]`)
            ? URL.createObjectURL(formData.get(`fabrics[${index}][colors][${colorIndex}][image]`) as File)
            : designs[designIndex].fabrics[index].colors[colorIndex].image,
        }))
      })),
    }

    return NextResponse.json({ message: "Design updated successfully", design: designs[designIndex] })
  } else {
    return NextResponse.json({ message: "Design not found" }, { status: 404 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  const designIndex = designs.findIndex((d) => d.id === id)

  if (designIndex !== -1) {
    designs.splice(designIndex, 1)
    return NextResponse.json({ message: "Design deleted successfully" })
  } else {
    return NextResponse.json({ message: "Design not found" }, { status: 404 })
  }
}

