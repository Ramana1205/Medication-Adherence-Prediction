import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { db } from '../store/db';

export const DoctorLogin: React.FC = () => {
  const navigate = useNavigate();
  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = db.authenticateDoctor(idOrEmail.trim(), password);
    if (!res.success) {
      if (res.error === 'not_found') setError('Doctor account not found.');
      else if (res.error === 'invalid_password') setError('Invalid doctor credentials.');
      else setError('Invalid doctor credentials.');
      return;
    }
    // Navigate to doctor dashboard
    navigate('/doctor/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <HeartPulse size={28} className="text-blue-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">MedAdhere AI</h2>
            <p className="text-sm text-slate-500">Doctor Login</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Doctor ID or Email</label>
            <input value={idOrEmail} onChange={(e) => setIdOrEmail(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="DOC001 or doctor@medadhere.ai" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="Enter password" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-between">
            <Button type="submit" className="bg-[#1e3a8a] text-white px-4 py-2">Login</Button>
            <button type="button" onClick={() => alert('Please contact the system administrator.')} className="text-sm text-slate-500 underline">Forgot password?</button>
          </div>
        </form>
      </div>
    </div>
  );
};
