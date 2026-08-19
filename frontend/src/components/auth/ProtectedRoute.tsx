import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, clearDoctorToken, clearPatientToken, getDoctorToken, getPatientToken } from '../../lib/api';
import { db } from '../../store/db';

type ProtectedRole = 'DOCTOR' | 'PATIENT';

export const ProtectedRoute: React.FC<{ role: ProtectedRole }> = ({ role }) => {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let active = true;
    const token = role === 'DOCTOR' ? getDoctorToken() : getPatientToken();
    const endpoint = role === 'DOCTOR' ? '/auth/doctor/me' : '/auth/patient/me';

    if (!token) {
      setState('denied');
      return;
    }

    void api.get<{ id: string; name: string; email?: string; role: ProtectedRole }>(endpoint)
      .then((session) => {
        const patientId = localStorage.getItem('active_patient_id');
        const validPatient = role === 'PATIENT' && patientId === session.id;
        if (session.role !== role || (role === 'PATIENT' && !validPatient)) throw new Error('Role mismatch');
        if (!active) return;
        if (role === 'DOCTOR') db.setAuthSession(session);
        setState('allowed');
      })
      .catch(() => {
        if (role === 'DOCTOR') {
          clearDoctorToken();
          db.clearAuthSession();
        } else {
          clearPatientToken();
          localStorage.removeItem('active_patient_id');
        }
        if (active) setState('denied');
      });

    return () => { active = false; };
  }, [role]);

  if (state === 'checking') {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">Checking authentication...</div>;
  }
  if (state === 'denied') {
    return <Navigate to={role === 'DOCTOR' ? '/doctor/login' : '/patient/auth'} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};