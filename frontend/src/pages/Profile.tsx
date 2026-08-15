import React from 'react';
import { Button } from '../components/ui/Button';

export const Profile: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Doctor Profile</h2>
      <div className="bg-white rounded shadow p-4 max-w-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-bold">DS</div>
          <div>
            <div className="font-bold">Dr. Sharma</div>
            <div className="text-sm text-slate-500">Cardiology Clinic</div>
            <div className="text-sm text-slate-500 mt-2">demo@clinic.local</div>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={() => window.location.href = '/'}>Logout</Button>
        </div>
      </div>
    </div>
  );
};