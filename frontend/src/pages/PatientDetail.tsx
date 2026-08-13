import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { Patient, Medication } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChevronLeft, AlertTriangle, ShieldAlert, CheckCircle2, Pill, Clock, Activity, Bell } from 'lucide-react';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [interventionStatus, setInterventionStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');

  useEffect(() => {
    if (id) {
      const p = db.getPatient(id);
      if (p) {
        setPatient(p);
        setMeds(db.getMedications(id));
      }
    }
  }, [id]);

  if (!patient) return <div className="p-6">Loading patient...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{patient.patient_name} — {patient.patient_id}</h1>
          <p className="text-sm text-slate-500">Age: {patient.age} • Gender: {patient.gender} • Chronic Conditions: {patient.chronic_conditions}</p>
        </div>
      </div>

      {/* Top 4 Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border-t-4 shadow-sm ${patient.risk_level === 'HIGH' ? 'border-t-red-500 bg-red-50/30' : patient.risk_level === 'MEDIUM' ? 'border-t-amber-500 bg-amber-50/30' : 'border-t-green-500 bg-green-50/30'}`}>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Risk Score</p>
            <div className="flex items-end gap-3">
              <h2 className="text-4xl font-black text-slate-800">{patient.risk_score} <span className="text-xl text-slate-400 font-normal">/ 100</span></h2>
            </div>
            <div className={`mt-2 inline-flex px-2.5 py-0.5 rounded text-xs font-bold uppercase ${patient.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : patient.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {patient.risk_level}
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adherence</p>
            <h2 className="text-4xl font-black text-slate-800">{patient.prior_adherence}%</h2>
            <p className="mt-2 text-xs text-slate-500 font-medium">Recent calculation</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Missed Doses</p>
            <h2 className="text-4xl font-black text-slate-800">{patient.previous_missed_doses}</h2>
            <p className="mt-2 text-xs text-slate-500 font-medium">This month</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Refill Delay</p>
            <h2 className="text-4xl font-black text-slate-800">{patient.refill_gap_days} <span className="text-xl font-normal text-slate-500">days</span></h2>
            <p className="mt-2 text-xs text-slate-500 font-medium">Current gap</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Why is this patient at risk? */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500" /> Why is this patient at risk?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-bold text-slate-700 mb-4">Main Risk Factors</p>
            
            {patient.previous_missed_doses > 2 && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><span className="text-xs font-bold">🔴</span></div>
                <span className="text-sm font-medium text-slate-800">{patient.previous_missed_doses} missed doses</span>
              </div>
            )}
            
            {patient.refill_gap_days > 5 && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><span className="text-xs font-bold">🔴</span></div>
                <span className="text-sm font-medium text-slate-800">{patient.refill_gap_days}-day refill delay</span>
              </div>
            )}
            
            {patient.num_meds > 2 && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><span className="text-xs font-bold">🟠</span></div>
                <span className="text-sm font-medium text-slate-800">Complex medication schedule ({patient.num_meds} medicines)</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0"><span className="text-xs font-bold">🟡</span></div>
              <span className="text-sm font-medium text-slate-800">Evening doses frequently missed</span>
            </div>
          </CardContent>
        </Card>

        {/* Medication-wise adherence */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Pill size={18} className="text-blue-500" /> Medication-wise Adherence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {meds.map((m, i) => {
              // Mocking specific med adherence for the demo based on general adherence
              const mockAdherence = Math.min(100, Math.max(0, patient.prior_adherence + (i === 1 ? -25 : i * 10)));
              return (
                <div key={m.medicine_id} className="flex justify-between items-center pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{m.medicine_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{m.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-slate-800">{mockAdherence}% <span className="text-xs font-medium text-slate-500">adherence</span></p>
                    <p className={`text-xs font-bold mt-1 flex items-center justify-end gap-1 ${mockAdherence > 80 ? 'text-green-600' : mockAdherence > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {mockAdherence > 80 ? '🟢 Low risk' : mockAdherence > 60 ? '🟡 Medium risk' : '🔴 High risk'}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Time-based Pattern */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" /> Time-based Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="w-24 text-slate-600 font-medium">Morning</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400 w-[21%] rounded-full"></div></div>
                <span className="w-12 text-right font-bold text-slate-700">21%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="w-24 text-slate-600 font-medium">Afternoon</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400 w-[34%] rounded-full"></div></div>
                <span className="w-12 text-right font-bold text-slate-700">34%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="w-24 text-slate-600 font-medium">Evening</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 w-[76%] rounded-full"></div></div>
                <span className="w-12 text-right font-bold text-slate-700">76%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="w-24 text-slate-600 font-medium">Night</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 w-[48%] rounded-full"></div></div>
                <span className="w-12 text-right font-bold text-slate-700">48%</span>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> Evening doses are missed most frequently.
            </div>
          </CardContent>
        </Card>

        {/* Recommended Intervention */}
        <Card className="shadow-sm border-slate-200 border-t-4 border-t-[#1e3a8a]">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity size={18} className="text-[#1e3a8a]" /> Recommended Support
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Bell size={16}/></div>
                Evening reminder
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Pill size={16}/></div>
                Refill reminder
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Activity size={16}/></div>
                Adherence-support follow-up
              </li>
            </ul>

            <div className="flex gap-3">
              {interventionStatus === 'Pending' && (
                <Button className="w-full bg-[#1e3a8a] hover:bg-[#172e6e]" onClick={() => setInterventionStatus('In Progress')}>
                  Mark Intervention In Progress
                </Button>
              )}
              {interventionStatus === 'In Progress' && (
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setInterventionStatus('Completed')}>
                  Mark Completed
                </Button>
              )}
              {interventionStatus === 'Completed' && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
                  <CheckCircle2 size={16} className="mr-2"/> Intervention Completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
