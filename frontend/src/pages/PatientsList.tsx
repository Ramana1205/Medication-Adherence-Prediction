import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { Patient, RiskLevel } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Search, Plus, UserPlus, X } from 'lucide-react';

export const PatientsList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setPatients(db.getPatients());
  }, []);

  const filteredPatients = patients
    .filter(p => p.patient_name.toLowerCase().includes(search.toLowerCase()) || p.patient_id.toLowerCase().includes(search.toLowerCase()))
    .filter(p => riskFilter === 'ALL' || p.risk_level === riskFilter)
    .sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">My Patients</h1>
        <Button className="bg-[#1e3a8a] hover:bg-[#172e6e]" onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" /> Add Patient
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Search by Patient ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-slate-500">Filter Risk:</span>
            <select 
              className="border border-slate-300 rounded-lg text-sm p-2 focus:outline-none focus:border-blue-500 bg-white"
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
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => navigate(`/doctor/patient/${p.patient_id}`)}>
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

      {/* Add Patient Modal (Simplified Demo) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><UserPlus className="text-blue-600" /> Add New Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" className="w-full border-slate-300 rounded-md border p-2 text-sm focus:border-blue-500 outline-none" placeholder="e.g. Ramana K." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Age</label>
                  <input type="number" className="w-full border-slate-300 rounded-md border p-2 text-sm focus:border-blue-500 outline-none" placeholder="e.g. 65" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select className="w-full border-slate-300 rounded-md border p-2 text-sm focus:border-blue-500 outline-none">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Chronic Conditions</label>
                  <input type="number" className="w-full border-slate-300 rounded-md border p-2 text-sm focus:border-blue-500 outline-none" defaultValue="1" />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mt-4">
                Note: This is a simplified demo form. In a real system, submitting this would auto-generate a Patient ID (e.g. P0101) and allow you to proceed to add medications.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="bg-[#1e3a8a] hover:bg-[#172e6e]" onClick={() => setShowAddModal(false)}>Create Patient</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
