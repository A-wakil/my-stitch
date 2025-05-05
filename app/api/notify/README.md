# Notification System

This module provides a notification system for sending emails to customers and tailors using the Resend Email API.

## Configuration

The system uses the Resend Email API with the following configuration:

- API Key: `re_JQB2Wgji_DcqdyqTKrLVVWTzfcxz8TxdK`
- From Email: `notifications@mytailormint.com`
- From Name: `My Tailor Mint`

## Notification Types

The system supports the following notification types:

- `order_placed`: Sent when a new order is placed
- `order_accepted`: Sent when a tailor accepts an order
- `order_rejected`: Sent when a tailor rejects an order
- `order_in_progress`: Sent when an order moves to the production phase
- `order_ready_to_ship`: Sent when an order is ready to be shipped
- `order_shipped`: Sent when an order has been shipped
- `order_delivered`: Sent when an order has been delivered
- `order_cancelled`: Sent when an order is cancelled

## How to Use

### 1. Import the notification utilities

```typescript
import { sendOrderNotification, notifyOrderParties } from '../../lib/notifications';
```

### 2. Send a notification to a single recipient

```typescript
await sendOrderNotification(
  'order_placed',        // notification type
  orderData,             // order object
  recipientProfile,      // customer or tailor profile
  { totalAmount: 199.99 } // additional data (optional)
);
```

### 3. Send notifications to both customer and tailor

```typescript
await notifyOrderParties(
  'order_accepted',
  orderData,
  customerProfile,
  tailorProfile,
  { estimatedCompletionDate: '2023-12-31' }
);
```

## Testing

You can test the notification system by accessing:

```
/api/test-email?email=customer@example.com
```

This will send a test "order placed" notification to the specified email address.

## Email Templates

The notification system includes pre-designed templates for each notification type. The templates include:

- Responsive design optimized for mobile and desktop
- Dynamic content based on order details
- Links to the order page for tracking
- Appropriate messaging for each notification type

## Implementation Notes

- Error handling is implemented to gracefully handle API failures
- Email deliverability is managed by Resend's email service
- All emails maintain consistent branding and appearance
- Sending domain (mytailormint.com) is verified with Resend 