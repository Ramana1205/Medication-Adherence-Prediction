import React, { useEffect, useState } from 'react';
import { db } from '../store/db';

export const RiskAlerts: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void db.loadPatients()
      .then(loaded => setPatients(loaded.filter((p:any) => p.risk_level === 'HIGH' || p.risk_level === 'MEDIUM')))
      .catch((error) => {
        console.error('Failed to load risk alerts:', error);
        setLoadError('Unable to load risk data from the backend.');
      });
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Risk & Alerts</h2>
      <div className="bg-white rounded shadow p-4">
        {loadError ? <div className="text-red-700">{loadError}</div> : null}
        {patients.length === 0 ? (
          <div className="text-slate-500">No current alerts.</div>
        ) : (
          <ul>
            {patients.map(p => (
              <li key={p.patient_id} className="py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold">{p.patient_id} — {p.patient_name}</div>
                  <div className="text-sm text-slate-600">{p.risk_level} — {(p.risk_percentage ?? p.risk_score) || p.risk_score}%</div>
                </div>
                <div>
                  <button onClick={() => window.location.href = `/doctor/patient/${p.patient_id}`} className="text-[var(--primary)] hover:underline">Open</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};