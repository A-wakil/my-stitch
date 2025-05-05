import { NextRequest, NextResponse } from 'next/server';

// This is a test endpoint to verify the Resend email service is working
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Testing email notification to: ${email}`);
    
    // Call the notification API to send a test email
    const response = await fetch(`${request.nextUrl.origin}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'order_placed',
        recipientEmail: email,
        recipientName: 'Test User',
        orderId: 'TEST-123',
        additionalData: {
          totalAmount: 199.99
        }
      }),
    });

    const data = await response.json();
    console.log('Notification API response:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to send test email', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email} using My Tailor Mint notifications`,
      details: data
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 