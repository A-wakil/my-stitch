'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import './ProfileMeasurements.css'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { toast } from 'react-hot-toast'
import { supabase } from "../../lib/supabaseClient"
import { BsPerson, BsThreeDotsVertical } from 'react-icons/bs'
import { FiChevronRight, FiPlayCircle } from 'react-icons/fi'

// Update type to match database column names and include gender
type MeasurementsType = {
  gender: 'male' | 'female';

  // Common measurements (used by both genders)
  shoulders: string;
  sleeves: string;
  chest: string;
  waist: string;
  hips: string;
  thigh: string;
  knee: string;
  trouser_length: string;

  // Male-specific measurements
  round_sleeves: string;
  wrist: string;
  waist_shirt: string;
  shirt_length: string;
  calves: string;
  ankle_width: string;
  agbada_length: string;
  agbada_width: string;

  // Female-specific measurements
  neck: string;
  off_shoulder_top: string;
  underbust: string;
  top_length: string;
  bust_length: string;
  underbust_length: string;
  nipple_to_nipple: string;
  upper_waist: string;
  lower_waist: string;
  bust: string;
  ankle_trouser_end: string;
}

type MeasurementFieldKey = Exclude<keyof MeasurementsType, 'gender'>
type MeasurementVideoLink = string | { default?: string; male?: string; female?: string }

// Replace the empty strings below with the actual short video URLs for each measurement.
const measurementVideoLinks: Partial<Record<MeasurementFieldKey, MeasurementVideoLink>> = {
  shoulders: '',
  sleeves: '',
  chest: '',
  waist: '',
  hips: '',
  thigh: '',
  knee: '',
  trouser_length: '',
  round_sleeves: '',
  wrist: '',
  waist_shirt: '',
  shirt_length: '',
  calves: '',
  ankle_width: '',
  agbada_length: '',
  agbada_width: '',
  neck: '',
  off_shoulder_top: '',
  underbust: '',
  top_length: '',
  bust_length: '',
  underbust_length: '',
  nipple_to_nipple: '',
  upper_waist: '',
  lower_waist: '',
  bust: '',
  ankle_trouser_end: '',
}

type MeasurementFieldConfig = {
  key: MeasurementFieldKey
  label: string
  instruction: string
}

