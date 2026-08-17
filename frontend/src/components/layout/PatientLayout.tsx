import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  HeartPulse, LayoutDashboard, Pill, History, CalendarDays, 
  Activity, ShieldPlus, HelpCircle, FileText, Settings,
  Menu, Bell, Phone
} from 'lucide-react';
import { Button } from '../ui/Button';

export const PatientLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 cursor-pointer" onClick={() => navigate('/patient-portal')}>
          <div className="text-[#1e3a8a] mr-2">
            <HeartPulse size={28} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1e3a8a]">Medivia</span>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium">
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <Pill size={18} />
            Medications
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <History size={18} />
            Adherence History
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <CalendarDays size={18} />
            Calendar
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <Activity size={18} />
            Risk & Insights
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <ShieldPlus size={18} />
            Refill & Access
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <HeartPulse size={18} />
            Support & Actions
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <FileText size={18} />
            Reports
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <Settings size={18} />
            Profile Settings
          </button>
        </nav>

        {/* Need Help Card */}
        <div className="p-4">
          <div className="bg-[#f8faff] border border-blue-100 rounded-xl p-4">
            <h4 className="font-semibold text-[#1e3a8a] text-sm mb-1">Need Help?</h4>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Contact your care team for any questions or support.
            </p>
            <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-xs h-9" size="sm">
              <Phone size={14} className="mr-2" /> Contact Care Team
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-700 md:hidden">
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Menu size={20} className="text-slate-400 hidden md:block" />
              Patient Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-5 border-l border-slate-200">
              <button type="button" onClick={() => navigate('/patient/profile')} className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300">
                <img src="https://ui-avatars.com/api/?name=John+Doe&background=e2e8f0&color=475569" alt="User" className="w-full h-full object-cover" />
              </button>
              <div className="hidden sm:block text-sm">
                <p className="font-bold text-slate-800 leading-tight">John Doe</p>
                <p className="text-slate-500 text-xs">Patient</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto p-6 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
