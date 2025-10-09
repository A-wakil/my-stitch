import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

/**
 * Body expected:
 * {
 *   user_id: string,
 *   tailor_id: string,
 *   design_id: string,
 *   fabric_idx: number,
 *   color_idx: number | null,
 *   price: number,
 *   tailor_notes?: string,
 *   measurement_id?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies })
    const body = await req.json()

    // Validate payload with Zod
    const AddItemSchema = z.object({
      user_id: z.string().min(1, 'user_id is required'),
      tailor_id: z.string().min(1, 'tailor_id is required'),
      design_id: z.string().min(1, 'design_id is required'),
      price: z.number().nonnegative(),
      tailor_notes: z.string().optional(),
      measurement_id: z.string().optional()
    })

    const parsed = AddItemSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Invalid payload'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { user_id, tailor_id } = parsed.data

    // 1. Find or create an OPEN bag for this user & tailor
    let { data: bag, error: bagError } = await supabase
      .from('bags')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'open')
      .maybeSingle()

    if (bagError) {
      console.error('Bag lookup error', bagError)
      return NextResponse.json({ error: 'Bag lookup failed' }, { status: 500 })
    }

    if (bag && bag.tailor_id !== tailor_id) {
      return NextResponse.json({
        error: 'You already have items from another tailor. Please checkout or empty that bag first.'
      }, { status: 400 })
    }

    if (!bag) {
      const { data: newBag, error: createErr } = await supabase
        .from('bags')
        .insert({ user_id, tailor_id })
        .select()
        .single()

      if (createErr) {
        console.error('Bag create error', createErr)
        return NextResponse.json({ error: 'Failed to create bag' }, { status: 500 })
      }
      bag = newBag
    }

    // 2. Insert bag item
    const itemPayload = {
      bag_id: bag.id,
      design_id: body.design_id,
      price: body.price ?? null,
      tailor_notes: body.tailor_notes ?? null,
      measurement_id: body.measurement_id ?? null
    }

    const { data: bagItem, error: itemErr } = await supabase
      .from('bag_items')
      .insert(itemPayload)
      .select()
      .single()

    if (itemErr) {
      console.error('Bag item insert error', itemErr)
      return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, bag_id: bag.id, item: bagItem })
  } catch (err: any) {
    console.error('Bag add exception', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 