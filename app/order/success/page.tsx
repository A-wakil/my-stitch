import { redirect } from 'next/navigation';

export default function OrderSuccessPage({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  // Redirect to the orders page after successful payment
  redirect('/customer/orders');
} 