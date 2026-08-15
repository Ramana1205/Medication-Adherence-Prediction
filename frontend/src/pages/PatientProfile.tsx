import React from 'react';
import { db } from '../store/db';
import { Button } from '../components/ui/Button';

export const PatientProfile: React.FC = () => {
  const activeId = localStorage.getItem('active_patient_id');
  const patient = activeId ? db.getPatient(activeId) : null;

  if (!patient) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>
        <div className="bg-white rounded shadow p-4 max-w-xl">
          <div className="text-sm text-slate-500">No patient selected. Please sign in or select a patient profile.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Patient Profile</h2>
      <div className="bg-white rounded shadow p-4 max-w-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-bold">{patient.patient_name.charAt(0)}</div>
          <div>
            <div className="font-bold">{patient.patient_name}</div>
            <div className="text-sm text-slate-500">{patient.patient_id}</div>
            <div className="text-sm text-slate-500 mt-2">Age: {patient.age}</div>
            <div className="text-sm text-slate-500 mt-1">Gender: {patient.gender}</div>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={() => { localStorage.removeItem('active_patient_id'); window.location.href = '/patient/auth'; }}>Logout</Button>
        </div>
      </div>
    </div>
  );
};
