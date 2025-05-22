import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil' as const,
});

export async function POST(request: Request) {
  try {
    const { orderDetails } = await request.json();

    // Validate required fields
    if (!orderDetails) {
      return NextResponse.json(
        { error: { message: 'Order details are required' } },
        { status: 400 }
      );
    }

    if (!orderDetails.design?.title || !orderDetails.total) {
      return NextResponse.json(
        { error: { message: 'Invalid order details: Missing required fields' } },
        { status: 400 }
      );
    }

    // Ensure we have a valid amount
    const amount = Math.round(orderDetails.total * 100);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Invalid order amount' } },
        { status: 400 }
      );
    }

    // Create line item description
    const description = [
      `Fabric: ${orderDetails.design.fabrics[orderDetails.selectedFabric]?.name || 'Selected fabric'}`,
      orderDetails.tailorNotes ? `Notes: ${orderDetails.tailorNotes}` : null,
    ].filter(Boolean).join('\n');

    // Parse the shipping address
    const addressParts = orderDetails.shippingAddress.split(',').map((part: string) => part.trim());
    let [streetLine, cityState, zipCountry] = addressParts;
    
    // Handle apartment/suite if present
    let line1 = streetLine;
    let line2 = '';
    if (streetLine.includes('Apt') || streetLine.includes('Suite')) {
      [line1, line2] = streetLine.split(/(?:Apt|Suite)\s*/).map((part: string) => part.trim());
    }

    // Parse city and state
    const [city, state] = cityState.split(' ');
    
    // Parse zip and country
    const [zip] = zipCountry.split(' ');

    // Calculate shipping estimate based on design completion time
    // Design completion time is in weeks, convert to business days (5 days per week)
    console.log('Design object:', orderDetails.design);
    console.log('Design completion time (weeks):', orderDetails.design.completion_time);
    
    // Make sure to access completion_time from the design object
    const completionTimeWeeks = parseInt(orderDetails.design.completion_time || 0);
    console.log('Parsed completion time (weeks):', completionTimeWeeks);
    
    const completionTimeDays = completionTimeWeeks * 5; // 5 business days per week
    
    // Add completion time to standard shipping time (14-21 business days)
    const minShippingDays = 14 + completionTimeDays;
    const maxShippingDays = 21 + completionTimeDays;
    
    console.log('Completion time (weeks):', completionTimeWeeks);
    console.log('Completion time (business days):', completionTimeDays);
    console.log('Min shipping days:', minShippingDays, '(14 + ' + completionTimeDays + ')');
    console.log('Max shipping days:', maxShippingDays, '(21 + ' + completionTimeDays + ')');

    // Calculate exact dates for shipping display - USING SAME LOGIC AS OrderConfirmationModal
    const today = new Date();
    const minWeeks = completionTimeWeeks + 2; // completion time + 2 weeks min shipping
    const maxWeeks = completionTimeWeeks + 3; // completion time + 3 weeks max shipping
    
    console.log('Min weeks for date calculation:', minWeeks, '(', completionTimeWeeks, '+ 2)');
    console.log('Max weeks for date calculation:', maxWeeks, '(', completionTimeWeeks, '+ 3)');

    // Important: Create a new Date object for earliestDate to avoid modifying the same object
    const earliestDate = new Date(today);
    earliestDate.setDate(today.getDate() + (minWeeks * 7));
    
    // Important: Create a new Date object for latestDate with the correct calculation
    const latestDate = new Date(today);
    latestDate.setDate(today.getDate() + (maxWeeks * 7));
    
    const formattedEarliestDate = earliestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const formattedLatestDate = latestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Create shipping display name with specific dates
    const shippingDisplayName = `Arriving ${formattedEarliestDate} - ${formattedLatestDate}`;

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: orderDetails.design.title,
              description: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/canceled`,
      metadata: {
        shippingAddress: JSON.stringify({
          street_address: orderDetails.shippingAddress?.split(',')[0]?.trim() || '',
          city: orderDetails.shippingAddress?.split(',')[1]?.trim() || '',
          state: orderDetails.shippingAddress?.split(',')[2]?.split(' ')?.[1] || '',
          zip_code: orderDetails.shippingAddress?.split(',')[2]?.split(' ')?.[2] || '',
          country: orderDetails.shippingAddress?.split(',')[3]?.trim() || 'United States'
        }),
        measurementId: orderDetails.measurement?.id || '',
        tailorNotes: orderDetails.tailorNotes || '',
        selectedFabric: orderDetails.design.fabrics[orderDetails.selectedFabric]?.name || '',
        selectedColor: orderDetails.selectedColor !== null ? 
          orderDetails.design.fabrics[orderDetails.selectedFabric]?.colors[orderDetails.selectedColor]?.name || '' : '',
        designId: orderDetails.design.id || '',
        tailorId: orderDetails.design.tailor_id || '',
        userEmail: orderDetails.email || '',
        styleType: orderDetails.style_type || 'kaftan',
        fabricYards: (orderDetails.fabric_yards || 4.5).toString()
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'usd',
            },
            display_name: shippingDisplayName,
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: minShippingDays,
              },
              maximum: {
                unit: 'business_day',
                value: maxShippingDays,
              },
            },
          },
        },
      ],
      customer_email: orderDetails.email,
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    
    // Return a more specific error message if available
    const errorMessage = err.message || 'Error creating checkout session';
    return NextResponse.json(
      { error: { message: errorMessage } },
      { status: 500 }
    );
  }
} 