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
  | 'order_pending'
  | 'tailor_approved'
  | 'design_approved'
  | 'design_rejected';

interface NotificationPayload {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  orderId?: string;
  referenceId?: string;
  additionalData?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();
    const { type, recipientEmail, recipientName, orderId, referenceId, additionalData } = payload;

    const requiresOrderId = type.startsWith('order_');
    if (!type || !recipientEmail || !recipientName || (requiresOrderId && !orderId) || (!requiresOrderId && !referenceId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate email subject and content based on notification type
    const { subject, content, plainText } = generateEmailContent(
      type,
      recipientName,
      orderId,
      referenceId,
      additionalData
    );

    console.log(`Attempting to send email to ${recipientEmail} with subject "${subject}"`);
    
    try {
      // Send email using Resend with verified domain
      const { data, error } = await resend.emails.send({
        from: 'Tailor Mint <notifications@mytailormint.com>',
        to: recipientEmail,
        subject,
        html: content,
        text: plainText, // Plain text version for better deliverability
        reply_to: 'support@mytailormint.com', // Add reply-to address
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
  orderId?: string,
  referenceId?: string,
  additionalData?: Record<string, any>
): { subject: string; content: string; plainText: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mytailormint.com';
  const orderUrl = orderId ? `${baseUrl}/customer/orders/${orderId}` : '';
  const tailorOrderUrl = `${baseUrl}/tailor/orders`;
  const tailorDesignsUrl = `${baseUrl}/tailor/designs`;
  
  let subject = '';
  let content = '';
  let plainText = '';
  
  const isTailor = additionalData?.recipientRole === 'TAILOR';
  
  const rolePrefix = additionalData?.recipientRole ? `[${additionalData.recipientRole}] ` : '';
  
  // Helper function to convert HTML email to plain text
  const htmlToPlainText = (html: string): string => {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  };

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
      
    case 'tailor_approved':
      subject = `Welcome to Tailor Mint - Your Account is Approved`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #d4edda; padding: 15px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #c3e6cb;">
            <h2 style="margin-top: 0; color: #155724;">Account Approved</h2>
            <p style="margin-bottom: 0;">Welcome to Tailor Mint!</p>
          </div>
          
          <p>Hello ${recipientName},</p>
          <p>Great news! Your tailor account has been approved. You're now ready to start showcasing your designs and receiving orders.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h3 style="margin-top: 0;">What you can do now:</h3>
            <ul style="margin-bottom: 0;">
              <li>Upload your custom designs</li>
              <li>Set your pricing</li>
              <li>Receive and manage customer orders</li>
              <li>Build your brand on our platform</li>
            </ul>
          </div>
          
          <p>Get started by visiting your <a href="${tailorDesignsUrl}" style="color: #0066cc; text-decoration: underline;">designs dashboard</a> to upload your first design.</p>
          
          <p>If you have any questions or need assistance, our support team is here to help.</p>
          <p>Regards,<br>The Tailor Mint Team</p>
        </div>
      `;
      break;

    case 'design_approved':
      subject = `Design Approved: ${additionalData?.designTitle || 'Your design'}`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #d4edda; padding: 15px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #c3e6cb;">
            <h2 style="margin-top: 0; color: #155724;">Design Approved</h2>
            <p style="margin-bottom: 0;">Your design is now live on the marketplace!</p>
          </div>
          
          <p>Hello ${recipientName},</p>
          <p>Great news! Your design has been reviewed and approved. It's now visible to customers on the Tailor Mint marketplace.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin-top: 0;"><strong>Design:</strong> ${additionalData?.designTitle || referenceId}</p>
            <p style="margin-bottom: 0;"><strong>Status:</strong> Approved</p>
          </div>
          
          <p>Customers can now browse and order your design. You'll receive notifications when orders come in.</p>
          <p>View all your designs in your <a href="${tailorDesignsUrl}" style="color: #0066cc; text-decoration: underline;">dashboard</a>.</p>
          
          <p>Thank you for being part of Tailor Mint!</p>
          <p>Regards,<br>The Tailor Mint Team</p>
        </div>
      `;
      break;

    case 'design_rejected':
      subject = `Design Update Required: ${additionalData?.designTitle || 'Your design'}`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; padding: 15px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #ffc107;">
            <h2 style="margin-top: 0; color: #856404;">Design Needs Updates</h2>
            <p style="margin-bottom: 0;">Your design requires some changes before approval.</p>
          </div>
          
          <p>Hello ${recipientName},</p>
          <p>Thank you for submitting your design. After review, we need you to make some updates before we can approve it.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin-top: 0;"><strong>Design:</strong> ${additionalData?.designTitle || referenceId}</p>
            ${additionalData?.reason ? `<p><strong>Feedback:</strong> ${additionalData.reason}</p>` : ''}
            <p style="margin-bottom: 0;"><strong>Status:</strong> Requires Changes</p>
          </div>
          
          <h3>What to do next:</h3>
          <ol>
            <li>Review the feedback provided above</li>
            <li>Edit your design in your dashboard</li>
            <li>Resubmit for approval</li>
          </ol>
          
          <p>Once you've made the necessary changes, your design will be reviewed again. Visit your <a href="${tailorDesignsUrl}" style="color: #0066cc; text-decoration: underline;">designs dashboard</a> to make edits.</p>
          
          <p>If you have questions about the feedback, please don't hesitate to reach out to our team.</p>
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

  // Generate plain text version from HTML if not already set
  if (!plainText) {
    plainText = htmlToPlainText(content);
  }
  
  return { subject, content, plainText };
} 