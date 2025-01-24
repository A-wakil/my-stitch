import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X } from "lucide-react"

interface Fabric {
  name: string
  image: File | null
}

interface FabricPickerProps {
  fabrics: Fabric[]
  setFabrics: React.Dispatch<React.SetStateAction<Fabric[]>>
}

export function FabricPicker({ fabrics, setFabrics }: FabricPickerProps) {
  const [fabricName, setFabricName] = useState("")
  const [fabricImage, setFabricImage] = useState<File | null>(null)

  const addFabric = () => {
    if (fabricName) {
      setFabrics((prevFabrics) => [...prevFabrics, { name: fabricName, image: fabricImage }])
      setFabricName("")
      setFabricImage(null)
    }
  }

  const removeFabric = (index: number) => {
    setFabrics((prevFabrics) => prevFabrics.filter((_, i) => i !== index))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFabricImage(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <Label>Available Fabrics</Label>
      <div className="flex space-x-2">
        <Input placeholder="Fabric name" value={fabricName} onChange={(e) => setFabricName(e.target.value)} />
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        <Button onClick={addFabric}>Add Fabric</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {fabrics.map((fabric, index) => (
          <div key={index} className="relative p-2 border rounded">
            <p>{fabric.name}</p>
            {fabric.image && (
              <img
                src={URL.createObjectURL(fabric.image) || "/placeholder.svg"}
                alt={fabric.name}
                className="w-full h-20 object-cover mt-2 rounded"
              />
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1"
              onClick={() => removeFabric(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

