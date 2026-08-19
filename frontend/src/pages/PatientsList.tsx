import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../store/db';
import { Patient, RiskLevel } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Search, Plus, UserPlus, X } from 'lucide-react';
import { predictAdherence } from '../lib/api';
import type { Medication } from '../types';

export const PatientsList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    void db.loadPatients().then(setPatients).catch((error) => {
      console.error('Failed to load patients:', error);
      setLoadError('Unable to load patient data from the backend.');
    });
    const q = new URLSearchParams(location.search);
    const f = q.get('filter');
    if (f) setRiskFilter(f);
  }, [location.search]);

  const getRiskValue = (p: any) => (typeof p.risk_percentage === 'number' ? p.risk_percentage : (typeof p.risk_score === 'number' ? p.risk_score : 0));

  const filteredPatients = patients
    .filter(p => p.patient_name.toLowerCase().includes(search.toLowerCase()) || p.patient_id.toLowerCase().includes(search.toLowerCase()))
    .filter(p => riskFilter === 'ALL' || p.risk_level === riskFilter)
    .sort((a, b) => getRiskValue(b) - getRiskValue(a));

  if (loadError) return <div className="p-6 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">My Patients</h1>
        <Button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]" onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" /> Add Patient
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              placeholder="Search by Patient ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-slate-500">Filter Risk:</span>
            <select 
              className="border border-slate-300 rounded-lg text-sm p-2 focus:outline-none focus:border-[var(--primary)] bg-white"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </CardContent>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6 font-semibold">Patient ID</th>
                <th className="py-4 px-6 font-semibold">Name</th>
                <th className="py-4 px-6 font-semibold">Risk Level</th>
                <th className="py-4 px-6 font-semibold">Risk Score</th>
                <th className="py-4 px-6 font-semibold">Adherence</th>
                <th className="py-4 px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map(p => (
                <tr key={p.patient_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800">{p.patient_id}</td>
                  <td className="py-4 px-6 text-slate-700 font-medium">{p.patient_name}</td>
                  <td className="py-4 px-6">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      p.risk_level === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' : 
                      p.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                      'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {p.risk_level}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-800">{p.risk_score}</td>
                  <td className="py-4 px-6 text-slate-600">{p.prior_adherence}%</td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="outline" size="sm" className="text-[var(--primary)] border-[var(--border)] hover:bg-[var(--primary)]/5" onClick={() => navigate(`/doctor/patient/${p.patient_id}`)}>
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
              
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No patients found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Patient Modal (Expanded) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 animate-in zoom-in-95 duration-200 overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2"><UserPlus className="text-[var(--primary)]" /> Add New Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Form state */}
            <AddPatientForm onClose={() => {
              setShowAddModal(false);
              void db.loadPatients().then(setPatients).catch((error) => {
                console.error('Failed to refresh patients:', error);
                setLoadError('Unable to refresh patient data from the backend.');
              });
            }} />

          </div>
        </div>
      )}

    </div>
  );
};


// --- AddPatientForm component (kept local to this file) ---

const AddPatientForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [patientName, setPatientName] = React.useState('');
  const [age, setAge] = React.useState<number | ''>('');
  const [gender, setGender] = React.useState<'Male'|'Female'|'Other'>('Female');
  const [chronicConditions, setChronicConditions] = React.useState<number>(0);

  // Adherence-related
  const [numMeds, setNumMeds] = React.useState<number>(1);
  const [priorAdherence, setPriorAdherence] = React.useState<number>(80);
  const [missedDosesRecent, setMissedDosesRecent] = React.useState<number>(0);
  const [refillGapDays, setRefillGapDays] = React.useState<number>(0);
  const [daysSinceLastRefill, setDaysSinceLastRefill] = React.useState<number>(0);
  const [missedAppointments, setMissedAppointments] = React.useState<number>(0);
  const [medicationChanges, setMedicationChanges] = React.useState<boolean>(false);
  const [dailyDoseFrequency, setDailyDoseFrequency] = React.useState<'Once daily'|'Twice daily'|'Three times daily'>('Once daily');
  const [medicationDurationDays, setMedicationDurationDays] = React.useState<number>(30);
  const [mentalHealthFlag, setMentalHealthFlag] = React.useState<boolean>(false);
  const [copayTier, setCopayTier] = React.useState<'low'|'medium'|'high'>('medium');

  const [medicationsList, setMedicationsList] = React.useState<any[]>([{ medicine_name: '', dose: '', frequency: 'Once daily', scheduled_times: ['08:00 AM'] }]);

  const addMedicationRow = () => setMedicationsList(prev => [...prev, { medicine_name: '', dose: '', frequency: 'Once daily', scheduled_times: ['08:00 AM'] }]);
  const removeMedicationRow = (i:number) => setMedicationsList(prev => prev.filter((_,idx)=>idx!==i));
  const updateMedicationField = (i:number, field: string, value:any) => setMedicationsList(prev => prev.map((m,idx) => idx===i ? { ...m, [field]: value } : m));

  const validateStep1 = () => {
    if (!patientName.trim()) return 'Please enter the patient name.';
    if (!age || age <= 0) return 'Please enter a valid age.';
    return '';
  };

  const validateMedications = () => {
    if (!medicationsList || medicationsList.length === 0) return 'Please add at least one medication.';
    for (let i=0;i<medicationsList.length;i++){
      const m = medicationsList[i];
      if (!m.medicine_name || !m.medicine_name.trim()) return `Please enter medicine name for medication ${i+1}.`;
      if (!m.scheduled_times || m.scheduled_times.length===0) return `Please add at least one scheduled time for medication ${i+1}.`;
    }
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    const medErr = validateMedications();
    if (medErr) { setError(medErr); return; }
    if (!patientName || !age) { setError('Missing patient basic info.'); setStep(1); return; }

    setLoading(true);
    try {
      // Build prediction payload
      const payload = {
        age: Number(age),
        chronic_conditions: Number(chronicConditions),
        num_meds: Number(numMeds || medicationsList.length),
        refill_gap_days: Number(refillGapDays),
        prior_year_adherence: Number(priorAdherence),
        mental_health_flag: (mentalHealthFlag ? 1 : 0) as 0 | 1,
        missed_doses_recent: Number(missedDosesRecent),
        days_since_last_refill: Number(daysSinceLastRefill),
        missed_appointments: Number(missedAppointments),
          medication_changes: (medicationChanges ? 1 : 0) as 0 | 1,
          daily_dose_frequency: (dailyDoseFrequency === 'Once daily' ? 1 : dailyDoseFrequency === 'Twice daily' ? 2 : 3) as 1 | 2 | 3,
        medication_duration_days: Number(medicationDurationDays),
          gender_F: (gender === 'Female' ? 1 : 0) as 0 | 1,
          gender_M: (gender === 'Male' ? 1 : 0) as 0 | 1,
          copay_tier_high: (copayTier === 'high' ? 1 : 0) as 0 | 1,
          copay_tier_low: (copayTier === 'low' ? 1 : 0) as 0 | 1,
          copay_tier_medium: (copayTier === 'medium' ? 1 : 0) as 0 | 1,
      };

      const prediction = await predictAdherence(payload);

      // Register patient and pass medicationsList so db.registerNewPatient persists meds and today's slots
      const newPatient = db.registerNewPatient({
        patient_name: patientName,
        age: Number(age),
        gender,
        chronic_conditions: Number(chronicConditions),
        previous_missed_doses: Number(missedDosesRecent),
        previous_missed_refills: 0,
        refill_gap_days: Number(refillGapDays),
        prior_adherence: Number(priorAdherence),
        _raw_features: payload
      }, undefined, medicationsList.length, dailyDoseFrequency, medicationsList.map(m => ({ ...m } as Partial<Medication>)));

      // Persist model outputs
      db.updatePatientPrediction(newPatient.patient_id, {
        risk_score: Math.round(prediction.risk_percentage),
        risk_level: prediction.risk_level,
        adherence_probability: prediction.adherence_probability,
        non_adherence_risk: prediction.non_adherence_risk,
        risk_percentage: prediction.risk_percentage,
        risk_factors: prediction.risk_factors,
        protective_factors: prediction.protective_factors,
        recommendations: prediction.recommendations,
      });

      // Ensure at least today's slots exist (db.registerNewPatient already adds slots). Do not generate random events.

      // Close modal and refresh parent
      onClose();
    } catch (err:any) {
      setError(err?.message || 'Failed to create patient');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Basic Info */}
        <div className="p-4 border rounded">
          <h4 className="font-bold mb-2">Patient Information</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-slate-700">Full Name</label>
              <input value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Age</label>
              <input type="number" value={age as any} onChange={e => setAge(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full border p-2 rounded text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Chronic Conditions</label>
              <input type="number" value={chronicConditions} onChange={e => setChronicConditions(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
          </div>
        </div>

        {/* Adherence Info */}
        <div className="p-4 border rounded">
          <h4 className="font-bold mb-2">Medication Adherence Information</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-slate-700">Number of Current Medications</label>
              <input type="number" value={numMeds} onChange={e => setNumMeds(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Previous Year Adherence (%)</label>
              <input type="number" value={priorAdherence} onChange={e => setPriorAdherence(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Missed Doses Recently</label>
              <input type="number" value={missedDosesRecent} onChange={e => setMissedDosesRecent(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Typical Refill Gap (days)</label>
              <input type="number" value={refillGapDays} onChange={e => setRefillGapDays(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Days Since Last Refill</label>
              <input type="number" value={daysSinceLastRefill} onChange={e => setDaysSinceLastRefill(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Missed Appointments</label>
              <input type="number" value={missedAppointments} onChange={e => setMissedAppointments(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Recent Medication Changes</label>
              <select value={medicationChanges ? 'Yes' : 'No'} onChange={e => setMedicationChanges(e.target.value === 'Yes')} className="w-full border p-2 rounded text-sm">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Daily Dose Frequency</label>
              <select value={dailyDoseFrequency} onChange={e => setDailyDoseFrequency(e.target.value as any)} className="w-full border p-2 rounded text-sm">
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>Three times daily</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Medication Duration (days)</label>
              <input type="number" value={medicationDurationDays} onChange={e => setMedicationDurationDays(Number(e.target.value))} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Mental Health Support Flag</label>
              <select value={mentalHealthFlag ? 'Yes' : 'No'} onChange={e => setMentalHealthFlag(e.target.value === 'Yes')} className="w-full border p-2 rounded text-sm">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Copay Tier</label>
              <select value={copayTier} onChange={e => setCopayTier(e.target.value as any)} className="w-full border p-2 rounded text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Medications section */}
      <div className="p-4 border rounded mb-4">
        <h4 className="font-bold mb-2">Medications</h4>
        <div className="space-y-3">
          {medicationsList.map((m, idx) => (
            <div key={idx} className="p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">Medication {idx+1}</div>
                <div>
                  {medicationsList.length > 1 && <button onClick={() => removeMedicationRow(idx)} className="text-xs text-red-600">Remove</button>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium">Medicine Name</label>
                  <input value={m.medicine_name as string || ''} onChange={(e) => updateMedicationField(idx, 'medicine_name', e.target.value)} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium">Dose</label>
                  <input value={m.dose as string || ''} onChange={(e) => updateMedicationField(idx, 'dose', e.target.value)} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium">Frequency</label>
                  <select value={m.frequency as string || 'Once daily'} onChange={(e) => updateMedicationField(idx, 'frequency', e.target.value)} className="w-full border p-2 rounded text-sm">
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Three times daily</option>
                  </select>
                </div>
              </div>

              <div className="mt-2">
                <label className="text-xs font-medium">Scheduled Times</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {(m.scheduled_times || []).map((t: string, ti: number) => (
                    <input key={ti} value={t} onChange={(e) => {
                      const arr = (m.scheduled_times || []).slice(); arr[ti] = e.target.value; updateMedicationField(idx, 'scheduled_times', arr);
                    }} className="border p-2 rounded text-sm w-28" />
                  ))}
                  <button onClick={() => updateMedicationField(idx, 'scheduled_times', [ ...(m.scheduled_times || []), '08:00 AM'])} className="text-xs px-2 py-1 bg-slate-100 rounded">+ Add Time</button>
                </div>
                <div className="text-xs text-slate-500 mt-1">Optional instructions</div>
                <input value={m.instructions as string || ''} onChange={(e) => updateMedicationField(idx, 'instructions', e.target.value)} className="w-full border p-2 rounded text-sm mt-1" />
              </div>
            </div>
          ))}

          <div>
            <button onClick={addMedicationRow} className="text-sm px-3 py-2 bg-slate-100 rounded">+ Add Medicine</button>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
        <Button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]" onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create Patient & Predict'}</Button>
      </div>
    </div>
  );
};
