import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db } from '../store/db';
import { Button } from '../components/ui/Button';

export const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const activeId = localStorage.getItem('active_patient_id');
  const patient = activeId ? db.getPatient(activeId) : null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/patient/dashboard');
    }
  };

  const profileContent = patient ? (
    <div className="bg-white rounded shadow p-4 max-w-xl">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-bold">{patient.patient_name.charAt(0)}</div>
        <div>
          <div className="font-bold">{patient.patient_name}</div>
          <div className="text-sm text-slate-500">{patient.patient_id}</div>
          <div className="text-sm text-slate-500 mt-2">Age: {patient.age}</div>
          <div className="text-sm text-slate-500 mt-1">Gender: {patient.gender}</div>
          <div className="text-sm text-slate-500 mt-1">Condition: {patient.condition || 'Not specified'}</div>
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={() => { localStorage.removeItem('active_patient_id'); window.location.href = '/patient/auth'; }}>Logout</Button>
      </div>
    </div>
  ) : (
    <div className="bg-white rounded shadow p-4 max-w-xl">
      <div className="text-sm text-slate-500">No patient selected. Please sign in or select a patient profile.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-xl font-bold text-slate-800">Patient Profile</h2>
          <div className="w-20" />
        </header>

        <div className="p-2">
          {profileContent}
        </div>
      </div>
    </div>
  );
};
