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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl overflow-hidden border border-[var(--border)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[var(--primary)]/10 p-3 rounded-full">
            <HeartPulse size={28} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Medivia</h2>
            <p className="text-sm text-[var(--text-secondary)]">Doctor Login</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Doctor ID or Email</label>
            <input value={idOrEmail} onChange={(e) => setIdOrEmail(e.target.value)} className="w-full mt-1 p-2 border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="DOC001 or doctor@medadhere.ai" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-2 border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Enter password" />
          </div>

          {error && <div className="text-sm text-[var(--high-risk)]">{error}</div>}

          <div className="flex items-center justify-between">
            <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2">Login</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
