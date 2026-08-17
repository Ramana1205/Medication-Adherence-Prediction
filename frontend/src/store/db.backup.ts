import { Patient, Medication, MedicationSlot, MedicationEvent, RiskLevel, MedicationStatus, Message, Notification } from '../types';

const STORAGE_KEY = 'medadhere_db_v2';

interface DBState {
  patients: Patient[];
  medications: Medication[];
  slots: MedicationSlot[];
  events: MedicationEvent[];
  messages: Message[];
  notifications: Notification[];
  interventions: import('../types').Intervention[];
  // doctors list for local demo authentication
  doctors?: {
    doctor_id: string;
    name: string;
    email: string;
    password_hash: string;
    role?: string;
  }[];
}

import csvPatients from '../data/patients.json';

const frequencies = ['Morning', 'Afternoon', 'Evening', 'Twice daily', 'Three times daily'];
const times = ['08:00 AM', '01:00 PM', '08:00 PM'];
const medNames = ['Metformin 500mg', 'Atorvastatin 10mg', 'Lisinopril 20mg', 'Amlodipine 5mg', 'Levothyroxine 50mcg'];

const generateSyntheticData = (): DBState => {
  const patients: Patient[] = csvPatients as Patient[];
  const medications: Medication[] = [];
  const slots: MedicationSlot[] = [];
  const events: MedicationEvent[] = [];
  const messages: Message[] = [];
  const notifications: Notification[] = [];
  const interventions: import('../types').Intervention[] = [];
  const doctors = [] as any[];

  const today = new Date().toISOString().split('T')[0];

  // For each patient from CSV, generate medications to make the UI work
  for (const patient of patients) {
    const numMeds = patient.num_meds || 1;
    
    // For demo purposes, we randomly assign frequencies or use the raw features if we wanted
    const rawFreq = patient._raw_features?.daily_dose_frequency || 1;
    const freqString = rawFreq === 1 ? 'Morning' : (rawFreq === 2 ? 'Twice daily' : 'Three times daily');

    for (let j = 0; j < numMeds; j++) {
      const medId = `M${patient.patient_id.substring(1)}-${j}`;
      const scheduled_times = rawFreq >= 3 ? ['08:00 AM', '01:00 PM', '08:00 PM'] : 
                              rawFreq === 2 ? ['08:00 AM', '08:00 PM'] : 
                              ['08:00 AM'];

      medications.push({
        medicine_id: medId,
        patient_id: patient.patient_id,
        medicine_name: medNames[j % medNames.length],
        frequency: freqString,
        scheduled_times,
        start_date: '2025-01-01',
        end_date: '2026-01-01',
        quantity: 90,
        refill_interval: 30,
      });

      // Generate today's slots
      // Deterministic function to decide whether a past dose was TAKEN or SKIPPED
      const deterministicTaken = (patientId: string, dateStr: string, medIdx: number, timeIdx: number, priorAdh: number) => {
        // Create a simple deterministic hash from identifiers
        const key = `${patientId}|${dateStr}|${medIdx}|${timeIdx}`;
        let h = 0;
        for (let i = 0; i < key.length; i++) {
          h = ((h << 5) - h) + key.charCodeAt(i);
          h = h & h; // convert to 32bit int
        }
        const hash = Math.abs(h);
        // Map hash to [0,1)
        const rnd = (hash % 10000) / 10000;
        const threshold = (priorAdh || 0) / 100;
        return rnd < threshold;
      };

      scheduled_times.forEach((time, tIndex) => {
        const slotId = `S-${medId}-${tIndex}`;
        const isPast = parseInt(time.split(':')[0]) < 12 && time.includes('AM');
        let status: MedicationStatus = 'PENDING';

        if (isPast) {
          // Deterministic decision based on patient id, date and indices
          const didTake = deterministicTaken(patient.patient_id, today, j, tIndex, patient.prior_adherence || 0);
          status = didTake ? 'TAKEN' : 'SKIPPED';

          events.push({
            event_id: `E-${slotId}-${today}-${tIndex}`,
            patient_id: patient.patient_id,
            medicine_id: medId,
            slot_id: slotId,
            date: today,
            scheduled_time: time,
            status,
            skip_reason: status === 'SKIPPED' ? 'Forgot' : undefined,
            timestamp: new Date().toISOString()
          });
        }

        slots.push({
          slot_id: slotId,
          patient_id: patient.patient_id,
          medicine_id: medId,
          date: today,
          scheduled_time: time,
          status
        });
      });
    }
  }

  return { patients, medications, slots, events, messages, notifications, interventions, doctors } as DBState;
};

