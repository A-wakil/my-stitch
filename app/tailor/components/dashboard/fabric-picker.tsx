import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X, Plus } from "lucide-react"
import { Fabric, Color } from "../../types/design"
import styles from './styles/FabricPicker.module.css'
import toast from "react-hot-toast"

interface FabricPickerProps {
  fabrics: Fabric[]
  setFabrics: React.Dispatch<React.SetStateAction<Fabric[]>>
}

export function FabricPicker({ fabrics, setFabrics }: FabricPickerProps) {
  const [fabricName, setFabricName] = useState("")
  const [fabricImage, setFabricImage] = useState<File | null>(null)
  const [colorName, setColorName] = useState("#000000")
  const [fabricPrice, setFabricPrice] = useState("")
  const [stitchingPrice, setStitchingPrice] = useState("")

  const isFormValid = () => {
    if (!fabricName.trim()) return { valid: false, message: "Please enter a fabric name" }
    if (!fabricPrice) return { valid: false, message: "Please enter a price per yard" }
    if (!stitchingPrice) return { valid: false, message: "Please enter a stitching price" }
    if (!fabricImage) return { valid: false, message: "Please upload a fabric image" }
    return { valid: true, message: "" }
  }

  const addFabric = () => {
    const validation = isFormValid()
    if (!validation.valid) {
      toast.error(validation.message, {
        duration: 2000,
        position: 'top-center',
      })
      return
    }

    setFabrics((prevFabrics) => [...prevFabrics, { 
      name: fabricName, 
      image: fabricImage,
      yardPrice: parseFloat(fabricPrice) || 0,
      stitchPrice: parseFloat(stitchingPrice) || 0,
      colors: [] 
    }])
    setFabricName("")
    setFabricImage(null)
    setFabricPrice("")
    setStitchingPrice("")
  }

  const addColor = (fabricIndex: number) => {
    if (colorName) {
      setFabrics((prevFabrics) => {
        const newFabrics = [...prevFabrics];
        newFabrics[fabricIndex] = {
          ...newFabrics[fabricIndex],
          colors: [
            ...newFabrics[fabricIndex].colors,
            {
              name: colorName,
              image: null
            }
          ]
        };
        return newFabrics;
      });
      setColorName("#000000");
    }
  }

  const removeColor = (fabricIndex: number, colorIndex: number) => {
    setFabrics((prevFabrics) => {
      const newFabrics = [...prevFabrics];
      newFabrics[fabricIndex] = {
        ...newFabrics[fabricIndex],
        colors: newFabrics[fabricIndex].colors.filter((_, i) => i !== colorIndex)
      };
      return newFabrics;
    });
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
      <Label style={{ fontSize: '1rem', fontWeight: 'bold', paddingBottom: '1rem' }}>Enter Available Fabrics Types: </Label>
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
              <p className="text-sm text-gray-600">
                ${fabric.yardPrice.toFixed(2)} per yard | Stitching: ${fabric.stitchPrice.toFixed(2)}
              </p>
              {fabric.image && (
                <img
                  src={fabric.image instanceof File ? URL.createObjectURL(fabric.image) : fabric.image}
                  alt={fabric.name}
                  className={styles['fabric-image']}
                />
              )}
              

              <div className="mt-4">
                <Label style={{ fontSize: '1rem', fontWeight: 'bold', paddingBottom: '1rem' }}>Add Available Colors:</Label>
                <div className={styles['color-list']}>
                  {fabric.colors.map((color, colorIndex) => (
                    <div 
                      key={colorIndex} 
                      className={styles['color-pill']}
                    >
                      <div 
                        className={styles['color-swatch']}
                        style={{ backgroundColor: color.name }}
                      />
                      <span>{color.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={styles['remove-button']}
                        onClick={() => removeColor(fabricIndex, colorIndex)}
                      >
                        <X className={styles['remove-icon']} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2 mt-2">
                  <Input 
                    type="color" 
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="w-20"
                  />
                  <Button 
                    type="button" 
                    onClick={() => addColor(fabricIndex)}
                    className={styles['add-button']}
                  >
                    <Plus className={styles['add-button-icon']} />
                    Add Color
                  </Button>
                </div>
                
                
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-x-2">
        <div style={{ fontSize: '1rem', fontWeight: 'bold', paddingBottom: 0, paddingTop: '1rem' }}>Add New Fabric:</div>
        <Input placeholder="Fabric name" value={fabricName} onChange={(e) => setFabricName(e.target.value)} />
        <Input 
          type="number" 
          placeholder="Price per yard" 
          value={fabricPrice} 
          onChange={(e) => setFabricPrice(e.target.value)}
          step="0.01"
          min="0"
        />
        <Input 
          type="number" 
          placeholder="Stitching Price" 
          value={stitchingPrice} 
          onChange={(e) => setStitchingPrice(e.target.value)}
          step="0.01"
          min="0"
        />
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className={styles['file-input']}
        />
        <Button 
          type="button" 
          onClick={addFabric} 
          className={`${styles['add-fabric-button']} ${!isFormValid().valid ? styles['add-fabric-button-disabled'] : ''}`}
        >
          <Plus className={styles['add-button-icon']} />
          Add Fabric
        </Button>
      </div>
    </div>
  )
}

