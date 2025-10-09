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

export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Find the user's open bag
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
      return NextResponse.json({ success: true, message: 'No bag to empty' })
    }

    // Delete all bag items first (due to foreign key constraints)
    const { error: itemsError } = await supabase
      .from('bag_items')
      .delete()
      .eq('bag_id', bag.id)

    if (itemsError) {
      console.error('Delete bag items error', itemsError)
      return NextResponse.json({ error: 'Failed to empty bag items' }, { status: 500 })
    }

    // Then delete the bag
    const { error: bagError } = await supabase
      .from('bags')
      .delete()
      .eq('id', bag.id)

    if (bagError) {
      console.error('Delete bag error', bagError)
      return NextResponse.json({ error: 'Failed to delete bag' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Bag emptied successfully' })
  } catch (err: any) {
    console.error('Empty bag exception', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 