import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X, Plus } from "lucide-react"
import { Fabric, Color } from "../../types/design"

interface FabricPickerProps {
  fabrics: Fabric[]
  setFabrics: React.Dispatch<React.SetStateAction<Fabric[]>>
}

export function FabricPicker({ fabrics, setFabrics }: FabricPickerProps) {
  const [fabricName, setFabricName] = useState("")
  const [fabricImage, setFabricImage] = useState<File | null>(null)
  const [colorName, setColorName] = useState("")

  const addFabric = () => {
    if (fabricName) {
      setFabrics((prevFabrics) => [...prevFabrics, { 
        name: fabricName, 
        image: fabricImage,
        colors: [] 
      }])
      setFabricName("")
      setFabricImage(null)
    }
  }

  const addColor = (fabricIndex: number) => {
    if (colorName) {
      setFabrics((prevFabrics) => {
        const newFabrics = [...prevFabrics]
        newFabrics[fabricIndex].colors.push({
          name: colorName,
          image: null
        })
        return newFabrics
      })
      setColorName("")
    }
  }

  const removeColor = (fabricIndex: number, colorIndex: number) => {
    setFabrics((prevFabrics) => {
      const newFabrics = [...prevFabrics]
      newFabrics[fabricIndex].colors.splice(colorIndex, 1)
      return newFabrics
    })
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
        <Button type="button" onClick={addFabric}>Add Fabric</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fabrics.map((fabric, fabricIndex) => (
          <div key={fabricIndex} className="relative p-4 border rounded">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeFabric(fabricIndex)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="space-y-2">
              <p className="font-semibold">{fabric.name}</p>
              {fabric.image && (
                <img
                  src={URL.createObjectURL(fabric.image)}
                  alt={fabric.name}
                  className="w-full h-20 object-cover rounded"
                />
              )}
              
              <div className="mt-4">
                <Label>Colors</Label>
                <div className="flex space-x-2 mt-2">
                  <Input 
                    type="color" 
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="w-20"
                  />
                  <Button type="button" onClick={() => addColor(fabricIndex)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {fabric.colors.map((color, colorIndex) => (
                    <div 
                      key={colorIndex} 
                      className="flex items-center space-x-1 bg-gray-100 rounded p-1"
                    >
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color.name }}
                      />
                      <span className="text-sm">{color.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => removeColor(fabricIndex, colorIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

