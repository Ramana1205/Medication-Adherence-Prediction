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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      
      {/* Main card wrapper: max width of 4xl, white background, rounded corners, flexbox layout (column on mobile, row on desktop md+) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        
        {/* ========================================= */}
        {/* LEFT SIDE: BRANDING PANEL (Dark Blue) */}
        {/* ========================================= */}
        {/* Takes up 50% width on medium+ screens, flex column, dark blue background #1e3a8a */}
        <div className="md:w-1/2 bg-[#1e3a8a] p-12 flex flex-col items-center justify-center text-white text-center">
          
          {/* Logo container: slight white opacity with backdrop blur for a glassmorphism effect */}
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm mb-6 shadow-inner">
            <HeartPulse size={64} className="text-white" strokeWidth={2} />
          </div>
          
          {/* Main application title */}
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">MEDIVIA</h1>
          
          {/* Subtitle describing the ML function of the project */}
          <p className="text-blue-100 text-lg md:text-xl font-medium mb-8 opacity-90">
            Medication Adherence Prediction
          </p>
          
          {/* Small loading/pulsing dots for aesthetic UI detail */}
          <div className="space-y-3 mt-8">
            <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Select your role to continue</p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-150"></div>
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
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Sign in to access your portal.</p>
          </div>

          <div className="space-y-6">
            
            {/* --- DOCTOR LOGIN BLOCK --- */}
            {/* Box styling: light gray bg, subtle border, hover effect changes border to blue */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                
                {/* Icon wrapper: Blue circle, scales up slightly when parent group is hovered (group-hover:scale-110) */}
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 group-hover:scale-110 transition-transform">
                  <Stethoscope size={24} />
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Healthcare Provider</h3>
                  <p className="text-xs text-slate-500">Analytics, risk prediction, and patient management.</p>
                </div>
              </div>
              
              {/* Button: Routes directly to Doctor Dashboard, simulating an instant login for hackathon evaluation */}
              <Button 
                              onClick={() => navigate('/doctor/login')}
                className="w-full bg-[#1e3a8a] hover:bg-[#172e6e] text-white py-6"
              >
                              Doctor Login
              </Button>
            </div>

            {/* --- DIVIDER LINE WITH "Or" TEXT --- */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">Or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* --- PATIENT LOGIN BLOCK --- */}
            {/* Box styling: light gray bg, hover effect changes border to green to signify a different portal */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:border-green-300 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                
                {/* Icon wrapper: Green circle */}
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 shrink-0 group-hover:scale-110 transition-transform">
                  <UserCircle2 size={24} />
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Patient Access</h3>
                  <p className="text-xs text-slate-500">View your daily medications and track adherence.</p>
                </div>
              </div>
              
              {/* Button: Routes to the new PatientAuthLanding page allowing them to select Existing vs New patient */}
              <Button 
                onClick={() => navigate('/patient/auth')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
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
