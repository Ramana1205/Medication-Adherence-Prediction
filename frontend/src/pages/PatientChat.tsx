import React, { useEffect, useState } from 'react';
import { db } from '../store/db';
import { Message } from '../types';
import { useNavigate } from 'react-router-dom';

export const PatientChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const activeId = localStorage.getItem('active_patient_id');

  useEffect(() => {
    if (!activeId) { navigate('/patient/auth'); return; }
    setMessages(db.getMessages(activeId));
  }, []);

  const send = () => {
    if (!text.trim() || !activeId) return;
    db.sendMessage(activeId, 'patient', text.trim());
    setText('');
    setMessages(db.getMessages(activeId));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Chat with your Doctor</h2>
      <div className="border rounded-lg bg-white p-4 max-w-2xl">
        <div className="max-h-80 overflow-auto mb-4">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500">No messages yet. Use the box below to send a message to your doctor.</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`mb-3 ${m.sender === 'patient' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded ${m.sender === 'patient' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.message}
                </div>
                <div className="text-xs text-slate-400 mt-1">{new Date(m.timestamp).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border p-2 rounded" placeholder="Type your message" />
          <button onClick={send} className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
        </div>
      </div>
    </div>
  );
};
