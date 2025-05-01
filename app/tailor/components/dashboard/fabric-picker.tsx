import { useState, useMemo } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { X, Plus, Info, Edit, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Fabric} from "../../types/design"
import styles from './styles/FabricPicker.module.css'
import toast from "react-hot-toast"

interface FabricPickerProps {
  fabrics: Fabric[]
  setFabrics: React.Dispatch<React.SetStateAction<Fabric[]>>
}

export function FabricPicker({ fabrics, setFabrics }: FabricPickerProps) {
  const [fabricName, setFabricName] = useState("")
  const [fabricImage, setFabricImage] = useState<File | null>(null)
  const [fabricPrice, setFabricPrice] = useState("")
  const [stitchingPrice, setStitchingPrice] = useState("")
  const [editingFabricIndex, setEditingFabricIndex] = useState<number | null>(null)
  const [showEditDetails, setShowEditDetails] = useState<{[key: number]: boolean}>({})

  const formValidation = useMemo(() => {
    if (!fabricName.trim()) return { valid: false, message: "Please enter a fabric name" }
    if (!fabricPrice) return { valid: false, message: "Please enter a price per yard" }
    if (!stitchingPrice) return { valid: false, message: "Please enter a stitching price" }
    if (!fabricImage) return { valid: false, message: "Please upload a fabric image" }
    return { valid: true, message: "" }
  }, [fabricName, fabricPrice, stitchingPrice, fabricImage])

  const addFabric = () => {
    if (!formValidation.valid) {
      toast.error(formValidation.message, {
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

  const handleColorAdd = (fabricIndex: number, colorValue: string) => {
    if (!colorValue) return;
    
    setFabrics(prevFabrics => {
      const newFabrics = [...prevFabrics];
      newFabrics[fabricIndex] = {
        ...newFabrics[fabricIndex],
        colors: [
          ...newFabrics[fabricIndex].colors,
          { name: colorValue, image: null }
        ]
      };
      return newFabrics;
    });
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
    setEditingFabricIndex(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFabricImage(e.target.files[0])
    }
  }

  const handleFabricImageUpdate = (e: React.ChangeEvent<HTMLInputElement>, fabricIndex: number) => {
    if (e.target.files && e.target.files[0]) {
      setFabrics((prevFabrics) => {
        const newFabrics = [...prevFabrics];
        newFabrics[fabricIndex] = {
          ...newFabrics[fabricIndex],
          image: e.target.files![0]
        };
        return newFabrics;
      });
    }
  }

  const toggleEditMode = (index: number) => {
    if (editingFabricIndex === index) {
      setEditingFabricIndex(null);
    } else {
      setEditingFabricIndex(index);
    }
  }

  const toggleShowDetails = (index: number) => {
    setShowEditDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  const updateFabricField = (fabricIndex: number, field: string, value: string | number) => {
    setFabrics((prevFabrics) => {
      const newFabrics = [...prevFabrics];
      newFabrics[fabricIndex] = {
        ...newFabrics[fabricIndex],
        [field]: field.includes('Price') ? parseFloat(value as string) || 0 : value
      };
      return newFabrics;
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Fabrics</h2>
        <div className={styles.infoTooltip}>
          <Info className={styles.infoIcon} />
          <div className={styles.tooltipContent}>
            <p>Add all fabric options available for this design.</p>
            <p>For each fabric, specify:</p>
            <ul>
              <li>Fabric name (e.g., "Cotton", "Linen")</li>
              <li>Price per yard (how much each yard costs)</li>
              <li>Stitching price (base cost for tailoring)</li>
              <li>Available colors for this fabric</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Display Added Fabrics */}
      {fabrics.length > 0 && (
        <>
          <h3 className={styles.listTitle}>Added Fabrics:</h3>
          <div className={styles.fabricGrid}>
            {fabrics.map((fabric, fabricIndex) => (
              <div key={fabricIndex} className={styles.fabricCard}>
                <div className={styles.cardActionButtons}>
                  {editingFabricIndex === fabricIndex ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleEditMode(fabricIndex)}
                      className={styles.saveButton}
                      title="Save changes"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleEditMode(fabricIndex)}
                      className={styles.actionButton}
                      title="Edit fabric details"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className={styles.actionButton}
                    onClick={() => removeFabric(fabricIndex)}
                    aria-label="Remove fabric"
                    title="Remove fabric"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className={styles.fabricCardContent}>
                  {editingFabricIndex === fabricIndex ? (
                    <div className={styles.editableHeader}>
                      <Input 
                        value={fabric.name}
                        onChange={(e) => updateFabricField(fabricIndex, 'name', e.target.value)}
                        className={styles.editInput}
                      />
                    </div>
                  ) : (
                    <h4 className={styles.fabricName}>{fabric.name}</h4>
                  )}
                  
                  <div className={styles.fabricDetails}>
                    {editingFabricIndex === fabricIndex ? (
                      <>
                        <div className={styles.editFieldGroup}>
                          <Label className={styles.editLabel}>Yard Price ($)</Label>
                          <Input 
                            type="number"
                            value={fabric.yardPrice}
                            onChange={(e) => updateFabricField(fabricIndex, 'yardPrice', e.target.value)}
                            className={styles.editInput}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className={styles.editFieldGroup}>
                          <Label className={styles.editLabel}>Stitching Price ($)</Label>
                          <Input 
                            type="number"
                            value={fabric.stitchPrice}
                            onChange={(e) => updateFabricField(fabricIndex, 'stitchPrice', e.target.value)}
                            className={styles.editInput}
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.priceTag}>
                          <span className={styles.priceLabel}>Yard Price:</span>
                          <span className={styles.priceValue}>${fabric.yardPrice.toFixed(2)}</span>
                        </div>
                        <div className={styles.priceTag}>
                          <span className={styles.priceLabel}>Stitching:</span>
                          <span className={styles.priceValue}>${fabric.stitchPrice.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {fabric.image && (
                    <div className={styles.fabricImageContainer}>
                      <img
                        src={fabric.image instanceof File ? URL.createObjectURL(fabric.image) : fabric.image}
                        alt={fabric.name}
                        className={styles['fabric-image']}
                      />
                      {editingFabricIndex === fabricIndex && (
                        <div className={styles.updateImageContainer}>
                          <Label htmlFor={`fabric-image-${fabricIndex}`} className={styles.updateImageLabel}>Update Image</Label>
                          <Input 
                            id={`fabric-image-${fabricIndex}`}
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleFabricImageUpdate(e, fabricIndex)} 
                            className={styles.updateImageInput}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={styles.colorSection}>
                    <div className={styles.colorSectionHeader}>
                      <h5 className={styles.colorTitle}>
                        Available Colors: 
                        <span className={styles.colorCount}>
                          {fabric.colors.length > 0 ? ` (${fabric.colors.length})` : ''}
                        </span>
                      </h5>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowDetails(fabricIndex)}
                        className={styles.toggleDetailsButton}
                      >
                        {showEditDetails[fabricIndex] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        {showEditDetails[fabricIndex] ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    
                    {showEditDetails[fabricIndex] && (
                      <>
                        <div className={styles['color-list']}>
                          {fabric.colors.length > 0 ? (
                            fabric.colors.map((color, colorIndex) => (
                              <div key={colorIndex} className={styles['color-pill']}>
                                <div 
                                  className={styles['color-swatch']}
                                  style={{ backgroundColor: color.name }}
                                />
                                <span className={styles.colorName}>{color.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={styles['remove-button']}
                                  onClick={() => removeColor(fabricIndex, colorIndex)}
                                  aria-label="Remove color"
                                >
                                  <X className={styles['remove-icon']} />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className={styles.noColorsMessage}>
                              No colors added yet
                            </div>
                          )}
                        </div>
                        <div className={styles.colorPickerContainer}>
                          <Input 
                            type="color" 
                            id={`color-input-${fabricIndex}`}
                            name="colorInput"
                            defaultValue="#000000"
                            className={styles.colorPicker}
                            aria-label="Select color"
                          />
                          <Button 
                            type="button"
                            onClick={() => {
                              const colorInput = document.getElementById(`color-input-${fabricIndex}`) as HTMLInputElement;
                              handleColorAdd(fabricIndex, colorInput.value);
                              colorInput.value = "#000000";
                            }}
                            className={styles['add-button']}
                          >
                            <Plus className={styles['add-button-icon']} />
                            Add Color
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add New Fabric Form */}
      <div className={styles.addFabricSection}>
        <h3 className={styles.formTitle}>Add New Fabric</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <Label htmlFor="fabric-name" className={styles.formLabel}>Fabric Name</Label>
            <Input 
              id="fabric-name"
              placeholder="e.g., Cotton, Linen, Silk" 
              value={fabricName} 
              onChange={(e) => setFabricName(e.target.value)} 
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <Label htmlFor="yard-price" className={styles.formLabel}>Price Per Yard ($)</Label>
            <Input 
              id="yard-price"
              type="number" 
              placeholder="e.g., 30.00" 
              value={fabricPrice} 
              onChange={(e) => setFabricPrice(e.target.value)}
              step="0.01"
              min="0"
              className={styles.formInput}
            />
            <p className={styles.helpText}>How much each yard of this fabric costs</p>
          </div>
          
          <div className={styles.formGroup}>
            <Label htmlFor="stitching-price" className={styles.formLabel}>Stitching Price ($)</Label>
            <Input 
              id="stitching-price"
              type="number" 
              placeholder="e.g., 60.00" 
              value={stitchingPrice} 
              onChange={(e) => setStitchingPrice(e.target.value)}
              step="0.01"
              min="0"
              className={styles.formInput}
            />
            <p className={styles.helpText}>Base cost for tailoring with this fabric</p>
          </div>
          
          <div className={styles.formGroup}>
            <Label htmlFor="fabric-image" className={styles.formLabel}>Fabric Image</Label>
            <Input 
              id="fabric-image"
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className={styles.fileInput}
            />
            <p className={styles.helpText}>Upload a clear image of the fabric</p>
          </div>
        </div>
        
        <Button 
          type="button" 
          onClick={addFabric} 
          className={`${styles.addFabricButton} ${!formValidation.valid ? styles['add-fabric-button-disabled'] : ''}`}
          disabled={!formValidation.valid}
        >
          <Plus className={styles.addButtonIcon} />
          Add Fabric
        </Button>
      </div>
    </div>
  )
}