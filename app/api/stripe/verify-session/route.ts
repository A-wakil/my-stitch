import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Simple in-memory cache to prevent duplicate processing
const processedSessions = new Set<string>();
const sessionTimestamps = new Map<string, number>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  for (const [sessionId, timestamp] of sessionTimestamps.entries()) {
    if (timestamp < oneMinuteAgo) {
      sessionTimestamps.delete(sessionId);
      processedSessions.delete(sessionId);
    }
  }
}, 60000); // Clean up every minute

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil' as const,
});

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if this session was already processed recently (within 30 seconds)
    const now = Date.now();
    const lastProcessed = sessionTimestamps.get(session_id);

    if (lastProcessed && (now - lastProcessed) < 30000) {
      console.log('⚠️ Session already processed recently, skipping:', session_id);
      return NextResponse.json({
        success: true,
        message: 'Session already processed',
        skipped: true
      });
    }

    // Mark session as being processed
    processedSessions.add(session_id);
    sessionTimestamps.set(session_id, now);

    console.log('Verifying session:', session_id);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log('Session status:', session.payment_status);
    console.log('Session metadata:', session.metadata);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Check if this is a bag checkout
    const metadata = session.metadata || {};
    
    if (!metadata.bag_id) {
      console.log('Not a bag checkout, skipping');
      return NextResponse.json({ success: true, message: 'Not a bag checkout' });
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const authCookie = cookieStore.get('sb-ewfttdrfsdhgslldfgmz-auth-token');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authCookie ? {
          Authorization: `Bearer ${authCookie.value}`
        } : {}
      }
    });
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bag_id, user_id, tailor_id, shipping_address } = metadata;

    // Check if bag has already been checked out (processed)
    console.log('Checking bag status for bag_id:', bag_id);

    const { data: bagData } = await supabase
      .from('bags')
      .select('status, updated_at')
      .eq('id', bag_id)
      .maybeSingle();

    if (bagData?.status === 'checked_out') {
      console.log('✓ Bag already checked out, looking for existing order...');

      // Find the order for this bag
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('bag_id', bag_id)
        .maybeSingle();

      if (existingOrder) {
        // Check if order was created recently (within last 30 seconds)
        const orderAge = Date.now() - new Date(existingOrder.created_at).getTime();
        const thirtySecondsAgo = 30 * 1000;

        if (orderAge < thirtySecondsAgo) {
          console.log('✓ Order created recently, skipping duplicate processing');
          return NextResponse.json({
            success: true,
            order_id: existingOrder.id,
            already_existed: true
          });
        } else {
          console.warn('⚠️ Old order found, but bag is checked_out - this should not happen');
        }
      } else {
        console.warn('⚠️ Bag is checked_out but no order found - this should not happen');
      }
    }

    console.log('Creating new order for bag_id:', bag_id);

    // Fetch bag items
    console.log('Fetching bag items for bag_id:', bag_id);
    const { data: items, error: itemsErr } = await supabase
      .from('bag_items')
      .select('*')
      .eq('bag_id', bag_id);

    if (itemsErr) {
      console.error('Error fetching bag items:', itemsErr);
      return NextResponse.json({ error: 'Failed to fetch bag items' }, { status: 500 });
    }

    if (!items || items.length === 0) {
      console.error('No bag items found for bag_id:', bag_id);
      return NextResponse.json({ error: 'Bag is empty' }, { status: 404 });
    }

    console.log(`Found ${items.length} bag items:`, JSON.stringify(items, null, 2));

    // Create order
    const totalAmount = (session.amount_total || 0) / 100;
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id,
        tailor_id,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: shipping_address ? JSON.parse(shipping_address) : null,
        bag_id: bag_id,
      })
      .select()
      .single();

    if (orderErr) {
      console.error('Error creating order:', orderErr);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    console.log('Order created with ID:', order.id);

    // Create order items
    const orderItemsPayload = items.map((item) => ({
      order_id: order.id,
      design_id: item.design_id,
      price: item.price ?? null,
      tailor_notes: item.tailor_notes ?? null,
      measurement_id: item.measurement_id ?? null
    }));

    console.log('📦 Creating order items...');
    console.log('Order ID:', order.id);
    console.log('Payload:', JSON.stringify(orderItemsPayload, null, 2));

    const { data: insertedItems, error: orderItemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)
      .select();

    if (orderItemsErr) {
      console.error('❌ ERROR creating order items:', orderItemsErr);
      console.error('Error details:', JSON.stringify(orderItemsErr, null, 2));
      return NextResponse.json({ error: 'Failed to create order items', details: orderItemsErr }, { status: 500 });
    }

    console.log(`✅ Successfully created ${insertedItems?.length || 0} order items!`);
    console.log('Inserted items:', JSON.stringify(insertedItems, null, 2));

    // Send email notifications to customer and tailor
    try {
      console.log('Fetching profiles for email notifications...');

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
        const { notifyOrderParties } = await import('../../../lib/notifications');
        await notifyOrderParties(
          'order_placed',
          order,
          customerProfile,
          tailorProfile,
          { totalAmount }
        );
        console.log('✓ Order notifications sent successfully');
      } else {
        console.warn('⚠️ Could not fetch profiles for notifications - customer or tailor profile missing');
      }
    } catch (notificationError) {
      console.error('❌ Error sending order notifications:', notificationError);
      // Don't fail the entire process if notifications fail
    }

    // Update bag status
    await supabase
      .from('bags')
      .update({ status: 'checked_out' })
      .eq('id', bag_id);

    // Update timestamp for successful processing
    sessionTimestamps.set(session_id, now);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      items_created: insertedItems?.length || 0,
      session_id: session_id
    });
  } catch (err: any) {
    console.error('Session verification error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

