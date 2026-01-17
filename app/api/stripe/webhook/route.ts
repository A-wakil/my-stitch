import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as const,
})

// Use service role for webhook (no auth context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Need to add this to .env
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET! // Need to add this to .env
    )
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // Handle the event
  console.log('📨 Webhook received:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('✅ Payment successful for session:', session.id)
        console.log('📦 Metadata:', session.metadata)

        // Only process if it's a bag checkout
        if (!session.metadata?.bag_id) {
          console.log('Not a bag checkout, skipping')
          return NextResponse.json({ received: true })
        }

        // Check if order already exists
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('bag_id', session.metadata.bag_id)
          .maybeSingle()

        if (existingOrder) {
          console.log('✓ Order already exists:', existingOrder.id)
          return NextResponse.json({ received: true, order_id: existingOrder.id })
        }

        // Fetch bag items
        const { data: items, error: itemsErr } = await supabase
          .from('bag_items')
          .select('*')
          .eq('bag_id', session.metadata.bag_id)

        if (itemsErr || !items || items.length === 0) {
          console.error('❌ Error fetching bag items:', itemsErr)
          throw new Error('Failed to fetch bag items')
        }

        console.log(`Found ${items.length} bag items`)

        // Create order
        const totalAmount = (session.amount_total || 0) / 100
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: session.metadata.user_id,
            tailor_id: session.metadata.tailor_id,
            status: 'pending',
            total_amount: totalAmount,
            shipping_address: session.metadata.shipping_address 
              ? JSON.parse(session.metadata.shipping_address) 
              : null,
            bag_id: session.metadata.bag_id,
            stripe_session_id: session.id, // Track which session created this
          })
          .select()
          .single()

        if (orderErr) {
          console.error('❌ Error creating order:', orderErr)
          throw orderErr
        }

        console.log('✅ Order created:', order.id)

        // Create order items
        const orderItemsPayload = items.map((item) => ({
          order_id: order.id,
          design_id: item.design_id,
          price: item.price ?? null,
          tailor_notes: item.tailor_notes ?? null,
          measurement_id: item.measurement_id ?? null,
        }))

        const { error: orderItemsErr } = await supabase
          .from('order_items')
          .insert(orderItemsPayload)

        if (orderItemsErr) {
          console.error('❌ Error creating order items:', orderItemsErr)
          throw orderItemsErr
        }

        console.log(`✅ Created ${orderItemsPayload.length} order items`)

        // Update bag status
        await supabase
          .from('bags')
          .update({ status: 'checked_out' })
          .eq('id', session.metadata.bag_id)

        console.log('✅ Bag marked as checked_out')

        // Send email notifications
        try {
          const { data: customerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.metadata.user_id)
            .single()

          const { data: tailorProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.metadata.tailor_id)
            .single()

          if (customerProfile && tailorProfile) {
            const { notifyOrderParties } = await import('../../../lib/notifications')
            await notifyOrderParties(
              'order_placed',
              order,
              customerProfile,
              tailorProfile,
              { totalAmount }
            )
            console.log('✅ Email notifications sent')
          }
        } catch (notificationError) {
          console.error('⚠️ Error sending notifications:', notificationError)
          // Don't fail the webhook if notifications fail
        }

        return NextResponse.json({ 
          received: true, 
          order_id: order.id,
          items_created: orderItemsPayload.length 
        })
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('❌ Payment failed:', paymentIntent.id)
        // Handle payment failure if needed
        return NextResponse.json({ received: true })
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
        return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error.message },
      { status: 500 }
    )
  }
}

