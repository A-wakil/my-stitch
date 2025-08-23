import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Add a fallback empty string to prevent "undefined" error
const RESEND_API_KEY = process.env.NEXT_PUBLIC_RESEND_API_KEY || '';
const resend = new Resend(RESEND_API_KEY);

type NotificationType = 
  | 'order_placed' 
  | 'order_accepted'
  | 'order_rejected'
  | 'order_in_progress'
  | 'order_ready_to_ship'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_pending';

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
        from: 'Tailor Mint <notifications@mytailormint.com>', // Updated brand name
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
  const tailorOrderUrl = `${baseUrl}/tailor/orders`;
  
  let subject = '';
  let content = '';
  
  const isTailor = additionalData?.recipientRole === 'TAILOR';
  
  const rolePrefix = additionalData?.recipientRole ? `[${additionalData.recipientRole}] ` : '';

  switch (type) {
    case 'order_placed':
      if (isTailor) {
        subject = `${rolePrefix}New Order Received: #${orderId}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8d7da; padding: 15px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #f5c6cb;">
              <h2 style="margin-top: 0; color: #721c24;">New Order Alert</h2>
              <p style="margin-bottom: 0;">You have received a new order that requires your attention.</p>
            </div>
            
            <h3>Order Details</h3>
            <p>Hello ${recipientName},</p>
            <p>A customer has placed a new order with your design. Please review the details and respond promptly.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p style="margin-top: 0;"><strong>Order ID:</strong> ${orderId}</p>
              ${additionalData?.totalAmount ? `<p><strong>Total Amount:</strong> $${additionalData.totalAmount}</p>` : ''}
              <p style="margin-bottom: 0;"><strong>Status:</strong> Pending Your Review</p>
            </div>
            
            <p>Please log in to your <a href="${tailorOrderUrl}" style="color: #0066cc; text-decoration: underline;">dashboard</a> to view the complete order details and take action.</p>
            
            <div style="background-color: #e8f4f8; padding: 12px; border-left: 4px solid #4da6ff; margin: 15px 0;">
              <p style="margin: 0;"><strong>Note:</strong> Quick responses to new orders improve customer satisfaction and increase repeat business.</p>
            </div>
            
            <p>Thank you for your partnership with Tailor Mint.</p>
            <p>Regards,<br>The Tailor Mint Team</p>
          </div>
        `;
      } else {
        subject = `${rolePrefix}Order #${orderId} Placed Successfully`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #d4edda; padding: 15px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #c3e6cb;">
              <h2 style="margin-top: 0; color: #155724;">Order Confirmed</h2>
              <p style="margin-bottom: 0;">Thank you for your order!</p>
            </div>
            
            <p>Hello ${recipientName},</p>
            <p>We're excited to confirm your order has been received and is being processed.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p style="margin-top: 0;"><strong>Order ID:</strong> ${orderId}</p>
              ${additionalData?.totalAmount ? `<p><strong>Total Amount:</strong> $${additionalData.totalAmount}</p>` : ''}
              <p style="margin-bottom: 0;"><strong>Status:</strong> Processing</p>
            </div>
            
            <h3>What happens next?</h3>
            <ol>
              <li>Your order will be reviewed by the designer</li>
              <li>Once accepted, your garment will enter production</li>
              <li>You'll receive updates as your order progresses</li>
            </ol>
            
            <p>You can track your order status at any time by visiting <a href="${orderUrl}" style="color: #0066cc; text-decoration: underline;">your order page</a>.</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Regards,<br>The Tailor Mint Team</p>
          </div>
        `;
      }
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Thank you for choosing Tailor Mint for your custom clothing needs.</p>
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
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
          <p>Regards,<br>The Tailor Mint Team</p>
        </div>
      `;
      break;
      
    default:
      if (isTailor) {
        subject = `${rolePrefix}Action Required: Order #${orderId} Update`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Update</h2>
            <p>Hello ${recipientName},</p>
            <p>There's an update regarding order #${orderId} that requires your attention.</p>
            <p>Please visit <a href="${tailorOrderUrl}">your dashboard</a> for more details.</p>
            <p>Regards,<br>The Tailor Mint Team</p>
          </div>
        `;
      } else {
        subject = `${rolePrefix}Update on Your Tailor Mint Order #${orderId}`;
        content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Update</h2>
            <p>Hello ${recipientName},</p>
            <p>There's an update regarding your order with Tailor Mint.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p>Please visit <a href="${orderUrl}">your order page</a> for more details.</p>
            <p>Regards,<br>The Tailor Mint Team</p>
          </div>
        `;
      }
  }

  return { subject, content };
} 