import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designId = searchParams.get('design_id')
    
    // Get user session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let query = supabase.from('orders').select('id, design_id')
    
    // Filter by design_id if provided
    if (designId) {
      query = query.eq('design_id', designId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in orders API:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 