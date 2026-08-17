import React, { useState, useEffect } from 'react';
import { db } from '../store/db';
import { Patient, MedicationSlot, Medication, Notification } from '../types';
import { HeartPulse, Bell, MessageSquare, CheckCircle2, XCircle, Clock, Check, X, Calendar as CalendarIcon, User, Home, ChevronRight, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Calendar generation and status helpers (deterministic, driven from persisted events)
const formatDateKey = (year: number, monthIndex: number, day: number) => {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`; // YYYY-MM-DD
};

const getMonthGrid = (year: number, monthIndex: number) => {
  // returns 6 weeks (42 cells) for consistency
  const firstDay = new Date(year, monthIndex, 1).getDay(); // 0..6 Sun..Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const grid: Array<{ day: number | null, iso: string | null }> = [];

  // leading blanks
  for (let i = 0; i < firstDay; i++) grid.push({ day: null, iso: null });

  // month days
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = formatDateKey(year, monthIndex, d);
    grid.push({ day: d, iso });
  }

  // trailing blanks to fill to 42
  while (grid.length < 42) grid.push({ day: null, iso: null });
  return grid;
};

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [slots, setSlots] = useState<MedicationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [selectedSlotForSkip, setSelectedSlotForSkip] = useState<string | null>(null);
  const [showAdherence, setShowAdherence] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [showNotifs, setShowNotifs] = useState(false);
  const [patientNotifications, setPatientNotifications] = useState<Notification[]>([]);

  const loadData = async () => {
    const activeId = localStorage.getItem('active_patient_id');
    if (!activeId) {
      navigate('/patient/auth');
      return;
    }

    const p = db.getPatient(activeId);
    if (p) {
      setPatient(p);
      const patientMeds = await db.refreshPatientMedications(p.patient_id);
      setMeds(patientMeds);
      setSlots(db.getTodaySlots(p.patient_id));
    } else {
      localStorage.removeItem('active_patient_id');
      navigate('/patient/auth');
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
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


  const hasPrediction = (p: Patient) => {
    return (typeof p.adherence_probability === 'number') || (typeof p.non_adherence_risk === 'number') || (typeof p.risk_percentage === 'number') || Array.isArray(p.risk_factors) && p.risk_factors.length > 0 || typeof p.risk_level === 'string';
  };

  const patientUnread = patient ? db.getUnreadNotificationCount(patient.patient_id) : 0;

  const notifsRef = React.useRef<HTMLDivElement | null>(null);

  const loadPatientNotifications = () => {
    if (!patient) { setPatientNotifications([]); return; }
    const nots = db.getNotifications().filter(n => n.patient_id === patient.patient_id && (!n.for_role || n.for_role === 'patient'));
    setPatientNotifications(nots);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!notifsRef.current) return;
      if (notifsRef.current.contains(e.target as Node)) return;
      setShowNotifs(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const handleOpenNotification = (n: Notification) => {
    db.markNotificationRead(n.id);
    loadPatientNotifications();
    // refresh unread count visually by reloading state
    // navigate to patient chat conversation
    setShowNotifs(false);
    navigate('/patient/chat');
  };


  const takenCount = slots.filter(s => s.status === 'TAKEN').length;
  const totalSlots = slots.length;
  const nextMed = slots.find(s => s.status === 'PENDING');
  
  const getMedName = (medId: string) => meds.find(m => m.medicine_id === medId)?.medicine_name || 'Unknown';
  const getMedFreq = (medId: string) => meds.find(m => m.medicine_id === medId)?.frequency || '';

  // Month navigation state
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(today.getMonth()); // 0-based

  if (loading || !patient) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  const p = patient as Patient;

  const computeAdherenceStats = (patientId: string) => {
    // Use persisted medication events as source of truth
    const allEvents = (db as any).state?.events || [];
    const patientEvents = allEvents.filter((e:any) => e.patient_id === patientId);
    const totalScheduled = patientEvents.filter((e:any) => e.status === 'TAKEN' || e.status === 'SKIPPED').length;
    const taken = patientEvents.filter((e:any) => e.status === 'TAKEN').length;
    const skipped = patientEvents.filter((e:any) => e.status === 'SKIPPED').length;
    const adherence = totalScheduled > 0 ? (taken / totalScheduled) * 100 : null;

    // Recent windows for simple projection
    const now = new Date();
    const last7 = patientEvents.filter((e:any) => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()-7));
    const last30 = patientEvents.filter((e:any) => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()-30));
    const calc = (arr:any[]) => {
      const t = arr.filter(a=>a.status==='TAKEN').length + arr.filter(a=>a.status==='SKIPPED').length;
      return t > 0 ? (arr.filter(a=>a.status==='TAKEN').length / t) * 100 : null;
    };
    const last7Adh = calc(last7);
    const last30Adh = calc(last30);

    let projection: number | null = null;
    let projectionNote = '';
    if (last7Adh !== null) {
      projection = last7Adh; // simple: if recent pattern continues
      projectionNote = 'Based on recent (7-day) medication-taking pattern.';
    } else if (last30Adh !== null) {
      projection = last30Adh;
      projectionNote = 'Based on medication history over the last 30 days.';
    }

    // Suggestions
    const suggestions: string[] = [];
    if (adherence === null) {
      // no data
    } else {
      if (adherence >= 90) suggestions.push('Keep following your current medication schedule.');
      else if (adherence >= 75) suggestions.push('Consider setting reminders for doses that are frequently missed.');
      else suggestions.push('You have missed several scheduled doses. Consider discussing any barriers with your doctor.');

      // Evening misses
      const eveningSkips = patientEvents.filter((e:any) => e.status === 'SKIPPED' && e.scheduled_time && e.scheduled_time.includes('PM')).length;
      if (eveningSkips >= 2) suggestions.push('Evening doses are frequently missed — consider an evening reminder or rescheduling.');

      // refill gap
      if (p.refill_gap_days && p.refill_gap_days > 14) suggestions.push("Review patient's refill status to avoid running out of medication.");
    }

    return {
      totalScheduled,
      taken,
      skipped,
      adherence,
      projection,
      projectionNote,
      suggestions
    };
  };

  const stats = p ? computeAdherenceStats(p.patient_id) : null;

  const adherenceModal = (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${showAdherence ? '' : 'pointer-events-none opacity-0'}`}>
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdherence(false)}></div>
      <div className="bg-white rounded-lg shadow-lg z-10 max-w-xl w-full p-6">
        <h3 className="text-xl font-bold mb-2">Check Adherence</h3>
        {!p ? (
          <div className="text-slate-500">No patient selected.</div>
        ) : (!stats || stats.adherence === null) ? (
          <div className="text-slate-500">Not enough medication history is available to calculate adherence.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <div>Scheduled doses</div>
              <div className="font-bold">{stats.totalScheduled}</div>
            </div>
            <div className="flex justify-between">
              <div>Taken</div>
              <div className="font-bold text-green-600">{stats.taken}</div>
            </div>
            <div className="flex justify-between">
              <div>Skipped</div>
              <div className="font-bold text-red-600">{stats.skipped}</div>
            </div>
            <div className="flex justify-between">
              <div>Calculated adherence</div>
              <div className="font-bold">{stats.adherence!.toFixed(2)}%</div>
            </div>

            <div>
              <h4 className="font-medium">Projected adherence</h4>
              {stats.projection ? (
                <div className="text-sm text-slate-700">{stats.projection.toFixed(1)}% — <span className="text-slate-500">{stats.projectionNote}</span></div>
              ) : (
                <div className="text-sm text-slate-500">Not enough historical data for a reliable projection.</div>
              )}
            </div>

            {stats.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium">Suggestions</h4>
                <ul className="list-disc ml-5">
                  {stats.suggestions.map((s,i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {/* ML Prediction Summary (if available) */}
            {hasPrediction(p) && (
              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-medium">AI Prediction (model)</h4>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-slate-500">Risk level</div>
                  <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${p.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : p.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{p.risk_level}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-2">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Predicted risk %</div>
                    <div className="font-bold">{(p.risk_percentage ?? p.risk_score ?? 0).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Adherence probability</div>
                    <div className="font-bold">{( (p.adherence_probability ?? 0) * 100 ).toFixed(2)}%</div>
                  </div>
                </div>

                {Array.isArray(p.risk_factors) && p.risk_factors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Top risk factors</div>
                    <ul className="list-disc ml-5 text-sm text-slate-700">
                      {p.risk_factors.slice(0,4).map((r:any, idx:number) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {Array.isArray(p.protective_factors) && p.protective_factors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Protective factors</div>
                    <ul className="list-disc ml-5 text-sm text-slate-700">
                      {p.protective_factors.slice(0,4).map((r:any, idx:number) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {Array.isArray(p.recommendations) && p.recommendations.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Recommendations</div>
                    <ul className="list-disc ml-5 text-sm text-slate-700">
                      {p.recommendations.slice(0,4).map((r:any, idx:number) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-slate-500 mt-3">Model outputs are decision-support only and not a medical diagnosis.</div>
              </div>
            )}

            <div className="text-xs text-slate-500">This is a simple data-driven estimate and not a medical diagnosis.</div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={() => setShowAdherence(false)} className="px-4 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );

  const monthGrid = getMonthGrid(viewYear, viewMonthIndex);

  const getEventsForDate = (dateIso: string) => {
    if (!patient || !dateIso) return [] as any[];
    return db.getEventsForPatientOnDate(patient.patient_id, dateIso);
  };

  const getDailyStatus = (dateIso: string) => {
    const events = getEventsForDate(dateIso);
    if (!events || events.length === 0) return 'none';
    const total = events.length;
    const taken = events.filter((e:any) => e.status === 'TAKEN').length;
    const skipped = events.filter((e:any) => e.status === 'SKIPPED').length;
    if (taken === total) return 'green';
    if (skipped === total) return 'red';
    return 'yellow';
  };

  const prevMonth = () => {
    if (viewMonthIndex === 0) { setViewMonthIndex(11); setViewYear(viewYear - 1); }
    else setViewMonthIndex(viewMonthIndex - 1);
  };
  const nextMonth = () => {
    if (viewMonthIndex === 11) { setViewMonthIndex(0); setViewYear(viewYear + 1); }
    else setViewMonthIndex(viewMonthIndex + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-20 lg:pb-0">{adherenceModal}
      
      {/* Top Header */}
      <header className="bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <HeartPulse size={28} className="text-blue-600" strokeWidth={2.5} />
          <span className="font-bold text-xl text-slate-800 tracking-tight">Medivia</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAdherence(true)} className="hidden sm:flex items-center gap-2 text-sm font-bold bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#172e6e] transition-colors shadow-sm">
            Check Adherence
          </button>
            
          <div className="relative" ref={notifsRef as any}>
          <button className="text-slate-500 hover:text-blue-600 relative p-2 bg-slate-50 rounded-full" onClick={() => { if (!showNotifs) { loadPatientNotifications(); } setShowNotifs(prev => !prev); }}>
            <Bell size={20} />
            {patientUnread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 bg-red-500 rounded-full text-white text-[11px] font-bold flex items-center justify-center px-1 border-2 border-white">{patientUnread}</span>
            ) : (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white opacity-0"></span>
            )}
          </button>

          {/* Header chat button for patients */}
          <button onClick={() => navigate('/patient/chat')} className="ml-2 text-slate-500 hover:text-blue-600 relative p-2 bg-slate-50 rounded-full">
            <MessageSquare size={20} />
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-100 z-50">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-slate-800">Notifications</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { db.markAllNotificationsReadForPatient(patient.patient_id); loadPatientNotifications(); }} className="text-xs text-slate-500 hover:underline">Mark all as read</button>
                  <button onClick={() => { setShowNotifs(false); }} className="text-xs text-slate-500">Close</button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                {patientNotifications.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No new notifications</div>
                ) : (
                  patientNotifications.map(n => (
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
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200">
            <button onClick={() => navigate('/patient/profile')} className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              {patient.patient_name.charAt(0)}
            </button>
            <button onClick={() => { localStorage.removeItem('active_patient_id'); navigate('/patient/auth'); }} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2">
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
                <p className="text-xs text-slate-600 mt-1">Chat with your Doctor</p>
              </div>
            </div>
            <button onClick={() => navigate('/patient/chat')} className="w-full bg-[#1e3a8a] hover:bg-[#172e6e] text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
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
              {monthGrid.slice(0,35).map((cell, idx) => {
                const iso = cell.iso;
                const status = iso ? getDailyStatus(iso) : 'none';
                return (
                  <div key={idx} className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium border ${
                    status === 'green' ? 'bg-green-100 border-green-200 text-green-700' :
                    status === 'red' ? 'bg-red-100 border-red-200 text-red-700' :
                    status === 'yellow' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    {cell.day ?? ''}
                  </div>
                );
              })}
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
                    <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100"><ChevronLeft size={16} className="cursor-pointer hover:text-slate-600" /></button>
                    <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100"><ChevronRight size={16} className="cursor-pointer hover:text-slate-600" /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {monthGrid.map((cell, idx) => {
                    const iso = cell.iso;
                    const isSelected = iso && selectedDate === iso;
                    const status = iso ? getDailyStatus(iso) : 'none';
                    return (
                      <div
                        key={idx}
                        onClick={() => { if (iso) setSelectedDate(iso); }}
                        className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold border transition-transform ${isSelected ? 'scale-105 ring-2 ring-blue-300 cursor-default' : 'hover:scale-110 cursor-pointer'} ${
                          status === 'green' ? 'bg-green-100 border-green-200 text-green-700' :
                          status === 'red' ? 'bg-red-100 border-red-200 text-red-700' :
                          status === 'yellow' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                          'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {cell.day ?? ''}
                      </div>
                    );
                  })}
                </div>
                 
                {/* Legend */}
                <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-[10px] text-slate-500 font-medium">All Taken</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[10px] text-slate-500 font-medium">Partial</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[10px] text-slate-500 font-medium">Skipped</span></div>
                </div>

                {/* Selected Date Details */}
                <div className="mt-4">
                  {selectedDate ? (
                    <div className="bg-white rounded p-4 border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-slate-500">Selected date</div>
                          <div className="font-bold text-slate-800">{new Date(selectedDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <button onClick={() => setSelectedDate(null)} className="text-xs text-slate-500 hover:underline">Clear</button>
                        </div>
                      </div>

                      <div className="mt-3">
                        {patient ? (() => {
                          const events = getEventsForDate(selectedDate!);
                          if (!events || events.length === 0) return <div className="text-sm text-slate-500">No medication activity recorded for this date.</div>;
                          return (
                            <div className="space-y-2">
                              {events.map(ev => (
                                <div key={ev.event_id} className="p-2 border rounded">
                                  <div className="font-medium">{ev.medicine_id ? (db.getMedications(ev.patient_id).find((m:any) => m.medicine_id === ev.medicine_id)?.medicine_name || ev.medicine_id) : 'Medication'}</div>
                                  <div className="text-sm text-slate-500">Time: {ev.scheduled_time} — Status: <span className={`font-bold ${ev.status === 'TAKEN' ? 'text-green-600' : 'text-red-600'}`}>{ev.status}</span></div>
                                  {ev.skip_reason && <div className="text-sm text-slate-500">Reason: {ev.skip_reason}</div>}
                                </div>
                              ))}
                            </div>
                          );
                        })() : <div className="text-sm text-slate-500">No patient selected.</div>}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
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
