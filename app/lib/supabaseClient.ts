// lib/supabaseClient.ts
// Use the Next.js auth-helpers browser client so that sessions are
// automatically stored both in localStorage and in HTTP-only cookies.
// The cookies are what our API route handlers rely on to identify the user.

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createBrowserSupabaseClient()
