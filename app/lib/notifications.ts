import { Order, Profile } from './types';

/**
 * Notification types for various order status changes
 */
export type NotificationType = 
  | 'order_placed' 
  | 'order_pending'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_in_progress'
  | 'order_ready_to_ship'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled';

/**
 * Send a notification for order status changes
 * @param type The type of notification to send
 * @param order The order object containing details
 * @param profile The recipient profile (customer or tailor)
 * @param additionalData Any additional data to include in the notification
 * @returns Promise resolving to the notification result
 */
export async function sendOrderNotification(
  type: NotificationType,
  order: Order,
  profile: Profile,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[NOTIFY] Preparing to send ${type} notification to ${profile.email} for order ${order.id}`);
    
    if (!profile.email) {
      console.error('[NOTIFY] Missing email address in profile');
      return { success: false, error: 'Missing email address in profile' };
    }
    
    const payload = {
      type,
      recipientEmail: profile.email,
      recipientName: `${profile.firstname} ${profile.lastname || ''}`.trim(),
      orderId: order.id,
      additionalData
    };
    
    console.log('[NOTIFY] Sending notification request to API:', JSON.stringify({
      ...payload,
      // Don't log the full additionalData for privacy/brevity
      additionalData: additionalData ? 'present' : 'none'
    }));

    // Get the base URL - important for server-side contexts
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const apiUrl = `${baseUrl}/api/notify`;
    console.log(`[NOTIFY] Using API URL: ${apiUrl}`);

    const startTime = Date.now();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const requestTime = Date.now() - startTime;
    console.log(`[NOTIFY] API response received in ${requestTime}ms, status: ${response.status}`);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[NOTIFY] Failed to send notification:', data.error || 'Unknown error', data);
      return { success: false, error: data.error || 'Unknown error' };
    }

    console.log('[NOTIFY] Notification sent successfully', data.success ? 'Success' : 'Failed');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NOTIFY] Error sending notification:', errorMessage);
    return { success: false, error: `Failed to send notification: ${errorMessage}` };
  }
}

/**
 * Helper function to send notifications to both customer and tailor
 * @param type The type of notification to send
 * @param order The order object
 * @param customerProfile The customer profile
 * @param tailorProfile The tailor profile
 * @param additionalData Any additional data for the notification
 * @returns Promise resolving to the notification results
 */
export async function notifyOrderParties(
  type: NotificationType,
  order: Order,
  customerProfile: Profile,
  tailorProfile: Profile,
  additionalData?: Record<string, any>
): Promise<{ customerNotification: { success: boolean; error?: string }; tailorNotification: { success: boolean; error?: string } }> {
  console.log('[NOTIFY] Sending notifications to both customer and tailor');
  
  // Check if the emails are the same (testing scenario)
  const isSameEmail = customerProfile.email === tailorProfile.email;
  
  // Send customer notification with role indicator if same email
  const customerNotification = await sendOrderNotification(
    type,
    order,
    customerProfile,
    {
      ...additionalData,
      recipientRole: isSameEmail ? 'CUSTOMER' : undefined
    }
  );

  // For testing scenarios, if it's the same email, add a delay and role indicator
  if (isSameEmail) {
    // Add a small delay to prevent email service throttling
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const tailorNotification = await sendOrderNotification(
    type,
    order,
    tailorProfile,
    {
      ...additionalData,
      recipientRole: isSameEmail ? 'TAILOR' : undefined
    }
  );

  console.log('[NOTIFY] Notification results:', 
    customerNotification.success ? 'Customer: Success' : `Customer: Failed (${customerNotification.error})`,
    tailorNotification.success ? 'Tailor: Success' : `Tailor: Failed (${tailorNotification.error})`
  );

  return {
    customerNotification,
    tailorNotification
  };
} 