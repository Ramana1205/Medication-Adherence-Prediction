// Import React and useState hook to manage component state (inputs, errors, loading)
import React, { useState } from 'react';
// Import routing hook to redirect users to the dashboard
import { useNavigate } from 'react-router-dom';
// Import UI icons from lucide-react
import { HeartPulse, ArrowLeft, AlertCircle } from 'lucide-react';
// Import custom, reusable Button component
import { Button } from '../components/ui/Button';
// Import the mock database instance to handle authentication logic
import { db } from '../store/db';
import { api, clearDoctorToken, setPatientToken } from '../lib/api';

// Functional component for the Existing Patient Login screen
export const PatientLogin: React.FC = () => {
  // Initialize the navigate hook
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  // State: Stores the password input
  const [password, setPassword] = useState('');
  // State: Stores validation/auth error messages to display
  const [error, setError] = useState('');
  // State: Tracks if the login request is currently processing
  const [loading, setLoading] = useState(false);

  // Function called when the user submits the login form
  const handleLogin = async (e: React.FormEvent) => {
    // Prevent the default HTML form submission behavior (which refreshes the page)
    e.preventDefault();
    // Clear any previous error messages
    setError('');
    
    // Validation check: Ensure they entered an ID
    if (!patientId) {
      setError('Please enter your Patient ID.');
      return; // Stop execution
    }

    setLoading(true);
    try {
      const localPatient = db.authenticatePatient(patientId.trim(), password);
      if (!localPatient) throw new Error('Invalid patient credentials');
      await api.post('/patients', localPatient);
      const res = await api.post<{ access_token: string; patient: { id: string; name: string; role: string } }>(
        '/auth/patient/login', { patient_id: patientId.trim(), password },
      );
      setPatientToken(res.access_token);
      clearDoctorToken();
      localStorage.setItem('active_patient_id', res.patient.id);
      navigate('/patient/dashboard');
    } catch {
      setError('Patient not found or incorrect credential. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Main container: full screen height, light gray background, centered contents
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border)] p-8">
        
        {/* Back Button: Navigates back to the Auth Landing page (Existing vs New selection) */}
        <button 
          onClick={() => navigate('/patient/auth')} 
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HeartPulse size={40} className="text-[var(--primary)]" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Welcome Back</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Sign in to your patient portal</p>
        </div>

        {/* Conditional rendering: If the 'error' state has a string, show this red alert banner */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 mb-6 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{error}</p>
              <div className="mt-2 flex gap-3">
                {/* Clear the error to let them try again */}
                <button onClick={() => setError('')} className="underline hover:text-red-900">Try Again</button>
                {/* Offer quick routing to the registration page if they can't log in */}
                <button onClick={() => navigate('/patient/register')} className="underline hover:text-red-900">Register as New Patient</button>
              </div>
            </div>
          </div>
        )}

        {/* The actual HTML form. onSubmit triggers handleLogin */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Patient ID Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Patient ID</label>
            <input 
              type="text" 
              value={patientId}
              // Update state on every keystroke
              onChange={(e) => setPatientId(e.target.value)}
              // font-mono is used here to make IDs easier to read
              className="w-full p-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono"
              placeholder="e.g. P004001"
            />
          </div>
          
          {/* Password Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password / Login Credential</label>
            <input 
              type="password" 
              value={password}
              // Update state on every keystroke
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Optional password"
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit"
            disabled={loading} // Prevent multiple clicks while authenticating
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-3 mt-4"
          >
            {/* Change text dynamically based on loading state */}
            {loading ? 'Authenticating...' : 'Login'}
          </Button>
        </form>

      </div>
    </div>
  );
};
