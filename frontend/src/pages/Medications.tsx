import React, { useEffect, useState } from 'react';
import { db } from '../store/db';

export const Medications: React.FC = () => {
  const [meds, setMeds] = useState<any[]>([]);

  useEffect(() => {
    // collect all medications
    const all = (db as any).state?.medications || [];
    setMeds(all);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Medications</h2>
      <div className="bg-white rounded shadow p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 text-xs">
            <tr>
              <th className="py-2">Patient</th>
              <th>Medicine</th>
              <th>Frequency</th>
              <th>Refill Interval</th>
            </tr>
          </thead>
          <tbody>
            {meds.map(m => (
              <tr key={m.medicine_id} className="border-t border-slate-100">
                <td className="py-2 font-bold">{m.patient_id}</td>
                <td>{m.medicine_name}</td>
                <td>{m.frequency}</td>
                <td>{m.refill_interval} days</td>
              </tr>
            ))}
            {meds.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-500">No medication data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
