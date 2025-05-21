'use client'

import { useState, useEffect, useRef } from 'react'
import './ProfileMeasurements.css'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { toast } from 'react-hot-toast'
import { supabase } from "../../lib/supabaseClient"
import { BsPerson, BsThreeDotsVertical } from 'react-icons/bs'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

// Update type to match database column names
type MeasurementsType = {
  // Shirt Measurements
  shoulders: string;
  sleeves: string;
  round_sleeves: string;
  wrist: string;
  chest: string;
  waist_shirt: string;
  shirt_length: string;
  // Trouser Measurements
  waist: string;
  hips: string;
  thigh: string;
  knee: string;
  calves: string;
  trouser_length: string;
  ankle_width: string;
  // Agbada Measurements
  agbada_length: string;
  agbada_width: string;
}

export default function MeasurementsPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementsType>({
    // Shirt Measurements
    shoulders: '',
    sleeves: '',
    round_sleeves: '',
    wrist: '',
    chest: '',
    waist_shirt: '',
    shirt_length: '',
    // Trouser Measurements
    waist: '',
    hips: '',
    thigh: '',
    knee: '',
    calves: '',
    trouser_length: '',
    ankle_width: '',
    // Agbada Measurements
    agbada_length: '',
    agbada_width: ''
  })
  const [measurementsList, setMeasurementsList] = useState<Array<{ id: number, name: string }>>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null)
  const [newMeasurementName, setNewMeasurementName] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // Check if the screen is mobile size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      // Auto-collapse sidebar on mobile
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    
    // Initial check
    checkIsMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

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
          shoulders: '',
          sleeves: '',
          round_sleeves: '',
          wrist: '',
          chest: '',
          waist_shirt: '',
          shirt_length: '',
          waist: '',
          hips: '',
          thigh: '',
          knee: '',
          calves: '',
          trouser_length: '',
          ankle_width: '',
          agbada_length: '',
          agbada_width: ''
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
            shoulders: data.shoulders?.toString() || '',
            sleeves: data.sleeves?.toString() || '',
            round_sleeves: data.round_sleeves?.toString() || '',
            wrist: data.wrist?.toString() || '',
            chest: data.chest?.toString() || '',
            waist_shirt: data.waist_shirt?.toString() || '',
            shirt_length: data.shirt_length?.toString() || '',
            waist: data.waist?.toString() || '',
            hips: data.hips?.toString() || '',
            thigh: data.thigh?.toString() || '',
            knee: data.knee?.toString() || '',
            calves: data.calves?.toString() || '',
            trouser_length: data.trouser_length?.toString() || '',
            ankle_width: data.ankle_width?.toString() || '',
            agbada_length: data.agbada_length?.toString() || '',
            agbada_width: data.agbada_width?.toString() || ''
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

  // Close sidebar when clicking outside of it on mobile
  useEffect(() => {
    function handleClickOutsideSidebar(event: MouseEvent) {
      if (isMobile && !sidebarCollapsed && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarCollapsed(true);
      }
    }

    document.addEventListener('mousedown', handleClickOutsideSidebar);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSidebar);
    }
  }, [isMobile, sidebarCollapsed]);

  // Auto-collapse sidebar after selection on mobile
  useEffect(() => {
    if (isMobile && selectedMeasurementId) {
      setSidebarCollapsed(true);
    }
  }, [selectedMeasurementId, isMobile]);

  const handleNewMeasurement = () => {
    setSelectedMeasurementId(null)
    setIsCreatingNew(true)
    setIsEditing(true)
    setMeasurements({
      shoulders: '',
      sleeves: '',
      round_sleeves: '',
      wrist: '',
      chest: '',
      waist_shirt: '',
      shirt_length: '',
      waist: '',
      hips: '',
      thigh: '',
      knee: '',
      calves: '',
      trouser_length: '',
      ankle_width: '',
      agbada_length: '',
      agbada_width: ''
    })

    // Expand sidebar if collapsed on mobile when creating new
    if (isMobile && sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
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
        // Convert to number but preserve exact decimal value without rounding
        [key]: value === '' ? null : Number(value)
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Get the current measurement name
  const currentMeasurementName = isCreatingNew 
    ? "New Measurement"
    : measurementsList.find(m => m.id === selectedMeasurementId)?.name || 'Your Measurements';

  return (
    <div className="measurements-page">
      <div ref={sidebarRef} className={`measurements-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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

      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarCollapsed ? (
            <>
              <span>Select Measurement</span>
              <FiChevronDown />
            </>
          ) : (
            <>
              <span>Hide Measurement List</span>
              <FiChevronUp />
            </>
          )}
        </button>
      )}

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
                  currentMeasurementName
                )}
              </h2>
            </div>
            <form className={`measurements-form ${isFormEditable() ? 'editing' : ''}`} onSubmit={handleSubmit}>
              <div className="video-guide">
                <p>Watch a measurement guide video:</p>
                <a href="https://www.youtube.com/watch?v=ky4wjfD_e7w" target="_blank" rel="noopener noreferrer" className="video-link">
                  📹 How to Take Your Measurements
                </a>
              </div>
              <div className="measurements-items">
                <div className="form-section">
                  <h3>Shirt Measurements</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Shoulders</span>
                    <p className="measurement-instruction">
                      Place the tip of the tape on the farthest point of one shoulder. Trace the tape across the back to the farthest point on the other shoulder.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Shoulders"
                      value={measurements.shoulders}
                      onChange={e => handleInputChange('shoulders', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Sleeves</span>
                    <p className="measurement-instruction">
                      Start at the highest point of the arm, near where it meets the shoulder. Run the tape down to the bony point at the wrist.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sleeves"
                      value={measurements.sleeves}
                      onChange={e => handleInputChange('sleeves', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Round Sleeves (Bicep)</span>
                    <p className="measurement-instruction">
                      Ask the person to flex their bicep tightly. Wrap the tape around the widest part of the bicep. Add 1 inch for comfort.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Round Sleeves"
                      value={measurements.round_sleeves}
                      onChange={e => handleInputChange('round_sleeves', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Wrist</span>
                    <p className="measurement-instruction">
                      Wrap the tape around the wrist. The point where the tip meets the rest of the tape in a circle is your wrist size.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Wrist"
                      value={measurements.wrist}
                      onChange={e => handleInputChange('wrist', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Chest</span>
                    <p className="measurement-instruction">
                      Wrap the tape around the back and bring it to the front at chest level. Ensure the tape is flat and firm across the widest part of the chest. Add 3 inches for comfort.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Chest"
                      value={measurements.chest}
                      onChange={e => handleInputChange('chest', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Waist (Shirt)</span>
                    <p className="measurement-instruction">
                      Wrap the tape around the tummy (called the shirt waist area). Keep it flat and firm with no folds or errors at the back. Add 2 inches for comfort.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Waist (Shirt)"
                      value={measurements.waist_shirt}
                      onChange={e => handleInputChange('waist_shirt', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>

                  <div className="measurement-field">
                    <span className="measurement-label">Shirt Length</span>
                    <p className="measurement-instruction">
                      Start at the point where the neck meets the shoulder. Run the tape down to the bone at the base of the thumb.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Shirt Length"
                      value={measurements.shirt_length}
                      onChange={e => handleInputChange('shirt_length', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Trouser Measurements</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Waist</span>
                    <p className="measurement-instruction">
                      Wrap the tape around where the trouser waistband sits. Ensure the person is wearing trousers for accuracy. The tape must be flat and firm with no folds at the back.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Waist"
                      value={measurements.waist}
                      onChange={e => handleInputChange('waist', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Hips</span>
                    <p className="measurement-instruction">
                      Run the tape around the widest part of the hips, including the bottom. Ensure nothing is in the pockets. Keep it firm and comfortable—no slack or tightness.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Hips"
                      value={measurements.hips}
                      onChange={e => handleInputChange('hips', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Thigh</span>
                    <p className="measurement-instruction">
                      Place the tape through the crotch and wrap it around the thickest part of the thigh. Slightly pull diagonally for a natural shape. Ensure pockets are empty.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Thigh"
                      value={measurements.thigh}
                      onChange={e => handleInputChange('thigh', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Knee</span>
                    <p className="measurement-instruction">
                      Wrap the tape around the knee. Keep the tape flat and comfortable, ensuring room for movement.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Knee"
                      value={measurements.knee}
                      onChange={e => handleInputChange('knee', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Calves</span>
                    <p className="measurement-instruction">
                      Wrap the tape around the widest part of the calf. Ensure it's comfortable and allows for movement.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Calves"
                      value={measurements.calves}
                      onChange={e => handleInputChange('calves', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Trouser Length</span>
                    <p className="measurement-instruction">
                      Start at the waistline where the trousers sit. Trace the tape straight down to about 2 inches after the ankle bone.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Trouser Length"
                      value={measurements.trouser_length}
                      onChange={e => handleInputChange('trouser_length', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Ankle Width</span>
                    <p className="measurement-instruction">
                      Ask the client to remove their shoes. Wrap the tape diagonally around the joint where the leg meets the foot.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Ankle Width"
                      value={measurements.ankle_width}
                      onChange={e => handleInputChange('ankle_width', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Agbada Measurements</h3>
                  <div className="measurement-field">
                    <span className="measurement-label">Agbada Length</span>
                    <p className="measurement-instruction">
                      Start at the point where the neck meets the shoulder. Run the tape down past the knee to the desired length of your agbada.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Agbada Length"
                      value={measurements.agbada_length}
                      onChange={e => handleInputChange('agbada_length', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      disabled={!isFormEditable()}
                    />
                    {!isFormEditable() && <span className="measurement-unit">inches</span>}
                  </div>
                  <div className="measurement-field">
                    <span className="measurement-label">Agbada Width</span>
                    <p className="measurement-instruction">
                      Ask the person to stretch both arms out to the sides at shoulder level, forming a straight horizontal line. Measure from the tip of one wrist across the back to the tip of the opposite wrist.
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Agbada Width"
                      value={measurements.agbada_width}
                      onChange={e => handleInputChange('agbada_width', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
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