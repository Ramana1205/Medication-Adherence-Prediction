import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { Patient } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Users, AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    setPatients(db.getPatients());
  }, []);

  if (patients.length === 0) return <div>Loading...</div>;

  // KPI Calculations based on CSV dataset metrics
  const totalPatients = patients.length;
  // risk_level is derived from the CSV `adherent` and `prior_year_adherence` columns
  const highRisk = patients.filter(p => p.risk_level === 'HIGH');
  const mediumRisk = patients.filter(p => p.risk_level === 'MEDIUM');
  const lowRisk = patients.filter(p => p.risk_level === 'LOW');
  
  // Average Adherence based on CSV `prior_year_adherence`
  const totalAdherence = patients.reduce((acc, p) => acc + p.prior_adherence, 0);
  const avgAdherence = (totalAdherence / totalPatients).toFixed(1);

  // Patients Needing Attention (Flags High risk, or CSV features: missed_doses_recent > 2 or refill_gap_days > 7)
  const needingAttention = patients.filter(p => p.risk_level === 'HIGH' || p.previous_missed_doses > 2 || p.refill_gap_days > 7);

  // Data for Donut Chart
  const riskData = [
    { name: 'High Risk', value: highRisk.length, color: '#ef4444' },
    { name: 'Medium Risk', value: mediumRisk.length, color: '#f59e0b' },
    { name: 'Low Risk', value: lowRisk.length, color: '#10b981' },
  ];

  // Dummy Trend Data
  const trendData = Array.from({length: 6}).map((_, i) => ({
    name: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i],
    previous: 70 + Math.random() * 10,
    recent: 72 + Math.random() * 10 + (i * 2)
  }));

  // Early Warning Alerts (Mocked based on data)
  const alerts = needingAttention.slice(0, 3).map(p => ({
    id: p.patient_id,
    name: p.patient_name,
    prevAdherence: p.prior_adherence + Math.floor(Math.random() * 15),
    currentAdherence: p.prior_adherence,
    priority: p.risk_level,
    reason: p.refill_gap_days > 7 ? 'Refill gap > 7 days' : 'Frequent missed doses'
  }));

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Patients</p>
                <h3 className="text-3xl font-bold text-slate-800">{totalPatients.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-4 flex items-center gap-1"><TrendingUp size={12} className="text-green-500"/> +12 this week</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 border-t-4 border-t-red-500">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">High Risk</p>
                <h3 className="text-3xl font-bold text-slate-800">{highRisk.length}</h3>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ShieldAlert size={20} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-4">{((highRisk.length / totalPatients) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 border-t-4 border-t-amber-500">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Medium Risk</p>
                <h3 className="text-3xl font-bold text-slate-800">{mediumRisk.length}</h3>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-4">{((mediumRisk.length / totalPatients) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 border-t-4 border-t-green-500">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Low Risk</p>
                <h3 className="text-3xl font-bold text-slate-800">{lowRisk.length}</h3>
              </div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><ShieldCheck size={20} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-4">{((lowRisk.length / totalPatients) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Avg Adherence</p>
                <h3 className="text-3xl font-bold text-slate-800">{avgAdherence}%</h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-4 flex items-center gap-1"><TrendingUp size={12} className="text-green-500"/> +2.3% vs last month</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-red-50/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-red-600 font-medium uppercase tracking-wider mb-1">Needs Attention</p>
                <h3 className="text-3xl font-bold text-red-700">{needingAttention.length}</h3>
              </div>
              <div className="p-2 bg-red-100 text-red-700 rounded-full animate-pulse"><AlertTriangle size={20} /></div>
            </div>
            <p className="text-xs text-red-600 mt-4 font-medium">Requires intervention</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Risk Distribution */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-0 flex flex-row items-center justify-between border-b border-slate-100 mb-4">
            <CardTitle className="text-base font-bold text-slate-800">Risk Distribution</CardTitle>
            <button className="text-xs font-semibold text-blue-600 hover:underline">View All</button>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                    {riskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1 ml-6">
              {riskData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{d.value} <span className="text-xs text-slate-400 font-normal">({((d.value/totalPatients)*100).toFixed(1)}%)</span></span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="font-medium text-slate-600">Total</span>
                <span className="font-bold text-slate-800">{totalPatients}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adherence Trend */}
        <Card className="shadow-sm border-slate-200 lg:col-span-2">
          <CardHeader className="pb-0 flex flex-row items-center justify-between border-b border-slate-100 mb-4">
            <CardTitle className="text-base font-bold text-slate-800">Adherence Trend <span className="text-slate-400 font-normal text-sm ml-1">(Monthly)</span></CardTitle>
            <select className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-slate-50">
              <option>Last 6 Months</option>
              <option>Last 12 Months</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Previous Adherence" />
                  <Line type="monotone" dataKey="recent" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} name="Recent Adherence" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-slate-400"></div> Previous Adherence</span>
              <span className="flex items-center gap-1.5"><div className="w-4 h-1 bg-blue-500 rounded-full"></div> Recent Adherence</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Early Warning Alerts */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">Early Warning Alerts</CardTitle>
            <button className="text-xs font-semibold text-blue-600 hover:underline">View All Alerts</button>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 text-xs">
                <tr>
                  <th className="py-3 px-4 font-semibold">Patient</th>
                  <th className="py-3 px-4 font-semibold">Prev/Curr Adherence</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold text-right">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate(`/doctor/patient/${a.id}`)}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{a.id}</p>
                      <p className="text-xs text-slate-500">{a.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{a.prevAdherence}%</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="font-bold text-red-600">{a.currentAdherence}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        a.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 text-right">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* High-Risk Patients */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">High-Risk Patients <span className="text-slate-400 font-normal text-sm ml-1">(Top 5)</span></CardTitle>
            <button className="text-xs font-semibold text-blue-600 hover:underline">View All</button>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 text-xs">
                <tr>
                  <th className="py-3 px-4 font-semibold">Patient ID</th>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Adherence</th>
                  <th className="py-3 px-4 font-semibold">Risk Score</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highRisk.slice(0, 5).sort((a,b) => b.risk_score - a.risk_score).map(p => (
                  <tr key={p.patient_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{p.patient_id}</td>
                    <td className="py-3 px-4 text-slate-600">{p.patient_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.prior_adherence}%</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-red-600">{p.risk_score}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => navigate(`/doctor/patient/${p.patient_id}`)} className="text-xs font-bold text-blue-600 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
