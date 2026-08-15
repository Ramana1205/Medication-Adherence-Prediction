import React, { useEffect, useState } from 'react';
import { db } from '../store/db';

export const Interventions: React.FC = () => {
  const [interventions, setInterventions] = useState<any[]>([]);

  useEffect(() => {
    setInterventions(db.getInterventions());
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Interventions</h2>
      <div className="bg-white rounded shadow p-4">
        {interventions.length === 0 ? (
          <div className="text-slate-500">No interventions logged.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs">
              <tr><th>Patient</th><th>Intervention</th><th>Status</th><th>Created</th><th>Updated</th><th>Action</th></tr>
            </thead>
            <tbody>
              {interventions.map(i => (
                <tr key={i.intervention_id} className="border-t border-slate-100">
                  <td className="py-2 font-bold">{i.patient_name} <div className="text-xs text-slate-500">{i.patient_id}</div></td>
                  <td>{i.intervention_type}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs font-bold ${i.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : i.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{i.status}</span></td>
                  <td className="text-xs text-slate-500">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="text-xs text-slate-500">{new Date(i.updated_at).toLocaleString()}</td>
                  <td><button onClick={() => window.location.href = `/doctor/patient/${i.patient_id}`} className="text-blue-600">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};