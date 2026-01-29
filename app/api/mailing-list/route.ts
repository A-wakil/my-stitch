// app/api/mailing-list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstname, lastname } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Upsert into mailing_list table (insert or update based on email)
    // This will update firstname and lastname if the email already exists
    const { data, error } = await supabase
      .from('mailing_list')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          firstname: firstname || null,
          lastname: lastname || null,
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false, // This ensures we update existing records
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error inserting into mailing list:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe to mailing list' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully subscribed to mailing list',
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in mailing list API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
