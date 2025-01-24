import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X } from "lucide-react"

interface Color {
  name: string
  image: File | null
}

interface ColorPickerProps {
  colors: Color[]
  setColors: React.Dispatch<React.SetStateAction<Color[]>>
}

export function ColorPicker({ colors, setColors }: ColorPickerProps) {
  const [colorName, setColorName] = useState("")
  const [colorImage, setColorImage] = useState<File | null>(null)

  const addColor = () => {
    if (colorName) {
      setColors((prevColors) => [...prevColors, { name: colorName, image: colorImage }])
      setColorName("")
      setColorImage(null)
    }
  }

  const removeColor = (index: number) => {
    setColors((prevColors) => prevColors.filter((_, i) => i !== index))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setColorImage(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <Label>Available Colors</Label>
      <div className="flex space-x-2">
        <Input placeholder="Color name" value={colorName} onChange={(e) => setColorName(e.target.value)} />
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        <Button onClick={addColor}>Add Color</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {colors.map((color, index) => (
          <div key={index} className="relative p-2 border rounded">
            <p>{color.name}</p>
            {color.image && (
              <img
                src={URL.createObjectURL(color.image) || "/placeholder.svg"}
                alt={color.name}
                className="w-full h-20 object-cover mt-2 rounded"
              />
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1"
              onClick={() => removeColor(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

