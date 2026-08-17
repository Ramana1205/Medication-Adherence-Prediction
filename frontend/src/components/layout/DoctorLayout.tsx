import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, LayoutDashboard, Users, Pill, 
  AlertTriangle, Activity, Settings, Code,
  Bell, HelpCircle, LogOut, MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../store/db';

export const DoctorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifsRef = React.useRef<HTMLDivElement | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [doctorName, setDoctorName] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname.includes(path);

  useEffect(() => {
    // Redirect to login if not authenticated as doctor
    const auth = db.getAuthSession();
    if (!auth || auth.role !== 'DOCTOR') {
      navigate('/doctor/login');
      return;
    }
    setDoctorName(auth.name || 'Dr.');
    const nots = db.getNotifications().filter((n:any) => !n.for_role || n.for_role === 'doctor');
    setNotifications(nots);
    setUnreadCount(nots.filter((n:any) => !n.read).length);
    setAuthChecked(true);
  }, []);

  // Close notifications when clicking outside
  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!notifsRef.current) return;
      if (notifsRef.current.contains(e.target as Node)) return;
      setShowNotifs(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const toggleNotifs = () => {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next) {
      // refresh list
      const nots = db.getNotifications().filter((n:any) => !n.for_role || n.for_role === 'doctor');
      setNotifications(nots);
      setUnreadCount(nots.filter((n:any) => !n.read).length);
    }
  };

  const handleOpenNotification = (n: any) => {
    db.markNotificationRead(n.id);
    const nots = db.getNotifications().filter((x:any) => !x.for_role || x.for_role === 'doctor');
    setNotifications(nots);
    setUnreadCount(nots.filter((x:any) => !x.read).length);
    if (n.patient_id) navigate(`/doctor/messages?patient=${n.patient_id}`);
  };

  const handleMarkAll = () => {
    db.markAllNotificationsReadForRole('doctor');
    const nots = db.getNotifications().filter((n:any) => !n.for_role || n.for_role === 'doctor');
    setNotifications(nots);
    setUnreadCount(0);
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1e293b] text-slate-300 flex flex-col hidden md:flex shrink-0 shadow-lg z-20">
      
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50 cursor-pointer bg-[#0f172a]" onClick={() => navigate('/doctor/dashboard')}>
          <div className="text-blue-400 mr-3">
            <HeartPulse size={28} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Medivia</span>
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
          
          <button onClick={() => navigate('/doctor/medications')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/medications') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Pill size={18} /> Medications
          </button>

          <button onClick={() => navigate('/doctor/messages')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/messages') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <MessageSquare size={18} /> Messages
            {unreadCount > 0 && <span className="ml-auto text-[10px] font-bold bg-red-600 text-white rounded-full px-2 py-0.5">{unreadCount}</span>}
          </button>
          
          <button onClick={() => navigate('/doctor/risk-alerts')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/risk-alerts') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <AlertTriangle size={18} /> Risk & Alerts
          </button>
          
          <button onClick={() => navigate('/doctor/interventions')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/interventions') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Activity size={18} /> Interventions
          </button>

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">System</p>
          </div>

          <button onClick={() => navigate('/doctor/profile')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/profile') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Settings size={18} /> Profile & Settings
          </button>

          <button onClick={() => navigate('/doctor/dev')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-amber-500 ${isActive('/dev') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
            <Code size={18} /> Developer / Evaluation
          </button>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/doctor/profile')} className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName || 'Dr')}&background=334155&color=94a3b8`} alt="Dr" />
              </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{doctorName || 'Dr.'}</p>
              <p className="text-xs text-slate-400 truncate">Clinic</p>
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

            <div className="relative" ref={notifsRef as any}>
              <button onClick={toggleNotifs} className="relative text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-full">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">{unreadCount}</span>}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-100 z-50">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="font-bold text-slate-800">Notifications</div>
                    <button onClick={handleMarkAll} className="text-xs text-slate-500 hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`} onClick={() => handleOpenNotification(n)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-slate-800">{n.title}</div>
                              <div className="text-sm text-slate-500 truncate">{n.message}</div>
                            </div>
                            <div className="text-xs text-slate-400 ml-4">{new Date(n.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
