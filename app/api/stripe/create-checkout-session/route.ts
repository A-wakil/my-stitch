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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order/canceled`,
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
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 14,
              },
              maximum: {
                unit: 'business_day',
                value: 21,
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