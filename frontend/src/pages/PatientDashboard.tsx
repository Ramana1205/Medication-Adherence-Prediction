import React, { useState, useEffect } from 'react';
import { db } from '../store/db';
import { Patient, MedicationSlot, Medication } from '../types';
import { HeartPulse, Bell, MessageSquare, CheckCircle2, XCircle, Clock, Check, X, Calendar as CalendarIcon, User, Home, ChevronRight, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper to generate a dummy 35-day calendar grid (5 weeks)
const generateMockCalendar = () => {
  const days = [];
  // Generate 35 days with random statuses for demonstration
  for (let i = 0; i < 35; i++) {
    // Make most days green, some yellow, rare red, future days gray
    let status = 'none';
    if (i < 24) { // Past days
      const rand = Math.random();
      status = rand > 0.3 ? 'green' : rand > 0.1 ? 'yellow' : 'red';
    }
    
    // Hardcode today (e.g. index 24) based on today's real slots if we wanted, but mock is fine
    if (i === 24) status = 'current';
    
    days.push({ id: i, date: i % 31 + 1, status });
  }
  return days;
};

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [slots, setSlots] = useState<MedicationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [selectedSlotForSkip, setSelectedSlotForSkip] = useState<string | null>(null);

  const loadData = () => {
    const activeId = localStorage.getItem('active_patient_id');
    if (!activeId) {
      navigate('/patient/auth');
      return;
    }
    
    const p = db.getPatient(activeId);
    if (p) {
      setPatient(p);
      setMeds(db.getMedications(p.patient_id));
      setSlots(db.getTodaySlots(p.patient_id));
    } else {
      // Fallback
      localStorage.removeItem('active_patient_id');
      navigate('/patient/auth');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTookMedicine = (slotId: string) => {
    db.logMedicationEvent(slotId, 'TAKEN');
    loadData();
  };

  const handleSkipClick = (slotId: string) => {
    setSelectedSlotForSkip(slotId);
    setSkipModalOpen(true);
  };

  const handleSkipConfirm = (reason: string) => {
    if (selectedSlotForSkip) {
      db.logMedicationEvent(selectedSlotForSkip, 'SKIPPED', reason);
      setSkipModalOpen(false);
      setSelectedSlotForSkip(null);
      loadData();
    }
  };

  if (loading || !patient) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  const takenCount = slots.filter(s => s.status === 'TAKEN').length;
  const totalSlots = slots.length;
  const nextMed = slots.find(s => s.status === 'PENDING');
  
  const getMedName = (medId: string) => meds.find(m => m.medicine_id === medId)?.medicine_name || 'Unknown';
  const getMedFreq = (medId: string) => meds.find(m => m.medicine_id === medId)?.frequency || '';

  const calendarDays = generateMockCalendar();

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-20 lg:pb-0">
      
      {/* Top Header */}
      <header className="bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <HeartPulse size={28} className="text-blue-600" strokeWidth={2.5} />
          <span className="font-bold text-xl text-slate-800 tracking-tight">MedAdhere AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 text-sm font-bold bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#172e6e] transition-colors shadow-sm">
            Check Adherence
          </button>
          
          <button className="text-slate-500 hover:text-blue-600 relative p-2 bg-slate-50 rounded-full">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              {patient.patient_name.charAt(0)}
            </div>
            <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        
        {/* Greeting */}
        <div>
          <p className="text-slate-500 font-medium">Good Morning,</p>
          <h1 className="text-3xl font-black text-slate-800">{patient.patient_name.split(' ')[0]} 👋</h1>
        </div>

        {/* Desktop Top Row / Mobile Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          
          {/* Mobile Only: Adherence Card (Hidden on Desktop, moved to right sidebar) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:hidden">
            <h3 className="font-bold text-slate-800 mb-4">Your Adherence</h3>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-black text-green-600">{patient.prior_adherence}%</span>
            </div>
            <p className="text-xs text-slate-500 mb-3 font-medium">Tracking your progress</p>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{width: `${patient.prior_adherence}%`}}></div>
            </div>
          </div>

          {/* Today's Progress */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center">
            <h4 className="font-bold text-slate-800 text-sm mb-2">Today's Progress</h4>
            <p className="text-sm text-slate-500 mb-4"><span className="font-bold text-slate-800 text-lg">{takenCount} / {totalSlots}</span> medicines completed</p>
            <div className="flex items-center gap-3">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex-1">
                <div className="bg-green-500 h-full rounded-full" style={{width: `${totalSlots ? (takenCount/totalSlots)*100 : 0}%`}}></div>
              </div>
              <span className="text-sm font-bold text-green-600">{totalSlots ? Math.round((takenCount/totalSlots)*100) : 0}%</span>
            </div>
          </div>

          {/* Next Medicine */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute -right-4 -top-4 text-blue-50"><Clock size={80} /></div>
            <h4 className="font-bold text-slate-800 text-sm mb-2 relative z-10">Next Medicine</h4>
            {nextMed ? (
              <div className="relative z-10">
                <p className="text-blue-600 font-black text-2xl mb-1">{nextMed.scheduled_time}</p>
                <p className="text-sm font-bold text-slate-700 truncate">{getMedName(nextMed.medicine_id)} <span className="text-xs font-normal text-slate-500 block lg:inline ml-0 lg:ml-1">{getMedFreq(nextMed.medicine_id)} dose</span></p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-2 relative z-10">All done for today!</p>
            )}
          </div>

          {/* Reminder */}
          <div className="bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-100 flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-full text-amber-600 mt-1 shrink-0"><Bell size={24}/></div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Reminder</h4>
              <p className="text-sm text-slate-600 leading-snug">
                {nextMed ? `Your next medicine is scheduled for ${nextMed.scheduled_time}.` : 'No upcoming medicines for today. Great job!'}
              </p>
            </div>
          </div>

          {/* Need Help? */}
          <div className="bg-blue-50 rounded-2xl p-5 shadow-sm border border-blue-100 flex flex-col justify-center">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0"><MessageSquare size={18}/></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Need Help?</h4>
                <p className="text-xs text-slate-600 mt-1">Chat with your Adherence Assistant</p>
              </div>
            </div>
            <button className="w-full bg-[#1e3a8a] hover:bg-[#172e6e] text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
              Chat Now
            </button>
          </div>
          
          {/* Mobile Only: Calendar (Desktop shows in Right Column) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:hidden">
            <h4 className="font-bold text-slate-800 text-sm mb-4">Adherence Calendar</h4>
            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <div 
                  key={day.id} 
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium border ${
                    day.status === 'green' ? 'bg-green-100 border-green-200 text-green-700' :
                    day.status === 'red' ? 'bg-red-100 border-red-200 text-red-700' :
                    day.status === 'yellow' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                    day.status === 'current' ? 'bg-blue-600 border-blue-600 text-white shadow-md' :
                    'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  {day.date}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: Today's Medicines List */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Today's Medicines</h3>
              <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5"><CalendarIcon size={16}/> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="space-y-4">
              {slots.map(slot => (
                <div key={slot.slot_id} className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 relative overflow-hidden transition-all hover:shadow-md">
                  {/* Left Time Bar indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                    slot.status === 'TAKEN' ? 'bg-green-500' : 
                    slot.status === 'SKIPPED' ? 'bg-red-500' : 'bg-amber-400'
                  }`}></div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                    <div className="w-24 shrink-0 sm:border-r border-slate-100 sm:pr-4">
                      <p className="font-black text-slate-800 text-lg lg:text-xl leading-tight">{slot.scheduled_time.split(' ')[0]}</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">{slot.scheduled_time.split(' ')[1]}</p>
                    </div>
                    
                    <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base lg:text-lg mb-1">{getMedName(slot.medicine_id)}</h4>
                        <p className="text-sm text-slate-500">{getMedFreq(slot.medicine_id)} dose</p>
                      </div>

                      <div className="shrink-0 w-full sm:w-auto">
                        {slot.status === 'TAKEN' && (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 size={18} />
                            <span className="text-sm font-bold">TAKEN</span>
                          </div>
                        )}

                        {slot.status === 'SKIPPED' && (
                          <div className="flex flex-col items-center sm:items-end">
                            <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-red-50 text-red-600 border border-red-200 mb-1">
                              <XCircle size={18} />
                              <span className="text-sm font-bold">SKIPPED</span>
                            </div>
                            <p className="text-xs font-medium text-slate-500">Reason: Recorded as missed</p>
                          </div>
                        )}

                        {slot.status === 'PENDING' && (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                              onClick={() => handleTookMedicine(slot.slot_id)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
                            >
                              <Check size={18} /> TOOK
                            </button>
                            <button 
                              onClick={() => handleSkipClick(slot.slot_id)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
                            >
                              <X size={18} /> SKIP
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Adherence Summary (Desktop) */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg mb-6">Your Adherence Summary</h3>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle 
                      cx="50" cy="50" r="40" fill="none" 
                      stroke="#10b981" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * patient.prior_adherence) / 100} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">{patient.prior_adherence}%</span>
                    <span className="text-[10px] font-bold text-green-600 uppercase">Good</span>
                  </div>
                </div>
                
                <div>
                  <p className="font-bold text-slate-800 text-xl mb-2">{totalSlots ? Math.round((takenCount/totalSlots)*100) : 0}% of doses taken today</p>
                  <div className="inline-flex px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold mb-2">Good Work!</div>
                  <p className="text-sm text-slate-500">Keep it up! You're doing great with your medication schedule.</p>
                </div>
              </div>

              {/* Desktop Month Calendar */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-700 text-sm">Monthly Overview</h4>
                  <div className="flex gap-2 text-slate-400">
                    <ChevronLeft size={16} className="cursor-pointer hover:text-slate-600" />
                    <ChevronRight size={16} className="cursor-pointer hover:text-slate-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => (
                    <div 
                      key={day.id} 
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold border transition-transform hover:scale-110 cursor-pointer ${
                        day.status === 'green' ? 'bg-green-100 border-green-200 text-green-700' :
                        day.status === 'red' ? 'bg-red-100 border-red-200 text-red-700' :
                        day.status === 'yellow' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                        day.status === 'current' ? 'bg-blue-600 border-blue-600 text-white shadow-md' :
                        'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {day.date}
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-[10px] text-slate-500 font-medium">All Taken</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[10px] text-slate-500 font-medium">Partial</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[10px] text-slate-500 font-medium">Skipped</span></div>
                </div>
              </div>
            </div>

            <div className="bg-[#1e3a8a] rounded-2xl p-6 text-white shadow-md flex items-center justify-between cursor-pointer hover:bg-[#172e6e] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-base mb-1">Adherence Assistant</h4>
                  <p className="text-xs text-blue-200">Get personalized support & help</p>
                </div>
              </div>
              <ChevronRight size={24} className="text-blue-300" />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Mobile Navigation (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-6 py-3 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <button className="flex flex-col items-center text-blue-600 gap-1 w-16">
          <Home size={24} />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-blue-600 transition-colors gap-1 w-16">
          <HeartPulse size={24} />
          <span className="text-[10px] font-medium mt-1">Medicines</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-blue-600 transition-colors gap-1 w-16">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-medium mt-1">Adherence</span>
        </button>
        <button onClick={() => navigate('/')} className="flex flex-col items-center text-slate-400 hover:text-red-500 transition-colors gap-1 w-16">
          <LogOut size={24} />
          <span className="text-[10px] font-medium mt-1">Logout</span>
        </button>
      </nav>

      {/* Skip Dialog Modal */}
      {skipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSkipModalOpen(false)}></div>
          <div className="bg-white rounded-2xl p-6 lg:p-8 relative z-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Skip Medicine?</h3>
            <p className="text-sm text-slate-500 mb-6">Why did you skip this medicine? Your answer helps us support you better.</p>
            
            <div className="space-y-2 mb-6">
              {[
                'I forgot', 
                'I was busy', 
                'I had side effects', 
                'I ran out of medicine', 
                'I couldn\'t afford it', 
                'Too many medicines'
              ].map(reason => (
                <button 
                  key={reason}
                  onClick={() => handleSkipConfirm(reason)}
                  className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {reason}
                </button>
              ))}
              <button 
                onClick={() => handleSkipConfirm('No Reason Provided')}
                className="w-full text-left px-4 py-3.5 text-sm font-medium text-slate-400 text-center hover:text-slate-600 transition-colors mt-2"
              >
                Skip without telling reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
