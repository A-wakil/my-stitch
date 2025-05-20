import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { supabase } from '../../../lib/supabaseClient';
import { notifyOrderParties } from '../../../lib/notifications';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil' as const,
});

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract metadata from the session
      const metadata = session.metadata || {};
      const {
        shippingAddress,
        measurementId,
        tailorNotes,
        selectedFabric,
        selectedColor,
        designId,
        tailorId,
      } = metadata;

      // Create the order in the database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: session.customer_details?.email,
            status: 'pending',
            total_amount: (session.amount_total || 0) / 100, // Convert from cents to dollars
            shipping_address: shippingAddress,
            measurement_id: measurementId,
            tailor_notes: tailorNotes,
            selected_fabric: selectedFabric,
            selected_color: selectedColor,
            payment_status: 'paid',
            stripe_session_id: session.id,
            design_id: designId,
            tailor_id: tailorId,
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }

      try {
        // Fetch customer profile
        const { data: customerProfile, error: customerProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.customer_details?.email)
          .single();

        if (customerProfileError) {
          console.error('Error fetching customer profile:', customerProfileError);
          throw new Error('Failed to fetch customer profile');
        }

        // Fetch tailor profile
        const { data: tailorProfile, error: tailorProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tailorId)
          .single();

        if (tailorProfileError) {
          console.error('Error fetching tailor profile:', tailorProfileError);
          throw new Error('Failed to fetch tailor profile');
        }

        // Send notifications
        await notifyOrderParties(
          'order_placed',
          orderData,
          customerProfile,
          tailorProfile,
          { totalAmount: (session.amount_total || 0) / 100 }
        );
        console.log('Order notifications sent successfully');

      } catch (notificationError) {
        console.error('Error in notification process:', notificationError);
        // Don't return an error response here, as the order was created successfully
        // Just log the error and continue
      }

      return NextResponse.json({ success: true });
    }

    // Handle other event types if needed
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 