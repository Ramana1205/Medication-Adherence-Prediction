// Import React library
import React from 'react';
// Import routing hook to handle programmatic navigation
import { useNavigate } from 'react-router-dom';
// Import UI icons from lucide-react
import { HeartPulse, UserCircle2, UserPlus, ArrowLeft } from 'lucide-react';
// Import custom UI Button component
import { Button } from '../components/ui/Button';

// Functional component for the Patient Authentication Landing Page (Splits Existing vs New)
export const PatientAuthLanding: React.FC = () => {
  // Initialize navigation hook
  const navigate = useNavigate();

  return (
    // Main container: full screen height, light gray background, centered contents
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 font-sans">
      
      <div className="w-full max-w-3xl bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border)] p-8 md:p-12">
        
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to main portal
        </button>

        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <HeartPulse size={48} className="text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">Patient Portal</h1>
          <p className="text-[var(--text-secondary)] text-lg">How would you like to continue?</p>
        </div>

        {/* Grid layout for the two main options: 1 column on mobile, 2 on medium+ screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* --- OPTION 1: EXISTING PATIENT --- */}
          {/* Hovering changes border to blue and adds shadow */}
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 flex flex-col h-full hover:border-[var(--primary)] hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <UserCircle2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Existing Patient</h2>
            </div>
            
            <p className="text-[var(--text-secondary)] text-sm mb-6 flex-grow">
              Already registered? <br/><br/>
              Sign in to view your medication information and track your daily adherence.
            </p>
            
            <Button 
              onClick={() => navigate('/patient/login')}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
            >
              Continue as Existing
            </Button>
          </div>

          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 flex flex-col h-full hover:border-[var(--low-risk)] hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[var(--low-risk)]/10 text-[var(--low-risk)] rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">New Patient</h2>
            </div>
            
            <p className="text-[var(--text-secondary)] text-sm mb-6 flex-grow">
              First time here? <br/><br/>
              Create your patient profile to get started with Medivia support.
            </p>
            
            <Button 
              onClick={() => navigate('/patient/register')}
              className="w-full bg-[var(--low-risk)] hover:bg-[#15803d] text-white"
            >
              Register as New Patient
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
};
