import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { db } from '../store/db';
import { clearDoctorToken } from '../lib/api';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const auth = db.getAuthSession();
  const doctorName = auth?.name || 'Doctor';
  const doctorEmail = auth?.email || 'No email on file';

  return (
    <div className="p-6">
      <button type="button" onClick={() => navigate('/doctor/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Back to Doctor Dashboard
      </button>
      <h2 className="text-2xl font-bold mb-4">Doctor Profile</h2>
      <div className="bg-white rounded shadow p-4 max-w-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-bold">
            {doctorName
              .split(' ')
              .map((part: string) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'DR'}
          </div>
          <div>
            <div className="font-bold">{doctorName}</div>
            <div className="text-sm text-slate-500">Doctor</div>
            <div className="text-sm text-slate-500 mt-2">{doctorEmail}</div>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={() => { clearDoctorToken(); db.clearAuthSession(); window.location.href = '/doctor/login'; }}>Logout</Button>
        </div>
      </div>
    </div>
  );
};