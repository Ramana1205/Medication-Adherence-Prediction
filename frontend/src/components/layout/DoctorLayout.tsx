import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, LayoutDashboard, Users, Pill, 
  AlertTriangle, Activity, Settings, Code,
  Bell, HelpCircle, LogOut
} from 'lucide-react';
import { Button } from '../ui/Button';

export const DoctorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1e293b] text-slate-300 flex flex-col hidden md:flex shrink-0 shadow-lg z-20">
        
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50 cursor-pointer bg-[#0f172a]" onClick={() => navigate('/doctor/dashboard')}>
          <div className="text-blue-400 mr-3">
            <HeartPulse size={28} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">MedAdhere AI</span>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
          <button 
            onClick={() => navigate('/doctor/dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/dashboard') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <button 
            onClick={() => navigate('/doctor/patients')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/patients') || isActive('/patient/') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={18} /> My Patients
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white">
            <Pill size={18} /> Medications
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white">
            <AlertTriangle size={18} /> Risk & Alerts
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white">
            <Activity size={18} /> Interventions
          </button>

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">System</p>
          </div>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white">
            <Settings size={18} /> Profile & Settings
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-amber-500 hover:bg-slate-800">
            <Code size={18} /> Developer / Evaluation
          </button>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
              <img src="https://ui-avatars.com/api/?name=Dr.+Sharma&background=334155&color=94a3b8" alt="Dr" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Dr. Sharma</p>
              <p className="text-xs text-slate-400 truncate">Cardiology Clinic</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md w-full hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" 
                placeholder="Search patients (ID, name...)" 
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
              Demo / Synthetic Data
            </div>

            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">12</span>
            </button>
            <button className="text-slate-500 hover:text-slate-700 transition-colors">
              <HelpCircle size={20} />
            </button>
            
            <div className="pl-5 border-l border-slate-200">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={() => navigate('/')}>
                <LogOut size={16} className="mr-2" /> Logout
              </Button>
            </div>
          </div>
        </header>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6 relative">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