const measurementFieldGroups: Record<'common' | 'male' | 'female', MeasurementFieldConfig[]> = {
  common: [
    {
      key: 'shoulders',
      label: 'Shoulders',
      instruction: 'Place the tip of the tape on the farthest point of one shoulder. Trace the tape across the back to the farthest point on the other shoulder.',
    },
    {
      key: 'sleeves',
      label: 'Sleeves',
      instruction: 'Start at the highest point of the arm, near where it meets the shoulder. Run the tape down to the bony point at the wrist.',
    },
    {
      key: 'chest',
      label: 'Chest',
      instruction: 'Wrap the tape around the back and bring it to the front at chest level. Ensure the tape is flat and firm across the widest part of the chest. Add 3 inches for comfort.',
    },
    {
      key: 'waist',
      label: 'Waist',
      instruction: 'Wrap the tape around the waistline, just above the belly button. Keep the tape flat and snug, and add 2 inches.',
    },
    {
      key: 'hips',
      label: 'Hips',
      instruction: 'Wrap the tape around the fullest part of the hips. Ensure it sits evenly across the back and front.',
    },
    {
      key: 'thigh',
      label: 'Thigh',
      instruction: 'Wrap the tape around the thickest part of the thigh. Keep it level and snug without squeezing the leg.',
    },
    {
      key: 'knee',
      label: 'Knee',
      instruction: 'Wrap the tape around the knee joint. The point where the tape meets is your knee measurement.',
    },
    {
      key: 'trouser_length',
      label: 'Trouser Length',
      instruction: 'Start at the waistline. Run the tape down the side of the leg to the ankle bone.',
    },
    {
      key: 'ankle_width',
      label: 'Ankle Width',
      instruction: 'Ask the client to remove their shoes. Wrap the tape diagonally around the joint where the leg meets the foot.',
    },
  ],
  male: [
    {
      key: 'round_sleeves',
      label: 'Round Sleeves (Bicep)',
      instruction: 'Ask the person to flex their bicep tightly. Wrap the tape around the widest part of the bicep. Add 1 inch for comfort.',
    },
    {
      key: 'wrist',
      label: 'Wrist',
      instruction: 'Wrap the tape around the wrist. The point where the tip meets the rest of the tape in a circle is your wrist size.',
    },
    {
      key: 'waist_shirt',
      label: 'Waist (Shirt)',
      instruction: 'Wrap the tape around the tummy (called the shirt waist area). Keep it flat and firm with no folds or errors at the back. Add 2 inches for comfort.',
    },
    {
      key: 'shirt_length',
      label: 'Shirt Length',
      instruction: 'Start at the point where the neck meets the shoulder. Run the tape down to the bone at the base of the thumb.',
    },
    {
      key: 'calves',
      label: 'Calves',
      instruction: "Wrap the tape around the widest part of the calf. Ensure it's comfortable and allows for movement.",
    },
    {
      key: 'agbada_length',
      label: 'Agbada Length',
      instruction: 'Start at the point where the neck meets the shoulder. Run the tape down past the knee to the desired length of your agbada.',
    },
    {
      key: 'agbada_width',
      label: 'Agbada Width',
      instruction: 'Ask the person to stretch both arms out to the sides at shoulder level, forming a straight horizontal line. Measure from the tip of one wrist across the back to the tip of the opposite wrist.',
    },
  ],
  female: [
    {
      key: 'neck',
      label: 'Neck',
      instruction: 'Wrap the tape around the neck. Where the top of your tape meets the rest of the tape in a circle is your neck measurement.',
    },
    {
      key: 'off_shoulder_top',
      label: 'Off Shoulder Top',
      instruction: 'Wrap the tape around the chest and upper arms, forming a circle. The point where the top of the tape meets the tape is your measurement.',
    },
    {
      key: 'bust',
      label: 'Bust',
      instruction: 'Wrap the tape under the arms, around the back, and across the fullest part of the bust. Ensure it is firm but comfortable.',
    },
    {
      key: 'underbust',
      label: 'Underbust',
      instruction: 'Wrap the tape directly under the bust, around the torso. It should be firm and tucked comfortably.',
    },
    {
      key: 'top_length',
      label: 'Top Length',
      instruction: 'Start at the highest point between the neck and shoulder. Trace downward to about 7 inches after the waistband.',
    },
    {
      key: 'bust_length',
      label: 'Bust Length',
      instruction: 'Measure from the top point (neck/shoulder) down to the nipple.',
    },
    {
      key: 'underbust_length',
      label: 'Underbust Length',
      instruction: 'Same top point down to the underbust line.',
    },
    {
      key: 'nipple_to_nipple',
      label: 'Nipple to Nipple',
      instruction: 'Place the tape on one nipple and trace straight across to the other. This is your nipple-to-nipple width.',
    },
    {
      key: 'upper_waist',
      label: 'Upper Waist (Tummy)',
      instruction: 'Wrap the tape around the navel area. Keep it firm and comfortable.',
    },
    {
      key: 'lower_waist',
      label: 'Lower Waist (Waistband Area)',
      instruction: 'Wrap the tape around the waistband line. Take a firm measurement—where the tape meets itself in a circle is your size.',
    },
    {
      key: 'ankle_trouser_end',
      label: 'Ankle Trouser End',
      instruction: 'Wrap the tape around the bottom hem area of the trousers. Point where tape meets is your measurement.',
    },
  ],
}

