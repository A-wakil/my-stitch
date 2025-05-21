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
        styleType,
        fabricYards
      } = metadata;

      // Get order data from the checkout session
      const customerEmail = session.customer_details?.email || '';
      console.log('Processing webhook for customer email:', customerEmail);
      
      if (!customerEmail) {
        console.error('No customer email found in session');
        return NextResponse.json(
          { error: 'Customer email is required' },
          { status: 400 }
        );
      }
      
      // For measurements, we need to fetch the full measurement data by ID
      let measurementsData = {};
      if (measurementId) {
        try {
          const { data: measurementData, error: measurementError } = await supabase
            .from('measurements')
            .select('*')
            .eq('id', measurementId)
            .single();
          
          if (!measurementError && measurementData) {
            measurementsData = measurementData;
            console.log('Found measurement data');
          } else {
            console.error('Error fetching measurement data:', measurementError);
          }
        } catch (measureError) {
          console.error('Exception in measurement lookup:', measureError);
        }
      }

      // Calculate estimated completion date - 30 days from now
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 30);

      // Find user by email - if not found, fail the webhook
      let userId;
      try {
        console.log('Looking for user profile with email:', customerEmail);
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();
        
        if (!userProfileError && userProfile && userProfile.id) {
          userId = userProfile.id;
          console.log('Found matching user profile with ID:', userId);
        } else {
          console.error('No user found with email:', customerEmail, 'Error:', userProfileError);
          return NextResponse.json(
            { error: 'User not found for the provided email' },
            { status: 404 }
          );
        }
      } catch (userIdError) {
        console.error('Error finding user ID:', userIdError);
        return NextResponse.json(
          { error: 'Failed to find valid user ID for order' },
          { status: 500 }
        );
      }

      // Create the order with the user ID we found
      console.log('Creating order with user_id:', userId);
      let orderData;
      try {
        const { data, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              user_id: userId,
              tailor_id: tailorId,
              design_id: designId,
              status: 'pending',
              total_amount: (session.amount_total || 0) / 100,
              shipping_address: shippingAddress,
              measurements: JSON.stringify(measurementsData),
              tailor_notes: tailorNotes || null,
              fabric_name: selectedFabric,
              color_name: selectedColor,
              style_type: styleType || 'kaftan',
              fabric_yards: parseFloat(fabricYards as string) || 4.5,
              estimated_completion_date: estimatedCompletionDate.toISOString()
            },
          ])
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
          return NextResponse.json(
            { error: 'Failed to create order in database' },
            { status: 500 }
          );
        }
        
        orderData = data;
        console.log('Order created successfully with ID:', orderData.id);
      } catch (orderCreateError) {
        console.error('Exception creating order:', orderCreateError);
        return NextResponse.json(
          { error: 'Exception occurred creating order' },
          { status: 500 }
        );
      }

      // Send notifications if the order was created successfully
      if (orderData) {
        try {
          // Fetch customer profile
          console.log('Fetching customer profile for email:', customerEmail);
          const { data: customerProfile, error: customerProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', customerEmail)
            .single();

          if (customerProfileError) {
            console.error('Error fetching customer profile:', customerProfileError);
            throw new Error('Failed to fetch customer profile');
          }

          // Fetch tailor profile
          console.log('Fetching tailor profile for ID:', tailorId);
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
          console.log('Sending order notifications...');
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
          // Don't fail the webhook just because notifications failed
        }
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