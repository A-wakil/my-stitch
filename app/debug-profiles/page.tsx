'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DebugProfilesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [selectedRole, setSelectedRole] = useState<'tailor' | 'customer' | 'both'>('tailor');

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          setCurrentUser(user);
          setEmail(user.email || '');
          
          // Check if profile exists
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .limit(1);
            
          if (existingProfile && existingProfile.length > 0) {
            setFirstname(existingProfile[0].firstname || '');
            setLastname(existingProfile[0].lastname || '');
          }
        }
        
        // List all profiles
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(10);
          
        if (profilesError) throw profilesError;
        setProfiles(allProfiles || []);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  const createOrUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      if (!currentUser) {
        setMessage({type: 'error', text: 'You must be logged in to create a profile'});
        return;
      }
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .limit(1);
        
      if (existingProfile && existingProfile.length > 0) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            firstname,
            lastname,
            email: email || currentUser.email,
            roles: selectedRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
          
        if (updateError) throw updateError;
        setMessage({type: 'success', text: 'Profile updated successfully'});
        
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: currentUser.id,
            firstname,
            lastname,
            email: email || currentUser.email,
            roles: selectedRole,
            created_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;
        setMessage({type: 'success', text: 'Profile created successfully'});
      }
      
      // Refresh profiles list
      const { data: refreshedProfiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);
        
      setProfiles(refreshedProfiles || []);
      
    } catch (error: any) {
      console.error('Error creating/updating profile:', error);
      setMessage({type: 'error', text: `Error: ${error.message || 'Unknown error'}`});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Profiles</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        {currentUser ? (
          <div className="bg-blue-50 p-4 rounded-md">
            <p><strong>User ID:</strong> {currentUser.id}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
          </div>
        ) : (
          <p className="text-red-600">Not logged in</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Create/Update Profile</h2>
          <form onSubmit={createOrUpdateProfile} className="space-y-4 bg-gray-50 p-4 rounded-md">
            <div>
              <label className="block text-sm font-medium mb-1">First Name:</label>
              <input
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Last Name:</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Role:</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'tailor'}
                    onChange={() => setSelectedRole('tailor')}
                    className="mr-2"
                  />
                  Tailor
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'customer'}
                    onChange={() => setSelectedRole('customer')}
                    className="mr-2"
                  />
                  Customer
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'both'}
                    onChange={() => setSelectedRole('both')}
                    className="mr-2"
                  />
                  Both
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !currentUser}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            
            {message && (
              <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}
          </form>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Existing Profiles ({profiles.length})</h2>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-80">
            {loading ? (
              <p>Loading profiles...</p>
            ) : profiles.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b">
                      <td className="py-2 text-xs truncate max-w-[100px]">{profile.id}</td>
                      <td className="py-2">{profile.firstname} {profile.lastname}</td>
                      <td className="py-2">{profile.email}</td>
                      <td className="py-2">{profile.roles || 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No profiles found</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 border-t pt-4 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Troubleshooting Tips:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure you're logged in</li>
          <li>Your profile must exist in the profiles table with the same ID as your auth user</li>
          <li>The email notification system requires valid profile data</li>
          <li>After creating your profile, try changing an order status again</li>
          <li className="text-red-600 font-semibold">Important: If you're acting as both tailor and customer (self-ordering), 
              you need to create TWO profiles with the same user ID - one with role 'tailor' and one with role 'customer'</li>
        </ul>
        
        {currentUser && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="font-medium mb-2">Solution for Self-Ordering:</h4>
            <p>1. Create your profile above with role "tailor"</p>
            <p>2. After that's created, use the same form to create another profile with role "customer"</p>
            <p>3. This will solve the issue where you're both the tailor and customer</p>
          </div>
        )}
      </div>
    </div>
  );
} 