export default function MeasurementsPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementsType>({
    gender: 'male', // Default to male
    // Common measurements (used by both genders)
    shoulders: '',
    sleeves: '',
    chest: '',
    waist: '',
    hips: '',
    thigh: '',
    knee: '',
    trouser_length: '',
    // Male-specific measurements
    round_sleeves: '',
    wrist: '',
    waist_shirt: '',
    shirt_length: '',
    calves: '',
    ankle_width: '',
    agbada_length: '',
    agbada_width: '',
    // Female-specific measurements
    neck: '',
    off_shoulder_top: '',
    underbust: '',
    top_length: '',
    bust_length: '',
    underbust_length: '',
    nipple_to_nipple: '',
    upper_waist: '',
    lower_waist: '',
    bust: '',
    ankle_trouser_end: ''
  })
  const [measurementsList, setMeasurementsList] = useState<Array<{ id: number, name: string }>>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null)
  const [newMeasurementName, setNewMeasurementName] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentMobileStep, setCurrentMobileStep] = useState(0)
  const [activeVideoGuide, setActiveVideoGuide] = useState<{ title: string; url: string } | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const orderedMobileFields = useMemo(() => {
    const genderSpecific =
      measurements.gender === 'male'
        ? measurementFieldGroups.male
        : measurementFieldGroups.female
    return [...measurementFieldGroups.common, ...genderSpecific]
  }, [measurements.gender])

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
          gender: 'male', // Default to male
          // Common measurements (used by both genders)
          shoulders: '',
          sleeves: '',
          chest: '',
          waist: '',
          hips: '',
          thigh: '',
          knee: '',
          trouser_length: '',
          // Male-specific measurements
          round_sleeves: '',
          wrist: '',
          waist_shirt: '',
          shirt_length: '',
          calves: '',
          ankle_width: '',
          agbada_length: '',
          agbada_width: '',
          // Female-specific measurements
          neck: '',
          off_shoulder_top: '',
          underbust: '',
          top_length: '',
          bust_length: '',
          underbust_length: '',
          nipple_to_nipple: '',
          upper_waist: '',
          lower_waist: '',
          bust: '',
          ankle_trouser_end: ''
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
            gender: data.gender || 'male', // Default to male if not found
            // Common measurements (used by both genders)
            shoulders: data.shoulders?.toString() || '',
            sleeves: data.sleeves?.toString() || '',
            chest: data.chest?.toString() || '',
            waist: data.waist?.toString() || '',
            hips: data.hips?.toString() || '',
            thigh: data.thigh?.toString() || '',
            knee: data.knee?.toString() || '',
            trouser_length: data.trouser_length?.toString() || '',
            // Male-specific measurements
            round_sleeves: data.round_sleeves?.toString() || '',
            wrist: data.wrist?.toString() || '',
            waist_shirt: data.waist_shirt?.toString() || '',
            shirt_length: data.shirt_length?.toString() || '',
            calves: data.calves?.toString() || '',
            ankle_width: data.ankle_width?.toString() || '',
            agbada_length: data.agbada_length?.toString() || '',
            agbada_width: data.agbada_width?.toString() || '',
            // Female-specific measurements
            neck: data.neck?.toString() || '',
            off_shoulder_top: data.off_shoulder_top?.toString() || '',
            underbust: data.underbust?.toString() || '',
            top_length: data.top_length?.toString() || '',
            bust_length: data.bust_length?.toString() || '',
            underbust_length: data.underbust_length?.toString() || '',
            nipple_to_nipple: data.nipple_to_nipple?.toString() || '',
            upper_waist: data.upper_waist?.toString() || '',
            lower_waist: data.lower_waist?.toString() || '',
            bust: data.bust?.toString() || '',
            ankle_trouser_end: data.ankle_trouser_end?.toString() || ''
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

  useEffect(() => {
    setCurrentMobileStep(0);
  }, [measurements.gender, selectedMeasurementId, isMobile, isCreatingNew]);

  const handleNewMeasurement = () => {
    setSelectedMeasurementId(null)
    setIsCreatingNew(true)
    setIsEditing(true)
    setMeasurements({
      gender: 'male', // Default to male
      // Common measurements (used by both genders)
      shoulders: '',
      sleeves: '',
      chest: '',
      waist: '',
      hips: '',
      thigh: '',
      knee: '',
      trouser_length: '',
      // Male-specific measurements
      round_sleeves: '',
      wrist: '',
      waist_shirt: '',
      shirt_length: '',
      calves: '',
      ankle_width: '',
      agbada_length: '',
      agbada_width: '',
      // Female-specific measurements
      neck: '',
      off_shoulder_top: '',
      underbust: '',
      top_length: '',
      bust_length: '',
      underbust_length: '',
      nipple_to_nipple: '',
      upper_waist: '',
      lower_waist: '',
      bust: '',
      ankle_trouser_end: ''
    })
    setCurrentMobileStep(0)

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

  const handleMeasurementSelect = (id: number) => {
    setSelectedMeasurementId(id)
    setIsCreatingNew(false)
    setIsEditing(false)
    setCurrentMobileStep(0)
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

  const getVideoUrl = (fieldKey: MeasurementFieldKey) => {
    const entry = measurementVideoLinks[fieldKey]
    if (!entry) return undefined
    if (typeof entry === 'string') return entry
    return entry[measurements.gender] || entry.default
  }

  const formatEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      return url.replace('watch?v=', 'embed/')
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'www.youtube.com/embed/')
    }
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com/')) {
      const id = url.split('/').pop()
      return id ? `https://player.vimeo.com/video/${id}` : url
    }
    return url
  }

  const openVideoGuide = (fieldKey: MeasurementFieldKey, label: string) => {
    const url = getVideoUrl(fieldKey)
    if (!url) {
      toast('Video guide coming soon.')
      return
    }
    setActiveVideoGuide({ title: label, url })
  }

  const closeVideoGuide = () => setActiveVideoGuide(null)

  const renderMeasurementLabel = (fieldKey: MeasurementFieldKey, label: string) => (
    <span className="measurement-label">
      <span>{label}</span>
      <button
        type="button"
        className="video-icon-button"
        onClick={() => openVideoGuide(fieldKey, label)}
        aria-label={`Watch tutorial for ${label}`}
      >
        <FiPlayCircle aria-hidden="true" />
      </button>
    </span>
  )

  const renderVideoContent = (url: string, title: string, className: string) => {
    const trimmed = url.trim()
    const isFile = /\.(mp4|webm|ogg|mov)$/i.test(trimmed)

    if (isFile) {
      return (
        <video
          className={className}
          src={trimmed}
          controls
          autoPlay
          playsInline
        />
      )
    }

    return (
      <iframe
        className={className}
        src={formatEmbedUrl(trimmed)}
        title={`${title} tutorial`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  const renderVideoPlayer = () => {
    if (!activeVideoGuide) return null
    return renderVideoContent(activeVideoGuide.url, activeVideoGuide.title, 'video-player')
  }

  const renderMeasurementField = (field: MeasurementFieldConfig) => (
    <div key={field.key} className="measurement-field">
      {renderMeasurementLabel(field.key, field.label)}
      <p className="measurement-instruction">{field.instruction}</p>
      <input
        type="number"
        min="0"
        step="any"
        placeholder={field.label}
        value={measurements[field.key]}
        onChange={e => handleInputChange(field.key, e.target.value)}
        onWheel={(e) => (e.target as HTMLElement).blur()}
        disabled={!isFormEditable()}
      />
      {!isFormEditable() && <span className="measurement-unit">inches</span>}
    </div>
  )

  const renderMobileStepVideo = (field: MeasurementFieldConfig) => {
    const url = getVideoUrl(field.key)
    if (!url) {
      return (
        <div className="mobile-step-video-placeholder">
          <FiPlayCircle aria-hidden="true" />
          <p>Video guide coming soon.</p>
        </div>
      )
    }

    return (
      <div className="mobile-step-video">
        {renderVideoContent(url, field.label, 'mobile-step-video-player')}
      </div>
    )
  }

  const handleCancel = () => {
    if (isCreatingNew) {
      setIsCreatingNew(false);
      setNewMeasurementName('');
      setSelectedMeasurementId(null);
    } else {
      setIsEditing(false);
      if (isMobile) {
        setSelectedMeasurementId(null);
      }
    }
    if (isMobile) {
      setCurrentMobileStep(0);
    }
  };

  // Get the current measurement name
  const currentMeasurementName = isCreatingNew
    ? "New Measurement"
    : measurementsList.find(m => m.id === selectedMeasurementId)?.name || 'Your Measurements';

  const totalMobileSteps = orderedMobileFields.length + 1
  const isLastMobileStep = currentMobileStep === totalMobileSteps - 1
  const progressRatio = totalMobileSteps > 1 ? currentMobileStep / (totalMobileSteps - 1) : 0

  const goToPreviousStep = () => setCurrentMobileStep(prev => Math.max(prev - 1, 0))
  const goToNextStep = () => setCurrentMobileStep(prev => Math.min(prev + 1, totalMobileSteps - 1))

  const renderMobileStepper = () => {
    const activeField =
      currentMobileStep === 0
        ? null
        : orderedMobileFields[Math.min(currentMobileStep - 1, orderedMobileFields.length - 1)]

    return (
      <div className="mobile-stepper">
        <div className="mobile-stepper-header">
          <div className="mobile-step-count">
            Step {currentMobileStep + 1} of {totalMobileSteps}
          </div>
          <div className="mobile-stepper-progress">
            <div
              className="mobile-stepper-progress-fill"
              style={{ width: `${Math.min(progressRatio, 1) * 100}%` }}
            />
          </div>
        </div>

        {currentMobileStep === 0 ? (
          <div className="mobile-step-card">
            <div className="mobile-step-title">
              {isCreatingNew ? (
                <input
                  type="text"
                  placeholder="Name of Client"
                  value={newMeasurementName}
                  onChange={(e) => setNewMeasurementName(e.target.value)}
                  className="measurement-name-input"
                />
              ) : (
                <h2 className="measurement-title">{currentMeasurementName}</h2>
              )}
            </div>
            <p className="mobile-step-description">
              Follow the guided flow to capture each measurement along with a short video reference. You can revisit
              any step at any time.
            </p>
            <div className="mobile-step-video-info">
              <FiPlayCircle aria-hidden="true" />
              <p>Each step includes a quick tutorial where the video takes the stage and the input lives right below it.</p>
            </div>
          </div>
        ) : (
          activeField && (
            <div className="mobile-step-card">
              <div className="mobile-step-title">
                <h3>{activeField.label}</h3>
                <span>({currentMobileStep} of {totalMobileSteps - 1})</span>
              </div>
              <p className="mobile-step-instruction">{activeField.instruction}</p>
              {renderMobileStepVideo(activeField)}
              <div className="mobile-step-field">
                <label htmlFor={`mobile-${activeField.key}`}>
                  Enter measurement value (inches)
                </label>
                <input
                  id={`mobile-${activeField.key}`}
                  type="number"
                  min="0"
                  step="any"
                  placeholder={activeField.label}
                  value={measurements[activeField.key]}
                  onChange={e => handleInputChange(activeField.key, e.target.value)}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  disabled={!isFormEditable()}
                />
              </div>
            </div>
          )
        )}

        <div className="mobile-step-actions">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentMobileStep === 0}
          >
            Back
          </button>
          {isLastMobileStep ? (
            isFormEditable() ? (
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Measurements'}
              </button>
            ) : (
              <button type="button" onClick={() => setCurrentMobileStep(0)}>
                Done
              </button>
            )
          ) : (
            <button type="button" onClick={goToNextStep}>
              Next
            </button>
          )}
        </div>

        {isLastMobileStep && isFormEditable() && (
          <button
            type="button"
            className="cancel-button mobile-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
      </div>
    )
  }

  const handleMobileBack = () => {
    setSelectedMeasurementId(null);
    setIsCreatingNew(false);
    setIsEditing(false);
    setCurrentMobileStep(0);
    setSidebarCollapsed(false);
  };

  const renderMobileSelectionPanel = () => (
    <div className="mobile-selection-panel">
      <div className="mobile-selection-text">
        <h2>Select a measurement or create a new one</h2>
        <p>Choose an existing measurement below or tap "+ New Measurement" to create a new one.</p>
      </div>
      <div className="mobile-selection-actions">
        <button
          type="button"
          className="new-measurement-button"
          onClick={handleNewMeasurement}
        >
          + New Measurement
        </button>
        <div className="mobile-selection-cards">
          {measurementsList.length === 0 ? (
            <div className="mobile-selection-empty">
              <p>No saved measurements yet.</p>
            </div>
          ) : (
            measurementsList.map(item => (
              <button
                type="button"
                key={item.id}
                className="mobile-selection-card"
                onClick={() => handleMeasurementSelect(item.id)}
              >
                <div className="mobile-selection-card-content">
                  <BsPerson className="person-icon" />
                  <span>{item.name}</span>
                </div>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )

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
                onClick={() => handleMeasurementSelect(item.id)}
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

      {/* Mobile back button */}
      {isMobile && (isCreatingNew || selectedMeasurementId) && (
        <button className="mobile-back-button" onClick={handleMobileBack}>
          <IoArrowBack size={20} />
          <span>Back</span>
        </button>
      )}

      <div className="modal-content">
        {(isCreatingNew || selectedMeasurementId) ? (
          <>
            <div className="header-section">
              <div className="measurement-name-section">
                {isCreatingNew ? (
                  <input
                    type="text"
                    placeholder="Name of Client"
                    value={newMeasurementName}
                    onChange={(e) => setNewMeasurementName(e.target.value)}
                    className="measurement-name-input"
                  />
                ) : (
                  <h2 className="measurement-title">{currentMeasurementName}</h2>
                )}
              </div>
            </div>
            {isMobile ? (
              <form
                className={`mobile-measurements-form ${isFormEditable() ? 'editing' : ''}`}
                onSubmit={handleSubmit}
              >
                {renderMobileStepper()}
              </form>
            ) : (
              <form className={`measurements-form ${isFormEditable() ? 'editing' : ''}`} onSubmit={handleSubmit}>
                <div className="video-guide-hint">
                  <FiPlayCircle aria-hidden="true" />
                  <p>Tap the play icon beside any measurement to watch a quick tutorial without leaving the app.</p>
                </div>
                <div className="measurements-items">
                  <div className="form-section">
                    <h3>Common Measurements</h3>
                    {measurementFieldGroups.common.map(renderMeasurementField)}
                  </div>

                  {measurements.gender === 'male' && (
                    <div className="form-section">
                      <h3>Male-Specific Measurements</h3>
                      {measurementFieldGroups.male.map(renderMeasurementField)}
                    </div>
                  )}

                  {measurements.gender === 'female' && (
                    <div className="form-section">
                      <h3>Female-Specific Measurements</h3>
                      {measurementFieldGroups.female.map(renderMeasurementField)}
                    </div>
                  )}
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
            )}
          </>
        ) : (
          isMobile ? renderMobileSelectionPanel() : (
            <div className="no-measurement-selected">
              <h2>Select a measurement or create a new one</h2>
              <p>Choose an existing measurement from the sidebar or click "+ New Measurement" to create a new one.</p>
            </div>
          )
        )}
      </div>

      {activeVideoGuide && (
        <div
          className="video-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeVideoGuide()
            }
          }}
        >
          <div className="video-modal">
            <div className="video-modal-header">
              <h3>{activeVideoGuide.title} Tutorial</h3>
              <button
                type="button"
                className="video-modal-close"
                aria-label="Close video tutorial"
                onClick={closeVideoGuide}
              >
                &times;
              </button>
            </div>
            <div className="video-modal-body">
              {renderVideoPlayer()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 