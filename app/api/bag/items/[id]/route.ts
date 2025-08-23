import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Item id required' }, { status: 400 })
    }

    // First, get the bag_id before deleting the item
    const { data: bagItem, error: fetchError } = await supabase
      .from('bag_items')
      .select('bag_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Fetch bag item error', fetchError)
      return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
    }

    const bagId = bagItem.bag_id

    // Delete the bag item
    const { error } = await supabase
      .from('bag_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete bag item error', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    // Check if there are any remaining items in this bag
    const { data: remainingItems, error: countError } = await supabase
      .from('bag_items')
      .select('id')
      .eq('bag_id', bagId)

    if (countError) {
      console.error('Count remaining items error', countError)
      // Don't fail the request if we can't count items, just log it
    } else if (!remainingItems || remainingItems.length === 0) {
      // If no remaining items, delete the bag
      const { error: deleteBagError } = await supabase
        .from('bags')
        .delete()
        .eq('id', bagId)

      if (deleteBagError) {
        console.error('Delete empty bag error', deleteBagError)
        // Don't fail the request if we can't delete the bag, just log it
      } else {
        console.log(`Empty bag ${bagId} deleted successfully`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Bag item delete exception', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 