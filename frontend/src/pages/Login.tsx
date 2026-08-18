// Import React library for building UI components
import React from 'react';
// Import the useNavigate hook from React Router to programmatically change URLs
import { useNavigate } from 'react-router-dom';
// Import specific scalable vector icons from lucide-react to make the UI look professional
import { HeartPulse, Stethoscope, UserCircle2 } from 'lucide-react';
// Import our custom, reusable Button component
import { Button } from '../components/ui/Button';

// Define the Login functional component using TypeScript React.FC
export const Login: React.FC = () => {
  // Initialize the navigate function to handle click-routing
  const navigate = useNavigate();

  return (
    // Outer container: takes up the full screen height (min-h-screen), centers content, light gray background
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 font-sans">
      
      {/* Main card wrapper: max width of 4xl, white background, rounded corners, flexbox layout (column on mobile, row on desktop md+) */}
      <div className="w-full max-w-4xl bg-[var(--surface)] rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-[var(--border)]">
        
        {/* ========================================= */}
        {/* LEFT SIDE: BRANDING PANEL */}
        {/* ========================================= */}
        <div className="md:w-1/2 bg-[var(--primary)] p-12 flex flex-col items-center justify-center text-white text-center">
          
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm mb-6 shadow-inner">
            <HeartPulse size={64} className="text-white" strokeWidth={2} />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">Medivia</h1>
          
          <p className="text-white/90 text-lg md:text-xl font-medium mb-8 opacity-90">
            Medication Adherence Prediction
          </p>
          
          <div className="space-y-3 mt-8">
            <p className="text-xs text-white/80 uppercase tracking-wider font-semibold">Select your role to continue</p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse delay-150"></div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT SIDE: LOGIN ACTIONS PANEL */}
        {/* ========================================= */}
        {/* Takes up the remaining 50% width, vertical flex layout */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center">
          
          {/* Section header text */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome Back</h2>
            <p className="text-[var(--text-secondary)] text-sm">Sign in to access your portal.</p>
          </div>

          <div className="space-y-6">
            
            <div className="bg-[var(--background)] rounded-xl p-6 border border-[var(--border)] hover:border-[var(--primary)] transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0 group-hover:scale-110 transition-transform">
                  <Stethoscope size={24} />
                </div>
                
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">Healthcare Provider</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Analytics, risk prediction, and patient management.</p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/doctor/login')}
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-6"
              >
                Doctor Login
              </Button>
            </div>

            {/* --- DIVIDER LINE WITH "Or" TEXT --- */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[var(--border)]"></div>
              <span className="flex-shrink-0 mx-4 text-[var(--text-secondary)] text-xs font-medium uppercase">Or</span>
              <div className="flex-grow border-t border-[var(--border)]"></div>
            </div>

            <div className="bg-[var(--background)] rounded-xl p-6 border border-[var(--border)] hover:border-[var(--low-risk)] transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--low-risk)]/10 flex items-center justify-center text-[var(--low-risk)] shrink-0 group-hover:scale-110 transition-transform">
                  <UserCircle2 size={24} />
                </div>
                
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">Patient Access</h3>
                  <p className="text-xs text-[var(--text-secondary)]">View your daily medications and track adherence.</p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/patient/auth')}
                className="w-full bg-[var(--low-risk)] hover:bg-[#15803d] text-white py-6"
              >
                Patient Portal Access
              </Button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
