// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ewfttdrfsdhgslldfgmz.supabase.co" // process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZnR0ZHJmc2RoZ3NsbGRmZ216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzIzNTIsImV4cCI6MjA0ODk0ODM1Mn0.hC0NzA-al485_cvh21rDuLMnyng0FXVYzeczRt1X1JA" // process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
