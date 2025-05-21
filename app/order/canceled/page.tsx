import { redirect } from 'next/navigation';

export default function OrderCanceledPage({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  // Redirect to the dashboard after canceled payment
  redirect('/');
} 