// hooks/useUserProfile.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Profile {
  username: string;
  roles: string[];
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, roles')
          .eq('id', user.id)
          .single()
        if (error) {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  return { profile, loading }
}
