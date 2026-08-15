import React, { useEffect, useState } from 'react';
import { db } from '../store/db';
import { Message } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

export const DoctorMessages: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  const location = useLocation();

  useEffect(() => {
    const allMsgs = db.getAllMessages();
    const patientIds = Array.from(new Set(allMsgs.map((m:any) => m.patient_id))) as string[];
    setConversations(patientIds);

    // Auto-select from query param ?patient=
    const q = new URLSearchParams(location.search);
    const pid = q.get('patient');
    if (pid) setSelectedPatient(pid);
  }, [location.search]);

  useEffect(() => {
    if (selectedPatient) {
      setMessages(db.getMessages(selectedPatient));
    }
  }, [selectedPatient]);

  const openConversation = (patientId: string) => {
    setSelectedPatient(patientId);
  };

  const sendReply = () => {
    if (!selectedPatient || !text.trim()) return;
    db.sendMessage(selectedPatient, 'doctor', text.trim());
    setText('');
    setMessages(db.getMessages(selectedPatient));
  };

  const patients = db.getPatients();
  const filtered = patients
    .filter(p => p.patient_id.includes(search) || p.patient_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      // Prioritize those with existing messages
      const aHas = conversations.includes(a.patient_id) ? 0 : 1;
      const bHas = conversations.includes(b.patient_id) ? 0 : 1;
      return aHas - bHas || a.patient_name.localeCompare(b.patient_name);
    });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Doctor Messages</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Patients</h3>
            <input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="text-xs p-1 border rounded" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500">No patients found.</div>
          ) : (
            filtered.map(p => (
              <div key={p.patient_id} className={`p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between ${selectedPatient === p.patient_id ? 'bg-blue-50' : ''}`} onClick={() => openConversation(p.patient_id)}>
                <div>
                  <div className="font-bold">{p.patient_name}</div>
                  <div className="text-xs text-slate-400">{p.patient_id}</div>
                </div>
                <div className="text-xs text-slate-400">{conversations.includes(p.patient_id) ? 'Conversation' : 'Start'}</div>
              </div>
            ))
          )}
        </div>

        <div className="md:col-span-2 bg-white rounded p-4">
          {!selectedPatient ? (
            <div className="text-sm text-slate-500">Select a patient to open or start a conversation.</div>
          ) : (
            <>
              <div className="mb-3 font-semibold">Conversation: {selectedPatient}</div>
              <div className="max-h-96 overflow-auto mb-4">
                {messages.map(m => (
                  <div key={m.id} className={`mb-3 ${m.sender === 'patient' ? 'text-left' : 'text-right'}`}>
                    <div className={`inline-block p-2 rounded ${m.sender === 'patient' ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'}`}>
                      {m.message}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(m.timestamp).toLocaleString()}</div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-sm text-slate-500">No messages yet. Start the conversation with this patient.</div>
                )}
              </div>

              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border p-2 rounded" placeholder="Type message..." />
                <button onClick={sendReply} className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
                <button onClick={() => navigate(`/doctor/patient/${selectedPatient}`)} className="bg-white border px-3 py-2 rounded">View Patient</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
