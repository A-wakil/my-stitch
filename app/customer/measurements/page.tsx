'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import './ProfileMeasurements.css'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { toast } from 'react-hot-toast'
import { supabase } from "../../lib/supabaseClient"
import { BsPerson, BsThreeDotsVertical } from 'react-icons/bs'
import { FiChevronRight, FiEdit2, FiPlayCircle, FiTrash2, FiX } from 'react-icons/fi'

// Update type to match database column names and include gender
type MeasurementsType = {
  gender: 'male' | 'female';

  // Common measurements (used by both genders)
  cap: string;
  shoulders: string;
  chest: string;
  waist: string;
  hips: string;
  thigh: string;
  knee: string;

  // Sleeve measurements (grouped - shoulder to elbow, shoulder to wrist)
  shoulder_to_elbow: string;
  shoulder_to_wrist: string;

  // Trouser length measurements (grouped - waist to knee, waist to ankle)
  waist_to_knee: string;
  waist_to_ankle: string;

  // Male-specific measurements
  round_sleeves: string;
  wrist: string;
  tummy: string;
  
  // Shirt length measurements (grouped - shoulder to wrist, shoulder to knee, shoulder to ankle)
  shirt_shoulder_to_wrist: string;
  shirt_shoulder_to_knee: string;
  shirt_shoulder_to_ankle: string;
  
  calves: string;
  ankle_width: string;

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
  cap: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/cap.mp4',
  shoulders: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shoulder.mp4',
  chest: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/chest.mp4',
  waist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/waist.mp4',
  hips: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/hips.mp4',
  thigh: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/thigh.mp4',
  knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/knee.mp4',
  // Sleeve measurements share one video
  shoulder_to_elbow: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/sleeves.mp4',
  shoulder_to_wrist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/sleeves.mp4',
  // Trouser length measurements share one video
  waist_to_knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/trouserLength.mp4',
  waist_to_ankle: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/trouserLength.mp4',
  round_sleeves: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/bicep.mp4',
  wrist: '',
  tummy: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/tummy.mp4',
  // Shirt length measurements share one video
  shirt_shoulder_to_wrist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  shirt_shoulder_to_knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  shirt_shoulder_to_ankle: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  calves: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/calves.mp4',
  ankle_width: '',
  neck: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/neck.mp4',
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

type MeasurementGroupConfig = {
  groupLabel: string
  groupInstruction: string
  videoKey: MeasurementFieldKey  // Shared video for all fields in the group
  fields: MeasurementFieldConfig[]
}

type MeasurementItemConfig = MeasurementFieldConfig | MeasurementGroupConfig

function isMeasurementGroup(item: MeasurementItemConfig): item is MeasurementGroupConfig {
  return 'fields' in item
}

function isMeasurementField(item: MeasurementItemConfig): item is MeasurementFieldConfig {
  return !isMeasurementGroup(item)
}

const measurementFieldGroups: Record<'common' | 'male' | 'female', MeasurementItemConfig[]> = {
  common: [
    // Grouped measurements first
    {
      groupLabel: 'Sleeve Measurements',
      groupInstruction: 'Measure from the tip of the shoulder.',
      videoKey: 'shoulder_to_elbow',
      fields: [
        {
          key: 'shoulder_to_elbow',
          label: 'Shoulder to Elbow',
          instruction: 'Start at the tip of the shoulder. Run the tape down to the elbow.',
        },
        {
          key: 'shoulder_to_wrist',
          label: 'Shoulder to Wrist',
          instruction: 'Continue from the elbow down to the bony point at the wrist.',
        },
      ],
    },
    {
      groupLabel: 'Trouser Length',
      groupInstruction: 'Measure from the waist down the leg.',
      videoKey: 'waist_to_knee',
      fields: [
        {
          key: 'waist_to_knee',
          label: 'Waist to Knee',
          instruction: 'Start at the waistline. Run the tape down the side of the leg to the knee.',
        },
        {
          key: 'waist_to_ankle',
          label: 'Waist to Ankle',
          instruction: 'Continue from the knee down to the ankle bone.',
        },
      ],
    },
    // Individual measurements
    {
      key: 'cap',
      label: 'Cap',
      instruction: 'Wrap the measuring tape around the widest vertical part of the head, typically above the eyebrows and around the back at the widest point.',
    },
    {
      key: 'shoulders',
      label: 'Shoulders',
      instruction: 'Place the tip of the tape on the farthest point of one shoulder. Trace the tape across the back to the farthest point on the other shoulder.',
    },
    {
      key: 'chest',
      label: 'Chest',
      instruction: 'Wrap the tape around the back and bring it to the front at chest level. Ensure the tape is flat and firm across the widest part of the chest.',
    },
    {
      key: 'waist',
      label: 'Waist',
      instruction: 'Wrap the tape around the waistline, just above the belly button. Keep the tape flat and snug.',
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
      key: 'ankle_width',
      label: 'Ankle Width',
      instruction: 'Ask the client to remove their shoes. Wrap the tape diagonally around the joint where the leg meets the foot.',
    },
  ],
  male: [
    // Grouped measurements first
    {
      groupLabel: 'Shirt Length',
      groupInstruction: 'Measure from the shoulder down the body.',
      videoKey: 'shirt_shoulder_to_wrist',
      fields: [
        {
          key: 'shirt_shoulder_to_wrist',
          label: 'Shoulder to Wrist',
          instruction: 'Start at the point where the neck meets the shoulder. Run the tape straight down to the wrist.',
        },
        {
          key: 'shirt_shoulder_to_knee',
          label: 'Shoulder to Knee',
          instruction: 'Continue from the wrist down to the knee.',
        },
        {
          key: 'shirt_shoulder_to_ankle',
          label: 'Shoulder to Ankle',
          instruction: 'Continue from the knee down to the ankle.',
        },
      ],
    },
    // Individual measurements
    {
      key: 'round_sleeves',
      label: 'Round Sleeves (Bicep)',
      instruction: 'Ask the person to flex their bicep tightly. Wrap the tape around the widest part of the bicep.',
    },
    {
      key: 'wrist',
      label: 'Wrist',
      instruction: 'Wrap the tape around the wrist. The point where the tip meets the rest of the tape in a circle is your wrist size.',
    },
    {
      key: 'tummy',
      label: 'Tummy',
      instruction: 'Wrap the tape around the tummy area. Keep it flat and firm with no folds or errors at the back.',
    },
    {
      key: 'calves',
      label: 'Calves',
      instruction: "Wrap the tape around the widest part of the calf. Ensure it's comfortable and allows for movement.",
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
    cap: '',
    shoulders: '',
    chest: '',
    waist: '',
    hips: '',
    thigh: '',
    knee: '',
    // Sleeve measurements (grouped)
    shoulder_to_elbow: '',
    shoulder_to_wrist: '',
    // Trouser length measurements (grouped)
    waist_to_knee: '',
    waist_to_ankle: '',
    // Male-specific measurements
    round_sleeves: '',
    wrist: '',
    tummy: '',
    // Shirt length measurements (grouped)
    shirt_shoulder_to_wrist: '',
    shirt_shoulder_to_knee: '',
    shirt_shoulder_to_ankle: '',
    calves: '',
    ankle_width: '',
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
  const [showMobileDeleteConfirm, setShowMobileDeleteConfirm] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const orderedMobileFields = useMemo(() => {
    const genderSpecific =
      measurements.gender === 'male'
        ? measurementFieldGroups.male
        : measurementFieldGroups.female
    
    // Flatten the structure but keep track of groups for mobile view
    // For mobile, we only want one step per group (showing all grouped fields together)
    const flattenItems = (items: MeasurementItemConfig[]) => {
      const result: Array<MeasurementFieldConfig & { isGrouped?: boolean; groupLabel?: string; videoKey?: MeasurementFieldKey; isFirstInGroup?: boolean; isLastInGroup?: boolean }> = []
      
      for (const item of items) {
        if (isMeasurementGroup(item)) {
          // For grouped items in mobile, only add the first field as a step
          // but mark all fields with group metadata so we can access them
          item.fields.forEach((field, index) => {
            result.push({
              ...field,
              isGrouped: true,
              groupLabel: item.groupLabel,
              videoKey: item.videoKey,
              isFirstInGroup: index === 0,
              isLastInGroup: index === item.fields.length - 1,
            })
          })
        } else {
          // For individual items, just add them
          result.push({
            ...item,
            isGrouped: false
          })
        }
      }
      
      return result
    }
    
    const allFields = flattenItems([...measurementFieldGroups.common, ...genderSpecific])
    
    // For mobile view, filter to only show one step per group (only first field in each group)
    const filtered = allFields.filter(field => !field.isGrouped || field.isFirstInGroup)
    console.log('📱 ALL fields before filtering:', allFields.map(f => ({ key: f.key, label: f.label, isGrouped: f.isGrouped, isFirstInGroup: f.isFirstInGroup })))
    console.log('📱 FILTERED mobile fields:', filtered.map(f => ({ key: f.key, label: f.label, isGrouped: f.isGrouped })))
    console.log('📱 Total mobile steps (including intro):', filtered.length + 1)
    console.log('📱 Does filtered include calves?:', filtered.some(f => f.key === 'calves'))
    console.log('📱 Last field in filtered array:', filtered[filtered.length - 1]?.label || filtered[filtered.length - 1]?.key)
    return filtered
  }, [measurements.gender])
  
  // Keep all fields for reference (needed for rendering grouped fields)
  const allMobileFields = useMemo(() => {
    const genderSpecific =
      measurements.gender === 'male'
        ? measurementFieldGroups.male
        : measurementFieldGroups.female
    
    const flattenItems = (items: MeasurementItemConfig[]) => {
      const result: Array<MeasurementFieldConfig & { isGrouped?: boolean; groupLabel?: string; videoKey?: MeasurementFieldKey; isFirstInGroup?: boolean; isLastInGroup?: boolean }> = []
      
      for (const item of items) {
        if (isMeasurementGroup(item)) {
          item.fields.forEach((field, index) => {
            result.push({
              ...field,
              isGrouped: true,
              groupLabel: item.groupLabel,
              videoKey: item.videoKey,
              isFirstInGroup: index === 0,
              isLastInGroup: index === item.fields.length - 1,
            })
          })
        } else {
          result.push(item)
        }
      }
      
      return result
    }
    
    return flattenItems([...measurementFieldGroups.common, ...genderSpecific])
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
          .is('deleted_at', null)
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
          cap: '',
          shoulders: '',
          chest: '',
          waist: '',
          hips: '',
          thigh: '',
          knee: '',
          // Sleeve measurements (grouped)
          shoulder_to_elbow: '',
          shoulder_to_wrist: '',
          // Trouser length measurements (grouped)
          waist_to_knee: '',
          waist_to_ankle: '',
          // Male-specific measurements
          round_sleeves: '',
          wrist: '',
          tummy: '',
          // Shirt length measurements (grouped)
          shirt_shoulder_to_wrist: '',
          shirt_shoulder_to_knee: '',
          shirt_shoulder_to_ankle: '',
          calves: '',
          ankle_width: '',
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
          .is('deleted_at', null)
          .single()

        if (error) throw error

        if (data) {
          const formattedData = {
            gender: data.gender || 'male', // Default to male if not found
            // Common measurements (used by both genders)
            cap: data.cap?.toString() || '',
            shoulders: data.shoulders?.toString() || '',
            chest: data.chest?.toString() || '',
            waist: data.waist?.toString() || '',
            hips: data.hips?.toString() || '',
            thigh: data.thigh?.toString() || '',
            knee: data.knee?.toString() || '',
            // Sleeve measurements (grouped)
            shoulder_to_elbow: data.shoulder_to_elbow?.toString() || '',
            shoulder_to_wrist: data.shoulder_to_wrist?.toString() || '',
            // Trouser length measurements (grouped)
            waist_to_knee: data.waist_to_knee?.toString() || '',
            waist_to_ankle: data.waist_to_ankle?.toString() || '',
            // Male-specific measurements
            round_sleeves: data.round_sleeves?.toString() || '',
            wrist: data.wrist?.toString() || '',
            tummy: data.tummy?.toString() || '',
            // Shirt length measurements (grouped)
            shirt_shoulder_to_wrist: data.shirt_shoulder_to_wrist?.toString() || '',
            shirt_shoulder_to_knee: data.shirt_shoulder_to_knee?.toString() || '',
            shirt_shoulder_to_ankle: data.shirt_shoulder_to_ankle?.toString() || '',
            calves: data.calves?.toString() || '',
            ankle_width: data.ankle_width?.toString() || '',
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
      cap: '',
      shoulders: '',
      chest: '',
      waist: '',
      hips: '',
      thigh: '',
      knee: '',
      // Sleeve measurements (grouped)
      shoulder_to_elbow: '',
      shoulder_to_wrist: '',
      // Trouser length measurements (grouped)
      waist_to_knee: '',
      waist_to_ankle: '',
      // Male-specific measurements
      round_sleeves: '',
      wrist: '',
      tummy: '',
      // Shirt length measurements (grouped)
      shirt_shoulder_to_wrist: '',
      shirt_shoulder_to_knee: '',
      shirt_shoulder_to_ankle: '',
      calves: '',
      ankle_width: '',
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

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()
    console.log('🔥 Form submit triggered! e.type:', e?.type, 'e.nativeEvent:', (e as any)?.nativeEvent)

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
        .is('deleted_at', null)
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
        .update({ deleted_at: new Date().toISOString() })
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
    <div className="measurement-label-container">
      <span className="measurement-label-text">{label}</span>
      <button
        type="button"
        className="video-icon-button"
        onClick={() => openVideoGuide(fieldKey, label)}
        aria-label={`Watch tutorial for ${label}`}
      >
        <FiPlayCircle aria-hidden="true" />
      </button>
    </div>
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
    <div key={field.key} className="measurement-field individual">
      <div className="measurement-field-header">
        {renderMeasurementLabel(field.key, field.label)}
      </div>
      <p className="measurement-instruction">{field.instruction}</p>
      <div className="measurement-input-wrapper">
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
    </div>
  )

  const renderMeasurementItem = (item: MeasurementItemConfig) => {
    if (isMeasurementGroup(item)) {
      // Render grouped measurements
      return (
        <div key={item.groupLabel} className="measurement-group">
          <div className="measurement-group-header">
            <h4>{item.groupLabel}</h4>
            <button
              type="button"
              className="video-icon-button"
              onClick={() => openVideoGuide(item.videoKey, item.groupLabel)}
              aria-label={`Watch tutorial for ${item.groupLabel}`}
            >
              <FiPlayCircle aria-hidden="true" />
            </button>
          </div>
          <p className="measurement-group-instruction">{item.groupInstruction}</p>
          <div className="measurement-group-fields">
            {item.fields.map(field => (
              <div key={field.key} className="measurement-field grouped">
                <label>{field.label}</label>
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
            ))}
          </div>
        </div>
      )
    } else {
      return renderMeasurementField(item)
    }
  }

  const renderMobileStepVideo = (field: MeasurementFieldConfig & { videoKey?: MeasurementFieldKey }) => {
    const videoKey = field.videoKey || field.key
    const url = getVideoUrl(videoKey)
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

  const exitToMobileSelection = () => {
    setSelectedMeasurementId(null);
    setIsCreatingNew(false);
    setIsEditing(false);
    setCurrentMobileStep(0);
    setSidebarCollapsed(false);
  }

  const handleCancel = () => {
    if (isCreatingNew) {
      setIsCreatingNew(false);
      setNewMeasurementName('');
      setSelectedMeasurementId(null);
    } else {
      setIsEditing(false);
    }
    if (isMobile) {
      exitToMobileSelection();
    }
  };

  const handleMobileDelete = () => {
    if (!selectedMeasurementId) return;
    setShowMobileDeleteConfirm(true);
  };

  const confirmMobileDelete = () => {
    if (!selectedMeasurementId) return;
    handleDelete(selectedMeasurementId);
    setShowMobileDeleteConfirm(false);
    exitToMobileSelection();
  };

  const cancelMobileDelete = () => {
    setShowMobileDeleteConfirm(false);
  };

  // Get the current measurement name
  const currentMeasurementName = isCreatingNew
    ? "New Measurement"
    : measurementsList.find(m => m.id === selectedMeasurementId)?.name || 'Your Measurements';

  const totalMobileSteps = orderedMobileFields.length + 1
  const isLastMobileStep = currentMobileStep === totalMobileSteps - 1
  const progressRatio = totalMobileSteps > 1 ? currentMobileStep / (totalMobileSteps - 1) : 0
  
  // Debug logging for step calculation
  console.log('📊 Step calculation:', {
    currentStep: currentMobileStep,
    totalSteps: totalMobileSteps,
    isLastStep: isLastMobileStep,
    currentFieldKey: currentMobileStep > 0 ? orderedMobileFields[currentMobileStep - 1]?.key : 'intro',
    currentFieldLabel: currentMobileStep > 0 ? orderedMobileFields[currentMobileStep - 1]?.label : 'intro',
  })

  const goToPreviousStep = () => setCurrentMobileStep(prev => Math.max(prev - 1, 0))
  const goToNextStep = () => {
    console.log('🔄 goToNextStep called, current step:', currentMobileStep)
    const nextStep = Math.min(currentMobileStep + 1, totalMobileSteps - 1)
    const currentField = currentMobileStep > 0 ? orderedMobileFields[currentMobileStep - 1] : null
    const nextField = nextStep > 0 ? orderedMobileFields[nextStep - 1] : null
    console.log(`🔄 Step ${currentMobileStep} → ${nextStep}`)
    console.log(`  Current field:`, currentField?.label || 'Intro')
    console.log(`  Next field:`, nextField?.label || 'Intro')
    console.log(`  Total steps:`, totalMobileSteps)
    console.log(`  Is last step?:`, nextStep === totalMobileSteps - 1)
    console.log(`  Next step will be:`, nextStep)

    // Only go to next step, NEVER submit the form here
    setCurrentMobileStep(nextStep)
  }
  const isCurrentMobileStepComplete = () => {
    if (currentMobileStep === 0) return true
    const activeField =
      currentMobileStep === 0
        ? null
        : orderedMobileFields[Math.min(currentMobileStep - 1, orderedMobileFields.length - 1)]
    if (!activeField) return true

    if (activeField.isGrouped && activeField.groupLabel) {
      const groupFields = allMobileFields.filter(
        (field) => field.isGrouped && field.groupLabel === activeField.groupLabel
      )
      return groupFields.every((field) => measurements[field.key] !== '')
    }

    return measurements[activeField.key] !== ''
  }
  const shouldDisableNext = isFormEditable() && !isCurrentMobileStepComplete()

  const renderMobileStepper = () => {
    const activeField =
      currentMobileStep === 0
        ? null
        : orderedMobileFields[Math.min(currentMobileStep - 1, orderedMobileFields.length - 1)]

    return (
      <div className="mobile-stepper">
        <div className="mobile-stepper-header">
          <div className="mobile-stepper-header-top">
            <div className="mobile-step-count">
              Step {currentMobileStep + 1} of {totalMobileSteps}
            </div>
            {(isCreatingNew || selectedMeasurementId) && (
              <div className="mobile-stepper-actions">
                {!isFormEditable() && !isCreatingNew && (
                  <button
                    type="button"
                    className="mobile-icon-button edit"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit measurements"
                  >
                    <FiEdit2 aria-hidden="true" />
                  </button>
                )}
                {!isCreatingNew && selectedMeasurementId && (
                  <button
                    type="button"
                    className="mobile-icon-button delete"
                    onClick={handleMobileDelete}
                    aria-label="Delete measurements"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="mobile-icon-button close"
                  onClick={isFormEditable() ? handleCancel : exitToMobileSelection}
                  aria-label={isFormEditable() ? 'Cancel and exit' : 'Exit measurements'}
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>
            )}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      console.log('🚫 Prevented Enter key form submission (name field)')
                    }
                  }}
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
                <h3>{activeField.groupLabel || activeField.label}</h3>
                <span>({currentMobileStep} of {totalMobileSteps - 1})</span>
              </div>
              {activeField.isGrouped && activeField.isFirstInGroup ? (
                // For grouped fields, show all fields in the group together
                <>
                  {renderMobileStepVideo(activeField)}
                  <div className="mobile-step-grouped-fields">
                    {(() => {
                      // Find all fields in this group
                      const groupFields = allMobileFields.filter(
                        f => f.isGrouped && f.groupLabel === activeField.groupLabel
                      )
                      return groupFields.map(field => (
                        <div key={field.key} className="mobile-step-field">
                          <label htmlFor={`mobile-${field.key}`}>
                            {field.label}
                          </label>
                          <p className="mobile-step-instruction">{field.instruction}</p>
                          <input
                            id={`mobile-${field.key}`}
                            type="number"
                            min="0"
                            step="any"
                            placeholder={field.label}
                            value={measurements[field.key]}
                            onChange={e => handleInputChange(field.key, e.target.value)}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                console.log('🚫 Prevented Enter key form submission (grouped field)')
                              }
                            }}
                            disabled={!isFormEditable()}
                          />
                        </div>
                      ))
                    })()}
                  </div>
                </>
              ) : !activeField.isGrouped ? (
                // For non-grouped fields, show as before
                <>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          console.log('🚫 Prevented Enter key form submission (individual field)')
                        }
                      }}
                      disabled={!isFormEditable()}
                    />
                  </div>
                </>
              ) : null}
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
          {(() => {
            console.log('🔘 Button render logic:', {
              isLastMobileStep,
              isFormEditable: isFormEditable(),
              currentStep: currentMobileStep,
              totalSteps: totalMobileSteps,
              calculation: `${currentMobileStep} === ${totalMobileSteps - 1}`,
              shouldShowSubmitButton: isLastMobileStep && isFormEditable(),
            })
            return isLastMobileStep ? (
              isFormEditable() ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="submit-button"
                  data-testid="save-measurements-button"
                  onClick={(e) => {
                    console.log('🎯 Save button clicked directly!')
                    e.preventDefault()
                    handleSubmit(e as any)
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Measurements'}
                </button>
              ) : (
                <button type="button" onClick={exitToMobileSelection}>
                  Done
                </button>
              )
            ) : (
              <button type="button" onClick={goToNextStep} disabled={shouldDisableNext}>
                Next
              </button>
            )
          })()}
        </div>
      </div>
    )
  }

  const handleMobileBack = () => {
    exitToMobileSelection();
  };

  const renderMobileSelectionPanel = () => (
    <div className="mobile-selection-panel">
      <button className="mobile-selection-back" onClick={() => router.push('/')}>
        <IoArrowBack size={20} />
        <span>Back to Home</span>
      </button>
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

  const showSidebar = !isMobile

  return (
    <div className="measurements-page">
      {showSidebar && (
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
      )}


      <div className="modal-content">
        {(isCreatingNew || selectedMeasurementId) ? (
          <>
            {!isMobile && (
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
            )}
            {isMobile ? (
              <div
                className={`mobile-measurements-form ${isFormEditable() ? 'editing' : ''}`}
              >
                {renderMobileStepper()}
              </div>
            ) : (
              <form className={`measurements-form ${isFormEditable() ? 'editing' : ''}`} onSubmit={handleSubmit}>
                <div className="video-guide-hint">
                  <FiPlayCircle aria-hidden="true" />
                  <p>Tap the play icon beside any measurement to watch a quick tutorial without leaving the app.</p>
                </div>
                <div className="measurements-items two-column">
                  {(() => {
                    const genderSpecific =
                      measurements.gender === 'male'
                        ? measurementFieldGroups.male
                        : measurementFieldGroups.female
                    const allMeasurements = [...measurementFieldGroups.common, ...genderSpecific]

                    const groupedItems = allMeasurements.filter(isMeasurementGroup)
                    const leftColumnIndividualKeys = new Set<MeasurementFieldKey>([
                      'tummy',
                      'calves',
                    ])
                    const individualItems = allMeasurements.filter(isMeasurementField)
                    const leftColumnIndividuals = individualItems.filter((item) =>
                      leftColumnIndividualKeys.has(item.key)
                    )
                    const rightColumnIndividuals = individualItems.filter(
                      (item) => !leftColumnIndividualKeys.has(item.key)
                    )

                    return (
                      <>
                        <div className="measurement-column grouped-column">
                          {groupedItems.map((item) => (
                            <div key={item.groupLabel} className="measurement-item-wrapper grouped">
                              {renderMeasurementItem(item)}
                            </div>
                          ))}
                          {leftColumnIndividuals.map((item) => (
                            <div key={item.key} className="measurement-item-wrapper individual">
                              {renderMeasurementItem(item)}
                            </div>
                          ))}
                        </div>
                        <div className="measurement-column individual-column">
                          {rightColumnIndividuals.map((item) => (
                            <div key={item.key} className="measurement-item-wrapper individual">
                              {renderMeasurementItem(item)}
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
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

      {showMobileDeleteConfirm && (
        <div
          className="video-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              cancelMobileDelete()
            }
          }}
        >
          <div className="video-modal">
            <div className="video-modal-header">
              <h3>Delete measurement?</h3>
              <button
                type="button"
                className="video-modal-close"
                aria-label="Close delete confirmation"
                onClick={cancelMobileDelete}
              >
                &times;
              </button>
            </div>
            <div className="video-modal-body">
              <p>This will remove the measurement from your list.</p>
              <div className="form-buttons">
                <button type="button" className="cancel-button" onClick={cancelMobileDelete}>
                  Cancel
                </button>
                <button type="button" onClick={confirmMobileDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 