const AUTH_KEY = 'medadhere_auth_session';

class Database {
  private state: DBState;

  // Helper to create a timestamp
  private nowISO() { return new Date().toISOString(); }

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure backward compatibility if saved state lacks new fields
      this.state = {
        patients: parsed.patients || [],
        medications: parsed.medications || [],
        slots: parsed.slots || [],
        events: parsed.events || [],
        messages: parsed.messages || [],
        notifications: parsed.notifications || [],
        interventions: parsed.interventions || [],
        doctors: parsed.doctors || []
      } as DBState;
    } else {
      this.state = generateSyntheticData();
    }

    // Ensure deterministic demo patient and events for P004001 (seed once)
    try {
      this.ensureDemoPatientSeed();
    } catch (err) {
      // ignore seed errors
    }

    // Ensure interventions field exists for backward compatibility
    if (!Array.isArray((this.state as any).interventions)) (this.state as any).interventions = [];

    // Ensure doctors array exists and seed a demo doctor if missing
    if (!Array.isArray((this.state as any).doctors)) (this.state as any).doctors = [];
    const hasDoctor = (this.state as any).doctors.find((d:any) => d.doctor_id === 'DOC001');
    if (!hasDoctor) {
      const seedDoctor = {
        doctor_id: 'DOC001',
        name: 'Dr. Sarah Johnson',
        email: 'doctor@medadhere.ai',
        // lightweight demo 'hash' compatible with existing patient auth pattern
        password_hash: btoa('Doctor@123'),
        role: 'DOCTOR'
      };
      (this.state as any).doctors.push(seedDoctor);
    }

    this.persist();
  }
 
  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  // --- Patients ---
  getPatients() { return this.state.patients; }
  getPatient(id: string) { return this.state.patients.find(p => p.patient_id === id); }

  // --- Demo seed ---
  private ensureDemoPatientSeed() {
    const demoId = 'P004001';
    let changed = false;
    let demoPatient = this.getPatient(demoId);
    if (!demoPatient) {
      const newDemo: Patient = {
        patient_id: demoId,
        patient_name: 'Demo Patient',
        age: 58,
        gender: 'Female',
        chronic_conditions: 2,
        num_meds: 3,
        prior_adherence: 78,
        previous_missed_doses: 6,
        previous_missed_refills: 1,
        refill_gap_days: 20,
        risk_score: 60,
        risk_level: 'MEDIUM',
        created_at: new Date().toISOString()
      } as Patient;
      demoPatient = newDemo;
      this.state.patients.push(newDemo);
      changed = true;
    }

    // If events or medications already exist for demo patient, do nothing
    const existingEvents = this.state.events.find(e => e.patient_id === demoId);
    if (existingEvents) {
      if (changed) this.persist();
      return;
    }

    // Create three medications for the demo patient (deterministic)
    const meds: Partial<Medication>[] = [
      { medicine_name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', scheduled_times: ['08:00 AM', '08:00 PM'] },
      { medicine_name: 'Atorvastatin', dose: '10 mg', frequency: 'Once daily', scheduled_times: ['08:00 PM'] },
      { medicine_name: 'Lisinopril', dose: '20 mg', frequency: 'Once daily', scheduled_times: ['08:00 AM'] }
    ];

    meds.forEach((m) => this.addMedication(demoId, m));

    // Generate one month of events (last 30 days)
    const today = new Date();
    for (let d = 1; d <= 30; d++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      const dateStr = day.toISOString().split('T')[0];

      // For determinism, use day index to decide status
      this.getMedications(demoId).forEach((med, mIndex) => {
        med.scheduled_times.forEach((time, tIndex) => {
          // Deterministic pattern: skip every 4th morning dose, partial patterns for others
          const idx = d + mIndex + tIndex;
          let status: MedicationStatus = 'TAKEN';
          let skipReason: string | undefined = undefined;
          if (idx % 7 === 0) { status = 'SKIPPED'; skipReason = 'Forgot to take'; }
          else if (idx % 5 === 0) { status = 'SKIPPED'; skipReason = 'Partial adherence'; }
          else { status = 'TAKEN'; }

          this.addMedicationEvent(demoId, med.medicine_id, dateStr, time, status, skipReason);
        });
      });
    }

    this.recalculatePatient(demoId);
    this.persist();
  }

  // --- Messages & Notifications ---
  getMessages(patientId: string) { return this.state.messages.filter(m => m.patient_id === patientId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); }

  // --- Authentication helpers (doctor session) ---
  getAuthSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  setAuthSession(session: any) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  }

  clearAuthSession() {
    localStorage.removeItem(AUTH_KEY);
  }

  // Find a doctor by ID or email
  getDoctorByIdOrEmail(idOrEmail: string) {
    const docs = (this.state as any).doctors || [];
    return docs.find((d:any) => d.doctor_id === idOrEmail || d.email === idOrEmail);
  }

  authenticateDoctor(idOrEmail: string, password: string) {
    const doc = this.getDoctorByIdOrEmail(idOrEmail);
    if (!doc) return { success: false, error: 'not_found' };
    if (btoa(password) !== doc.password_hash) return { success: false, error: 'invalid_password' };
    // Successful - return session object
    const session = { id: doc.doctor_id, name: doc.name, email: doc.email, role: 'DOCTOR' };
    this.setAuthSession(session);
    return { success: true, session };
  }

  isDoctorAuthenticated() {
    const s = this.getAuthSession();
    return s && s.role === 'DOCTOR';
  }

  sendMessage(patientId: string, sender: 'patient'|'doctor', messageText: string) {
    const msg: Message = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      patient_id: patientId,
      sender,
      message: messageText,
      timestamp: this.nowISO(),
      read: false
    };
    this.state.messages.push(msg);

    const patient = this.getPatient(patientId);
    const patientName = patient ? patient.patient_name : patientId;

    // If patient sent a message, create a doctor notification
    if (sender === 'patient') {
      const notif: Notification = {
        id: `N-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        title: `New message from ${patientName}`,
        message: messageText.slice(0, 120),
        patient_id: patientId,
        timestamp: this.nowISO(),
        read: false,
        for_role: 'doctor'
      } as any;
      this.state.notifications.push(notif);
    }

    // If doctor sent a message, create a patient notification
    if (sender === 'doctor') {
      // Use authenticated doctor's name if available
      const auth = this.getAuthSession();
      const doctorName = auth && auth.name ? auth.name : 'Dr. Sharma';
      const notif: Notification = {
        id: `N-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        title: `New message from ${doctorName}`,
        message: messageText.slice(0, 120),
        patient_id: patientId,
        timestamp: this.nowISO(),
        read: false,
        for_role: 'patient'
      } as any;
      this.state.notifications.push(notif);
    }

    this.persist();
    return msg;
  }

  getNotifications() { return this.state.notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); }

  getAllMessages() { return this.state.messages.slice(); }

  // Optional patientId filters the count for that patient, otherwise returns system-wide count
  getUnreadNotificationCount(patientId?: string) { return this.state.notifications.filter(n => !n.read && (patientId ? n.patient_id === patientId : true)).length; }

  markNotificationRead(id: string) {
    const n = this.state.notifications.find(nf => nf.id === id);
    if (!n) return;
    n.read = true;
    this.persist();
  }

  // Mark all notifications read globally (existing behavior)
  markAllNotificationsRead() {
    this.state.notifications.forEach(n => n.read = true);
    this.persist();
  }

  // Mark all notifications targeted to a specific patient as read
  markAllNotificationsReadForPatient(patientId: string) {
    this.state.notifications.forEach(n => { if (n.patient_id === patientId) n.read = true; });
    this.persist();
  }

  // Mark all notifications targeted to a given role (doctor/patient) as read
  markAllNotificationsReadForRole(role: 'doctor'|'patient') {
    this.state.notifications.forEach(n => { if (!n.for_role || n.for_role === role) n.read = true; });
    this.persist();
  }

  // --- Interventions ---
  addIntervention(patientId: string, intervention_type: string, description?: string, doctor = 'Dr. Sharma') {
    const patient = this.getPatient(patientId);
    const intervention: import('../types').Intervention = {
      intervention_id: `I-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      patient_id: patientId,
      patient_name: patient ? patient.patient_name : patientId,
      doctor,
      intervention_type,
      description,
      status: 'IN_PROGRESS',
      created_at: this.nowISO(),
      updated_at: this.nowISO()
    };
    (this.state as any).interventions.push(intervention);
    this.persist();
    return intervention;
  }

  getInterventions() { return (this.state as any).interventions.slice().sort((a:any,b:any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()); }

  updateInterventionStatus(interventionId: string, status: 'PENDING'|'IN_PROGRESS'|'COMPLETED') {
    const ints = (this.state as any).interventions as import('../types').Intervention[];
    const it = ints.find(i => i.intervention_id === interventionId);
    if (!it) return;
    it.status = status;
    it.updated_at = this.nowISO();
    this.persist();
  }

  // --- Medication helpers ---
  addMedication(patientId: string, med: Partial<Medication>) {
    const medId = `M${patientId.substring(1)}-${this.state.medications.filter(m => m.patient_id === patientId).length}`;
    const newMed: Medication = {
      medicine_id: medId,
      patient_id: patientId,
      medicine_name: med.medicine_name || 'Unknown',
      dose: med.dose || undefined,
      frequency: med.frequency || 'Once daily',
      scheduled_times: med.scheduled_times || ['08:00 AM'],
      start_date: med.start_date || new Date().toISOString().split('T')[0],
      end_date: med.end_date || new Date(new Date().getTime() + 1000*60*60*24*30).toISOString().split('T')[0],
      quantity: med.quantity || 30,
      refill_interval: med.refill_interval || 30,
      active: med.active !== undefined ? med.active : true
    };
    this.state.medications.push(newMed);
    this.persist();
    return newMed;
  }

  addMedicationEvent(patientId: string, medicationId: string, date: string, scheduled_time: string, status: MedicationStatus, skipReason?: string) {
    const event: MedicationEvent = {
      event_id: `E-${medicationId}-${date}-${scheduled_time.replace(/[: ]/g,'')}`,
      patient_id: patientId,
      medicine_id: medicationId,
      slot_id: `S-${medicationId}-${date}-${scheduled_time}`,
      date,
      scheduled_time,
      status,
      skip_reason: skipReason,
      timestamp: this.nowISO()
    };
    this.state.events.push(event);
    this.persist();
    return event;
  }


  updatePatientPrediction(
    patientId: string,
    prediction: {
      risk_score?: number; // compatibility: stored non-adherence percentage
      risk_level?: RiskLevel;
      adherence_probability?: number; // 0-1
      non_adherence_risk?: number; // 0-1
      risk_percentage?: number; // 0-100
      risk_factors?: string[];
      protective_factors?: string[];
      recommendations?: string[];
    }
  ) {
    const patient = this.state.patients.find(p => p.patient_id === patientId);
    if (!patient) return null;

    if (typeof prediction.risk_score === 'number') patient.risk_score = prediction.risk_score;
    if (prediction.risk_level) patient.risk_level = prediction.risk_level;

    // Store model outputs separately and do NOT overwrite historical prior_adherence
    if (typeof prediction.adherence_probability === 'number') patient.adherence_probability = prediction.adherence_probability;
    if (typeof prediction.non_adherence_risk === 'number') patient.non_adherence_risk = prediction.non_adherence_risk;
    if (typeof prediction.risk_percentage === 'number') patient.risk_percentage = prediction.risk_percentage;

    if (prediction.risk_factors) patient.risk_factors = prediction.risk_factors;
    if (prediction.protective_factors) patient.protective_factors = prediction.protective_factors;
    if (prediction.recommendations) patient.recommendations = prediction.recommendations;

    this.persist();
    return patient;
  }
  
  authenticatePatient(patientId: string, password?: string): Patient | null {
    const patient = this.state.patients.find(p => p.patient_id === patientId);
    if (!patient) return null;
    // In a real app we'd compare hashes. For the hackathon demo:
    // 1. If patient has no password (synthetic old data), just let them in (demo mode)
    // 2. If patient has password_hash, compare it.
    if (patient.password_hash && password) {
      if (btoa(password) !== patient.password_hash) return null;
    }
    return patient;
  }

  generatePatientId(): string {
    // Generate a unique ID like P004001
    const highestNum = this.state.patients
      .map(p => parseInt(p.patient_id.substring(1)))
      .filter(n => !isNaN(n))
      .reduce((max, cur) => Math.max(max, cur), 0);
    
    // Jump to 4001 for new patients if highest is low, just to make it distinct as requested in PRD
    const nextNum = Math.max(highestNum + 1, 4001);
    return `P${nextNum.toString().padStart(6, '0')}`;
  }

  registerNewPatient(patientData: Partial<Patient>, password?: string, medsCount: number = 1, doseFreq: string = 'Morning', medicationsList?: Partial<Medication>[]): Patient {
    // 1. Generate a new unique ID for the patient
    const newId = this.generatePatientId();
    
    // 2. Mock Machine Learning Risk Calculation
    // In a production environment, this is where you would send the patientData._raw_features 
    // to your Python ML Backend (e.g. via fetch('https://api.medadhere.ai/predict'))
    // For this prototype, we simulate the ML output using a basic algorithm:
    const adherence = patientData.prior_adherence || 100;
    const refillGap = patientData.refill_gap_days || 0;
    const missed = patientData.previous_missed_doses || 0;
    
    // The higher the refill gap and missed doses, the higher the risk score (0-100 scale)
    const riskScore = Math.min(100, Math.max(0, 100 - adherence + (refillGap * 2) + (missed * 5)));
    
    // Classify into actionable tiers for the Doctor Dashboard
    const riskLevel: RiskLevel = riskScore > 75 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

    const newPatient: Patient = {
      patient_id: newId,
      patient_name: patientData.patient_name || 'New Patient',
      age: patientData.age || 0,
      gender: patientData.gender || 'Unknown',
      chronic_conditions: patientData.chronic_conditions || 0,
      num_meds: medsCount,
      prior_adherence: adherence,
      previous_missed_doses: missed,
      previous_missed_refills: patientData.previous_missed_refills || 0,
      refill_gap_days: refillGap,
      risk_score: riskScore,
      risk_level: riskLevel,
      password_hash: password ? btoa(password) : undefined,
      created_at: new Date().toISOString()
    };

    this.state.patients.push(newPatient);

    // Generate mock medications based on their inputs for the dashboard to function
    const today = new Date().toISOString().split('T')[0];
    const medNames = ['Metformin 500mg', 'Atorvastatin 10mg', 'Lisinopril 20mg'];
    const times = ['08:00 AM', '01:00 PM', '08:00 PM'];
    
    if (medicationsList && medicationsList.length > 0) {
      // Use provided medications instead of auto-generating
      medicationsList.forEach((m, idx) => {
        const scheduled_times = m.scheduled_times || (doseFreq.includes('Twice') ? ['08:00 AM', '08:00 PM'] : doseFreq.includes('Three') ? ['08:00 AM','01:00 PM','08:00 PM'] : ['08:00 AM']);
        const medId = `M${newId.substring(1)}-${idx}`;
        this.state.medications.push({
          medicine_id: medId,
          patient_id: newId,
          medicine_name: m.medicine_name || `Medication ${idx+1}`,
          dose: m.dose,
          frequency: m.frequency || doseFreq,
          scheduled_times,
          start_date: m.start_date || '2025-01-01',
          end_date: m.end_date || '2026-01-01',
          quantity: m.quantity || 90,
          refill_interval: m.refill_interval || 30,
          active: m.active !== undefined ? m.active : true
        });

        // Generate today's slots as pending
        scheduled_times.forEach((time, tIndex) => {
          const slotId = `S-${medId}-${tIndex}`;
          this.state.slots.push({
            slot_id: slotId,
            patient_id: newId,
            medicine_id: medId,
            date: today,
            scheduled_time: time,
            status: 'PENDING'
          });
        });
      });
    } else {
      for (let j = 0; j < medsCount; j++) {
        const medId = `M${newId.substring(1)}-${j}`;
        const scheduled_times = doseFreq.includes('Twice') ? ['08:00 AM', '08:00 PM'] : 
                                doseFreq.includes('Three') ? ['08:00 AM', '01:00 PM', '08:00 PM'] : 
                                ['08:00 AM'];

        this.state.medications.push({
          medicine_id: medId,
          patient_id: newId,
          medicine_name: medNames[j % medNames.length],
          frequency: doseFreq,
          scheduled_times,
          start_date: '2025-01-01',
          end_date: '2026-01-01',
          quantity: 90,
          refill_interval: 30,
        });

        // Generate today's slots as pending
        scheduled_times.forEach((time, tIndex) => {
          const slotId = `S-${medId}-${tIndex}`;
          this.state.slots.push({
            slot_id: slotId,
            patient_id: newId,
            medicine_id: medId,
            date: today,
            scheduled_time: time,
            status: 'PENDING'
          });
        });
      }
    }

    this.persist();
    return newPatient;
  }
  
  // --- Medications ---
  getMedications(patientId: string) { return this.state.medications.filter(m => m.patient_id === patientId); }
  
  // --- Slots ---
  getTodaySlots(patientId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.state.slots.filter(s => s.patient_id === patientId && s.date === today);
  }

  // Return medication events for a given patient on a specific date (YYYY-MM-DD)
  getEventsForPatientOnDate(patientId: string, date: string) {
    return this.state.events.filter(e => e.patient_id === patientId && e.date === date);
  }

  // --- Actions ---
  logMedicationEvent(slotId: string, status: MedicationStatus, skipReason?: string) {
    const slotIndex = this.state.slots.findIndex(s => s.slot_id === slotId);
    if (slotIndex === -1) return;

    const slot = this.state.slots[slotIndex];
    slot.status = status;

    const event: MedicationEvent = {
      event_id: `E-${slotId}-${Date.now()}`,
      patient_id: slot.patient_id,
      medicine_id: slot.medicine_id,
      slot_id: slot.slot_id,
      date: slot.date,
      scheduled_time: slot.scheduled_time,
      status,
      skip_reason: skipReason,
      timestamp: new Date().toISOString()
    };

    this.state.events.push(event);
    this.recalculatePatient(slot.patient_id);
    this.persist();
  }

  private recalculatePatient(patientId: string) {
    const patientIndex = this.state.patients.findIndex(p => p.patient_id === patientId);
    if (patientIndex === -1) return;

    const patient = this.state.patients[patientIndex];
    const patientEvents = this.state.events.filter(e => e.patient_id === patientId);
    
    // This function simulates how an ML model would continuously evaluate risk based on new daily data.
    // We calculate how many meds they took vs skipped today.
    const taken = patientEvents.filter(e => e.status === 'TAKEN').length;
    const skipped = patientEvents.filter(e => e.status === 'SKIPPED').length;
    const total = taken + skipped;

    if (total > 0) {
      // Calculate a live adherence estimate based on persisted events (do NOT overwrite historical prior_adherence)
      const todayAdherence = (taken / total) * 100;
      // Store live adherence separately so ML inputs remain unchanged
      (patient as any).live_adherence_estimate = Math.round(todayAdherence * 100) / 100; // keep two decimals

      // Do not modify prior_adherence (historical feature) or ML outputs here.
      // Update running counters such as previous_missed_doses to reflect reality
      patient.previous_missed_doses = (patient.previous_missed_doses || 0) + skipped;
    }
  }
}

export const db = new Database();
