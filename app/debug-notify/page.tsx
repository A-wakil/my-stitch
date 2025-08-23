'use client';

import { useState } from 'react';
import { Resend } from 'resend';

export default function DebugNotifyPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testType, setTestType] = useState<'api' | 'direct'>('api');

  const handleDirectTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Create a new instance of Resend with the API key
      const resend = new Resend('re_JQB2Wgji_DcqdyqTKrLVVWTzfcxz8TxdK');
      
      // Send a test email directly using Resend SDK
      const { data, error } = await resend.emails.send({
        from: 'Tailor Mint <notifications@mytailormint.com>',
        to: email,
        subject: 'Direct Test Email',
        html: '<p>This is a direct test from the Resend SDK</p>',
      });

      if (error) {
        console.error('Direct test error:', error);
        setError(error.message);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Exception in direct test:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApiTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Send a test email through the API endpoint
      const response = await fetch(`/api/test-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Unknown API error');
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Exception in API test:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (testType === 'direct') {
      await handleDirectTest();
    } else {
      await handleApiTest();
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Notification System</h1>
      
      <div className="mb-6">
        <p className="mb-2">Test Type:</p>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="testType"
              checked={testType === 'api'}
              onChange={() => setTestType('api')}
              className="mr-2"
            />
            API Test (via notify endpoint)
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              name="testType"
              checked={testType === 'direct'}
              onChange={() => setTestType('direct')}
              className="mr-2"
            />
            Direct Test (Resend SDK)
          </label>
        </div>
      </div>
      
      <form onSubmit={handleFetch} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address:
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter recipient email"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Sending...' : `Send ${testType === 'direct' ? 'Direct' : 'API'} Test Email`}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 border border-red-300 bg-red-50 rounded-md">
          <h2 className="font-bold text-red-700 mb-2">Error:</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 border border-green-300 bg-green-50 rounded-md">
          <h2 className="font-bold text-green-700 mb-2">Success:</h2>
          <pre className="bg-white p-3 rounded overflow-auto text-sm border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 border-t pt-4 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Troubleshooting Tips:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verify the Resend API key is correct</li>
          <li>Check that your domain (mytailormint.com) is properly verified in Resend</li>
          <li>Confirm the recipient email is valid</li>
          <li>Look at the browser console and server logs for more details</li>
        </ul>
      </div>
    </div>
  );
} 