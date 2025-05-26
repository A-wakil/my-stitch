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

    const { error } = await supabase
      .from('bag_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete bag item error', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Bag item delete exception', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 