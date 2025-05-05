import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = 're_JQB2Wgji_DcqdyqTKrLVVWTzfcxz8TxdK';
const resend = new Resend(RESEND_API_KEY);

type NotificationType = 
  | 'order_placed' 
  | 'order_accepted'
  | 'order_rejected'
  | 'order_in_progress'
  | 'order_ready_to_ship'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled';

interface NotificationPayload {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  orderId: string;
  additionalData?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();
    const { type, recipientEmail, recipientName, orderId, additionalData } = payload;

    if (!type || !recipientEmail || !recipientName || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate email subject and content based on notification type
    const { subject, content } = generateEmailContent(type, recipientName, orderId, additionalData);

    console.log(`Attempting to send email to ${recipientEmail} with subject "${subject}"`);
    
    try {
      // Send email using Resend with verified domain
      const { data, error } = await resend.emails.send({
        from: 'My Tailor Mint <notifications@mytailormint.com>', // Updated brand name
        to: recipientEmail,
        subject,
        html: content,
      });

      if (error) {
        console.error('Resend API detailed error:', JSON.stringify(error, null, 2));
        return NextResponse.json(
          { error: `Failed to send notification: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('Email sent successfully:', data);
      return NextResponse.json({ success: true, data });
    } catch (sendError) {
      console.error('Resend API exception:', sendError);
      return NextResponse.json(
        { error: `Resend API exception: ${sendError instanceof Error ? sendError.message : String(sendError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json(
      { error: `Failed to process notification: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

function generateEmailContent(
  type: NotificationType,
  recipientName: string,
  orderId: string,
  additionalData?: Record<string, any>
): { subject: string; content: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mytailormint.com';
  const orderUrl = `${baseUrl}/customer/orders/${orderId}`;
  
  let subject = '';
  let content = '';

  switch (type) {
    case 'order_placed':
      subject = `Order #${orderId} Placed Successfully`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmation</h2>
          <p>Hello ${recipientName},</p>
          <p>Thank you for placing your order with My Tailor Mint. Your order has been received and is being processed.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.totalAmount ? `<p><strong>Total Amount:</strong> $${additionalData.totalAmount}</p>` : ''}
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_accepted':
      subject = `Order #${orderId} Has Been Accepted`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Accepted</h2>
          <p>Hello ${recipientName},</p>
          <p>Great news! Your order has been accepted by our tailor and will now move to production.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.estimatedCompletionDate ? 
            `<p><strong>Estimated Completion Date:</strong> ${new Date(additionalData.estimatedCompletionDate).toLocaleDateString()}</p>` : 
            ''}
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_rejected':
      subject = `Order #${orderId} Update: Action Required`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Requires Attention</h2>
          <p>Hello ${recipientName},</p>
          <p>We regret to inform you that your order needs attention. The tailor has provided the following feedback:</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.reason ? `<p><strong>Reason:</strong> ${additionalData.reason}</p>` : ''}
          <p>Please visit <a href="${orderUrl}">your order page</a> to review and make necessary adjustments.</p>
          <p>Our customer service team is available to assist you if needed.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_in_progress':
      subject = `Production Started for Order #${orderId}`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Production In Progress</h2>
          <p>Hello ${recipientName},</p>
          <p>We're excited to inform you that production has begun on your order!</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.estimatedCompletionDate ? 
            `<p><strong>Estimated Completion Date:</strong> ${new Date(additionalData.estimatedCompletionDate).toLocaleDateString()}</p>` : 
            ''}
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_ready_to_ship':
      subject = `Order #${orderId} Ready for Shipping`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Ready for Shipping</h2>
          <p>Hello ${recipientName},</p>
          <p>Great news! Your custom garment is ready and will be shipped soon.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p>You'll receive another notification once your order has been shipped with tracking information.</p>
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_shipped':
      subject = `Order #${orderId} Has Been Shipped`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Shipped</h2>
          <p>Hello ${recipientName},</p>
          <p>Your order is on its way to you!</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.trackingNumber ? 
            `<p><strong>Tracking Number:</strong> ${additionalData.trackingNumber}</p>` : 
            ''}
          ${additionalData?.shippingCompany ? 
            `<p><strong>Shipping Company:</strong> ${additionalData.shippingCompany}</p>` : 
            ''}
          ${additionalData?.estimatedDeliveryDate ? 
            `<p><strong>Estimated Delivery Date:</strong> ${new Date(additionalData.estimatedDeliveryDate).toLocaleDateString()}</p>` : 
            ''}
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_delivered':
      subject = `Order #${orderId} Delivered - We'd Love Your Feedback!`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Delivered</h2>
          <p>Hello ${recipientName},</p>
          <p>Your order has been marked as delivered. We hope you love your custom garment!</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p>We'd love to hear your feedback. Please take a moment to review your experience on <a href="${orderUrl}">your order page</a>.</p>
          <p>Thank you for choosing My Tailor Mint for your custom clothing needs.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_cancelled':
      subject = `Order #${orderId} Has Been Cancelled`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Cancellation Confirmation</h2>
          <p>Hello ${recipientName},</p>
          <p>Your order has been cancelled as requested.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.refundAmount ? 
            `<p>A refund of $${additionalData.refundAmount} has been processed and should appear in your account within 5-7 business days.</p>` : 
            ''}
          <p>If you have any questions about this cancellation, please contact our customer service team.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    case 'order_pending':
      subject = `Order #${orderId} Status: Pending`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Status Updated</h2>
          <p>Hello ${recipientName},</p>
          <p>Your order is currently pending review from our tailor team.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${additionalData?.totalAmount ? `<p><strong>Total Amount:</strong> $${additionalData.totalAmount}</p>` : ''}
          <p>You can track your order status at any time by visiting <a href="${orderUrl}">your order page</a>.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
      break;
      
    default:
      subject = `Update on Your My Tailor Mint Order #${orderId}`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Update</h2>
          <p>Hello ${recipientName},</p>
          <p>There's an update regarding your order with My Tailor Mint.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p>Please visit <a href="${orderUrl}">your order page</a> for more details.</p>
          <p>Regards,<br>The My Tailor Mint Team</p>
        </div>
      `;
  }

  return { subject, content };
} 