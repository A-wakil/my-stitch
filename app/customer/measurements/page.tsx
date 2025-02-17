'use client'

import { useState, useEffect, useRef } from 'react'
import './ProfileMeasurements.css'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { toast } from 'react-hot-toast'
import { supabase } from "../../lib/supabaseClient"
import { BsPerson, BsThreeDotsVertical } from 'react-icons/bs'

// Update type to match database column names
type MeasurementsType = {
  shoulder_to_elbow: string;
  shoulder_to_wrist: string;
  tricep_girth: string;
  elbow_girth: string;
  free_hand_girth: string;
  wrist_girth: string;
  neck: string;
  chest: string;
  tummy: string;
  hip: string;
  shirt_length: string;
  trouser_length: string;
  lap_girth: string;
  knee_girth: string;
  base_girth: string;
  waist_girth: string;
  hip_girth: string;
  agbada_sleeve: string;
  agbada_length: string;
}

export default function MeasurementsPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementsType>({
    shoulder_to_elbow: '',
    shoulder_to_wrist: '',
    tricep_girth: '',
    elbow_girth: '',
    free_hand_girth: '',
    wrist_girth: '',
    neck: '',
    chest: '',
    tummy: '',
    hip: '',
    shirt_length: '',
    trouser_length: '',
    lap_girth: '',
    knee_girth: '',
    base_girth: '',
    waist_girth: '',
    hip_girth: '',
    agbada_sleeve: '',
    agbada_length: ''
  })
  const [measurementsList, setMeasurementsList] = useState<Array<{ id: number, name: string }>>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null)
  const [newMeasurementName, setNewMeasurementName] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    async function fetchMeasurements() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No user found')
          return
        }

        const { data, error } = await supabase
          .from('measurements')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }

        console.log('Fetched measurements:', data) // Debug log
        setMeasurementsList(data || [])
      } catch (error) {
        console.error('Error fetching measurements:', error)
        toast.error('Failed to load measurements')
      }
    }

    fetchMeasurements()
  }, [])

  useEffect(() => {
    async function fetchMeasurementDetails() {
      if (!selectedMeasurementId) {
        setMeasurements({
          shoulder_to_elbow: '',
          shoulder_to_wrist: '',
          tricep_girth: '',
          elbow_girth: '',
          free_hand_girth: '',
          wrist_girth: '',
          neck: '',
          chest: '',
          tummy: '',
          hip: '',
          shirt_length: '',
          trouser_length: '',
          lap_girth: '',
          knee_girth: '',
          base_girth: '',
          waist_girth: '',
          hip_girth: '',
          agbada_sleeve: '',
          agbada_length: ''
        })
        return
      }

      try {
        const { data, error } = await supabase
          .from('measurements')
          .select('*')
          .eq('id', selectedMeasurementId)
          .single()

        if (error) throw error

        if (data) {
          const formattedData = {
            shoulder_to_elbow: data.shoulder_to_elbow?.toString() || '',
            shoulder_to_wrist: data.shoulder_to_wrist?.toString() || '',
            tricep_girth: data.tricep_girth?.toString() || '',
            elbow_girth: data.elbow_girth?.toString() || '',
            free_hand_girth: data.free_hand_girth?.toString() || '',
            wrist_girth: data.wrist_girth?.toString() || '',
            neck: data.neck?.toString() || '',
            chest: data.chest?.toString() || '',
            tummy: data.tummy?.toString() || '',
            hip: data.hip?.toString() || '',
            shirt_length: data.shirt_length?.toString() || '',
            trouser_length: data.trouser_length?.toString() || '',
            lap_girth: data.lap_girth?.toString() || '',
            knee_girth: data.knee_girth?.toString() || '',
            base_girth: data.base_girth?.toString() || '',
            waist_girth: data.waist_girth?.toString() || '',
            hip_girth: data.hip_girth?.toString() || '',
            agbada_sleeve: data.agbada_sleeve?.toString() || '',
            agbada_length: data.agbada_length?.toString() || ''
          }
          
          setMeasurements(formattedData)
        }
      } catch (error) {
        console.error('Error fetching measurement details:', error)
      }
    }

    fetchMeasurementDetails()
  }, [selectedMeasurementId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.menu-trigger')) {
        setActiveMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleNewMeasurement = () => {
    setSelectedMeasurementId(null)
    setIsCreatingNew(true)
    setIsEditing(true)
    setMeasurements({
      shoulder_to_elbow: '',
      shoulder_to_wrist: '',
      tricep_girth: '',
      elbow_girth: '',
      free_hand_girth: '',
      wrist_girth: '',
      neck: '',
      chest: '',
      tummy: '',
      hip: '',
      shirt_length: '',
      trouser_length: '',
      lap_girth: '',
      knee_girth: '',
      base_girth: '',
      waist_girth: '',
      hip_girth: '',
      agbada_sleeve: '',
      agbada_length: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please login to save measurements')

      if (isCreatingNew && !newMeasurementName) {
        throw new Error('Please provide a name for the measurements')
      }

      const measurementData = Object.entries(measurements).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value === '' ? null : parseFloat(value)
      }), {})

      let error;
      if (selectedMeasurementId) {
        ({ error } = await supabase
          .from('measurements')
          .update({ ...measurementData })
          .eq('id', selectedMeasurementId))
      } else {
        ({ error } = await supabase
          .from('measurements')
          .insert({ 
            ...measurementData, 
            user_id: user.id,
            name: newMeasurementName 
          }))
      }

      if (error) throw error

      // Refresh measurements list
      const { data: newList, error: refreshError } = await supabase
        .from('measurements')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (refreshError) throw refreshError

      setMeasurementsList(newList || [])
      setIsEditing(false)
      setIsCreatingNew(false)
      setNewMeasurementName('')
      
      toast.success(selectedMeasurementId ? 'Measurements updated successfully' : 'Measurements saved successfully')
    } catch (error) {
      console.error('Error saving measurements:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save measurements')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMeasurementsList(measurementsList.filter(item => item.id !== id))
      if (selectedMeasurementId === id) {
        setSelectedMeasurementId(null)
      }
      toast.success('Measurement deleted successfully')
    } catch (error) {
      console.error('Error deleting measurement:', error)
      toast.error('Failed to delete measurement')
    }
    setActiveMenu(null)
  }

  // Helper function to check if form is editable
  const isFormEditable = () => {
    return isCreatingNew || isEditing;
  }

  // Update the input change handler
  const handleInputChange = (field: keyof MeasurementsType, value: string) => {
    // Don't convert to number until submission
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCancel = () => {
    if (isCreatingNew) {
      setIsCreatingNew(false);
      setNewMeasurementName('');
      setSelectedMeasurementId(null);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className="measurements-page">
      <div className="measurements-sidebar">
        <button onClick={() => router.push('/')} className="back-button">
          <IoArrowBack size={24} />
          <span>Back</span>
        </button>
        
        <button 
          className="new-measurement-button"
          onClick={handleNewMeasurement}
        >
          + New Measurement
        </button>
        
        <div className="measurements-list">
          {measurementsList.map((item) => (
            <div 
              key={item.id}
              className={`measurement-item ${selectedMeasurementId === item.id ? 'selected' : ''}`}
            >
              <div 
                className="measurement-item-content"
                onClick={() => {
                  setSelectedMeasurementId(item.id)
                  setIsCreatingNew(false)
                  setIsEditing(false)
                }}
              >
                <BsPerson className="person-icon" />
                <span>{item.name}</span>
              </div>
              
              <div className="measurement-item-actions">
                <button
                  className="menu-trigger"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenu(activeMenu === item.id ? null : item.id)
                  }}
                >
                  <BsThreeDotsVertical />
                </button>
                
                {activeMenu === item.id && (
                  <div className="dropdown-menu">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMeasurementId(item.id)
                        setIsCreatingNew(false)
                        setIsEditing(true)
                        setActiveMenu(null)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="modal-content">
        {(isCreatingNew || selectedMeasurementId) ? (
          <>
            <div className="header-section">
              <h2>
                {isCreatingNew ? (
                  <input
                    type="text"
                    placeholder="Enter measurement name"
                    value={newMeasurementName}
                    onChange={(e) => setNewMeasurementName(e.target.value)}
                    className="measurement-name-input"
                  />
                ) : (
                  measurementsList.find(m => m.id === selectedMeasurementId)?.name || 'Your Measurements'
                )}
              </h2>
            </div>
            <form className={`measurements-form ${isFormEditable() ? 'editing' : ''}`} onSubmit={handleSubmit}>
              <div className="measurements-items">
                <div className="form-section">
                  <h3>Sleeve Details</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Shoulder to Elbow</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Shoulder to elbow"
                      value={measurements.shoulder_to_elbow}
                      onChange={e => handleInputChange('shoulder_to_elbow', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Shoulder to Wrist</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Shoulder to wrist"
                      value={measurements.shoulder_to_wrist}
                      onChange={e => handleInputChange('shoulder_to_wrist', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Tricep Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Tricep girth"
                      value={measurements.tricep_girth}
                      onChange={e => handleInputChange('tricep_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Elbow Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Elbow girth"
                      value={measurements.elbow_girth}
                      onChange={e => handleInputChange('elbow_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Free Hand Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Free hand girth"
                      value={measurements.free_hand_girth}
                      onChange={e => handleInputChange('free_hand_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Wrist Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Wrist girth"
                      value={measurements.wrist_girth}
                      onChange={e => handleInputChange('wrist_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Upper Body</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Neck</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Neck"
                      value={measurements.neck}
                      onChange={e => handleInputChange('neck', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Chest</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Chest"
                      value={measurements.chest}
                      onChange={e => handleInputChange('chest', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Tummy</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Tummy"
                      value={measurements.tummy}
                      onChange={e => handleInputChange('tummy', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Hip</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Hip"
                      value={measurements.hip}
                      onChange={e => handleInputChange('hip', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Shirt Length</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Shirt length"
                      value={measurements.shirt_length}
                      onChange={e => handleInputChange('shirt_length', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Lower Body</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Trouser Length</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Trouser length"
                      value={measurements.trouser_length}
                      onChange={e => handleInputChange('trouser_length', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Lap Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Lap girth"
                      value={measurements.lap_girth}
                      onChange={e => handleInputChange('lap_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Knee Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Knee girth"
                      value={measurements.knee_girth}
                      onChange={e => handleInputChange('knee_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Base Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Base girth"
                      value={measurements.base_girth}
                      onChange={e => handleInputChange('base_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Waist Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Waist girth"
                      value={measurements.waist_girth}
                      onChange={e => handleInputChange('waist_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Hip Girth</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Hip girth"
                      value={measurements.hip_girth}
                      onChange={e => handleInputChange('hip_girth', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Agbada Measurements</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Agbada Sleeve</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Agbada sleeve"
                      value={measurements.agbada_sleeve}
                      onChange={e => handleInputChange('agbada_sleeve', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Agbada Length</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Agbada length"
                      value={measurements.agbada_length}
                      onChange={e => handleInputChange('agbada_length', e.target.value)}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>
              </div>
              {isFormEditable() && (
                <div className="form-buttons">
                  <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Measurements'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-button" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="no-measurement-selected">
            <h2>Select a measurement or create a new one</h2>
            <p>Choose an existing measurement from the sidebar or click "+ New Measurement" to create a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
} 