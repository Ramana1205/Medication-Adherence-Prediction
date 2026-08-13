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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* White card container for the content */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
        
        {/* Back Button: Navigates back to the root '/' (Main Login select) */}
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to main portal
        </button>

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <HeartPulse size={48} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">Patient Portal</h1>
          <p className="text-slate-500 text-lg">How would you like to continue?</p>
        </div>

        {/* Grid layout for the two main options: 1 column on mobile, 2 on medium+ screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* --- OPTION 1: EXISTING PATIENT --- */}
          {/* Hovering changes border to blue and adds shadow */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col h-full hover:border-blue-400 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              {/* Icon wrapper: scales up on parent group hover */}
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <UserCircle2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Existing Patient</h2>
            </div>
            
            {/* flex-grow ensures the button below gets pushed to the bottom evenly */}
            <p className="text-slate-600 text-sm mb-6 flex-grow">
              Already registered? <br/><br/>
              Sign in to view your medication information and track your daily adherence.
            </p>
            
            {/* Navigates to the PatientLogin screen */}
            <Button 
              onClick={() => navigate('/patient/login')}
              className="w-full bg-[#1e3a8a] hover:bg-[#172e6e] text-white"
            >
              Continue as Existing
            </Button>
          </div>

          {/* --- OPTION 2: NEW PATIENT --- */}
          {/* Hovering changes border to green and adds shadow */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col h-full hover:border-green-400 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              {/* Icon wrapper: scales up on parent group hover */}
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">New Patient</h2>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 flex-grow">
              First time here? <br/><br/>
              Create your patient profile to get started with MedAdhere AI support.
            </p>
            
            {/* Navigates to the 3-step Registration Wizard */}
            <Button 
              onClick={() => navigate('/patient/register')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Register as New Patient
            </Button>
          </div>

        </div>

        {/* Small disclaimer text for the hackathon */}
        <div className="text-center text-xs text-slate-400 bg-slate-50 p-4 rounded-lg">
          <p><strong>Note:</strong> Your information is used only for this medication-adherence support prototype.</p>
          <p className="mt-1">Please use synthetic/demo data for the hackathon evaluation.</p>
        </div>

      </div>
    </div>
  );
};
