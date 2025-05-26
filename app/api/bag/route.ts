import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ bag: null })
    }

    const { data: bag, error: bagErr } = await supabase
      .from('bags')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle()

    if (bagErr) {
      console.error('Bag fetch error', bagErr)
      return NextResponse.json({ error: 'Failed to fetch bag' }, { status: 500 })
    }

    if (!bag) {
      return NextResponse.json({ bag: null })
    }

    const { data: items, error: itemsErr } = await supabase
      .from('bag_items')
      .select('*')
      .eq('bag_id', bag.id)

    if (itemsErr) {
      console.error('Bag items error', itemsErr)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({ bag, items })
  } catch (err: any) {
    console.error('Bag route error', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 