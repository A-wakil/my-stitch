import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { shipping_address } = body

    if (!shipping_address) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    }

    // Validate required address fields
    if (!shipping_address.street_address || !shipping_address.city || !shipping_address.state || !shipping_address.zip_code) {
      return NextResponse.json({ error: 'Complete shipping address is required' }, { status: 400 })
    }

    // 1. Fetch open bag and its items
    const { data: bag, error: bagErr } = await supabase
      .from('bags')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle()

    if (bagErr || !bag) {
      return NextResponse.json({ error: 'No open bag found' }, { status: 400 })
    }

    const { data: items, error: itemsErr } = await supabase
      .from('bag_items')
      .select(`
        *,
        designs:design_id (
          title,
          images
        )
      `)
      .eq('bag_id', bag.id)

    if (itemsErr) {
      console.error('Bag items fetch error', itemsErr)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Bag is empty' }, { status: 400 })
    }

    // 2. Compute total and create line items for Stripe
    const line_items = items.map((item) => {
      const stitchPrice = item.stitch_price ?? 0
      const yardPrice = item.yard_price ?? 0
      const yards = item.fabric_yards ?? 0
      const totalPrice = stitchPrice + (yardPrice * yards)

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.designs?.title || 'Custom Design'} - ${item.style_type}`,
            description: `${yards} yards of fabric, Fabric index: ${item.fabric_idx}${item.tailor_notes ? `, Notes: ${item.tailor_notes}` : ''}`,
            images: item.designs?.images ? [item.designs.images[0]] : [],
          },
          unit_amount: Math.round(totalPrice * 100), // Convert to cents
        },
        quantity: 1,
      }
    })

    // 3. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer/bag`,
      metadata: {
        bag_id: bag.id,
        user_id: user.id,
        tailor_id: bag.tailor_id,
        shipping_address: JSON.stringify(shipping_address),
      },
      customer_email: user.email,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
    })

    return NextResponse.json({ 
      success: true, 
      checkout_url: session.url,
      session_id: session.id 
    })
  } catch (err: any) {
    console.error('Bag checkout error', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
} 