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
      
      // Check if this is a bag checkout or single item checkout
      if (metadata.bag_id) {
        // Handle bag checkout
        return await handleBagCheckout(session, metadata);
      } else {
        // Handle single item checkout (existing logic)
        return await handleSingleItemCheckout(session, metadata);
      }
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

async function handleBagCheckout(session: Stripe.Checkout.Session, metadata: any) {
  const { bag_id, user_id, tailor_id, shipping_address } = metadata;
  
  console.log('Processing bag checkout for bag_id:', bag_id);
  
  try {
    // 1. Fetch bag and items
    const { data: bag, error: bagErr } = await supabase
      .from('bags')
      .select('*')
      .eq('id', bag_id)
      .single();

    if (bagErr || !bag) {
      console.error('Bag not found:', bagErr);
      return NextResponse.json({ error: 'Bag not found' }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from('bag_items')
      .select('*')
      .eq('bag_id', bag_id);

    if (itemsErr || !items || items.length === 0) {
      console.error('Bag items not found:', itemsErr);
      return NextResponse.json({ error: 'Bag items not found' }, { status: 404 });
    }

    // 2. Create order
    const totalAmount = (session.amount_total || 0) / 100;
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id,
        tailor_id,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: shipping_address ? JSON.parse(shipping_address) : null,
      })
      .select()
      .single();

    if (orderErr) {
      console.error('Error creating order:', orderErr);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // 3. Create order items
    const orderItemsPayload = items.map((item) => ({
      order_id: order.id,
      design_id: item.design_id,
      fabric_idx: item.fabric_idx,
      color_idx: item.color_idx,
      style_type: item.style_type,
      fabric_yards: item.fabric_yards,
      yard_price: item.yard_price,
      stitch_price: item.stitch_price,
      tailor_notes: item.tailor_notes,
      measurement_id: item.measurement_id
    }));

    const { error: orderItemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (orderItemsErr) {
      console.error('Error creating order items:', orderItemsErr);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // 4. Update bag status
    await supabase
      .from('bags')
      .update({ status: 'checked_out' })
      .eq('id', bag_id);

    // 5. Send notifications
    try {
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();

      const { data: tailorProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', tailor_id)
        .single();

      if (customerProfile && tailorProfile) {
        await notifyOrderParties(
          'order_placed',
          order,
          customerProfile,
          tailorProfile,
          { totalAmount }
        );
        console.log('Bag order notifications sent successfully');
      }
    } catch (notificationError) {
      console.error('Error sending bag order notifications:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing bag checkout:', error);
    return NextResponse.json({ error: 'Failed to process bag checkout' }, { status: 500 });
  }
}

async function handleSingleItemCheckout(session: Stripe.Checkout.Session, metadata: any) {
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

  // Get design data to retrieve completion time
  let completionTimeWeeks = 4; // Default to 4 weeks if design not found
  try {
    const { data: designData, error: designError } = await supabase
      .from('designs')
      .select('completion_time')
      .eq('id', designId)
      .single();
    
    if (!designError && designData && designData.completion_time) {
      completionTimeWeeks = designData.completion_time;
      console.log('Found design with completion time:', completionTimeWeeks, 'weeks');
    } else {
      console.error('Error fetching design data:', designError);
    }
  } catch (designError) {
    console.error('Exception in design lookup:', designError);
  }

  // Calculate estimated completion date with tailor's completion time + shipping time
  const estimatedCompletionDate = new Date();
  const totalWeeks = completionTimeWeeks + 2; // Design completion + min shipping time
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (totalWeeks * 7));
  console.log('Calculated estimated completion date:', estimatedCompletionDate.toISOString());

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
          fabric_yards: fabricYards ? parseFloat(fabricYards) : 4.5,
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