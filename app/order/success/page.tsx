'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true; // For cleanup

    async function verifySession() {
      if (!sessionId) {
        console.error('No session ID found');
        router.push('/customer/orders');
        return;
      }

      try {
        console.log('Verifying Stripe session:', sessionId);
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await response.json();

        // Only update state if component is still mounted
        if (!isSubscribed) return;

        if (!response.ok) {
          console.error('Session verification failed:', data);
          setError(data.error || 'Failed to verify payment');
        } else {
          console.log('Session verified successfully:', data);
        }
      } catch (err) {
        // Only update state if component is still mounted
        if (!isSubscribed) return;
        console.error('Error verifying session:', err);
        setError('Failed to verify payment');
      } finally {
        // Only update state if component is still mounted
        if (!isSubscribed) return;
        setIsVerifying(false);
        // Redirect to orders page after a short delay
        setTimeout(() => {
          if (isSubscribed) {
            router.push('/customer/orders');
          }
        }, 2000);
      }
    }

    verifySession();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isSubscribed = false;
    };
  }, [sessionId]); // Remove router from dependencies

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {isVerifying ? (
        <>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <h2 style={{ marginTop: '20px', color: '#333' }}>Processing your order...</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>Please wait while we confirm your payment.</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      ) : error ? (
        <>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c' }}>Verification Error</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>{error}</p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
            Redirecting to your orders page...
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ color: '#27ae60' }}>Payment Successful!</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>
            Your order has been confirmed.
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
            Redirecting to your orders page...
          </p>
        </>
      )}
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
} 