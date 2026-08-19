import { Patient, Medication, MedicationSlot, MedicationEvent, RiskLevel, MedicationStatus, Message, Notification } from '../types';
import { api, getDoctorToken, getPatientToken } from '../lib/api';

interface DBState {
  patients: Patient[];
  medications: Medication[];
  slots: MedicationSlot[];
  events: MedicationEvent[];
  messages: Message[];
  notifications: Notification[];
  interventions: import('../types').Intervention[];
  doctors?: {
    doctor_id: string;
    name: string;
    email: string;
    password_hash: string;
    role?: string;
  }[];
}

import csvPatients from '../data/patients.json';

const AUTH_KEY = 'medadhere_auth_session';

const seedDoctor = {
  doctor_id: 'DOC001',
  name: 'Dr. Sharma',
  email: 'doctor@medadhere.ai',
  password_hash: btoa('Doctor@123'),
  role: 'DOCTOR'
};

const buildFallbackState = (): DBState => ({
  patients: csvPatients as Patient[],
  medications: [],
  slots: [],
  events: [],
  messages: [],
  notifications: [],
  interventions: [],
  doctors: [seedDoctor]
});

class Database {
  private state: DBState;

  private nowISO() { return new Date().toISOString(); }

  constructor() {
    this.state = buildFallbackState();
    this.loadSharedData();
  }

  private async loadSharedData() {
    // Protected API hydration waits until a signed session exists.
    if (!getDoctorToken() && !getPatientToken()) return;
    try {
      const [patients, notifications, messages, interventions] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<Notification[]>('/notifications').catch(() => this.state.notifications),
        api.get<Message[]>('/messages').catch(() => this.state.messages),
        api.get<any[]>('/interventions').catch(() => this.state.interventions)
      ]);

      this.state.patients = patients;
      this.state.notifications = notifications || this.state.notifications;
      this.state.messages = messages || this.state.messages;
      this.state.interventions = interventions || this.state.interventions;
      await Promise.all([
        this.refreshAllMedications(),
        this.refreshAllEvents(),
      ]);
    } catch (error) {
      console.error('Unable to load shared data from backend.', error);
    }
  }

  async loadPatients(): Promise<Patient[]> {
    const patients = await api.get<Patient[]>('/patients');
    this.state.patients = patients;
    return patients;
  }

  async loadInterventions(): Promise<import('../types').Intervention[]> {
    const interventions = await api.get<import('../types').Intervention[]>('/interventions');
    this.state.interventions = interventions;
    return interventions;
  }

  async fetchPatientById(patientId: string): Promise<Patient | null> {
    try {
      const patient = await api.get<Patient>(`/patients/${patientId}`);
      if (!patient) return null;
      const existing = this.state.patients.find(p => p.patient_id === patientId);
      if (existing) {
        Object.assign(existing, patient);
      } else {
        this.state.patients.push(patient);
      }
      return patient;
    } catch (error) {
      console.warn(`Failed to fetch patient ${patientId} from backend:`, error);
      return this.getPatient(patientId) || null;
    }
  }

  async refreshAllMedications(): Promise<Medication[]> {
    const patientIds = this.state.patients.map(p => p.patient_id);
    if (!patientIds.length) {
      this.state.medications = [];
      return [];
    }

    try {
      const medicationLists = await Promise.all(
        patientIds.map(patientId =>
          api.get<Medication[]>(`/patients/${patientId}/medications`).catch(() => this.state.medications.filter(m => m.patient_id === patientId))
        )
      );
      const allMeds = medicationLists.flat();
      this.state.medications = allMeds;
      return allMeds;
    } catch (error) {
      console.warn('Unable to refresh medications from backend:', error);
      return this.state.medications.slice();
    }
  }

  async refreshAllEvents(): Promise<MedicationEvent[]> {
    const patientIds = this.state.patients.map(p => p.patient_id);
    if (!patientIds.length) {
      this.state.events = [];
      return [];
    }

    try {
      const eventLists = await Promise.all(
        patientIds.map(patientId =>
          api.get<MedicationEvent[]>(`/patients/${patientId}/events`).catch(() => this.state.events.filter(e => e.patient_id === patientId))
        )
      );
      const allEvents = eventLists.flat();
      this.state.events = allEvents;
      return allEvents;
    } catch (error) {
      console.warn('Unable to refresh medication events from backend:', error);
      return this.state.events.slice();
    }
  }

  async refreshPatientMedications(patientId: string): Promise<Medication[]> {
    try {
      const meds = await api.get<Medication[]>(`/patients/${patientId}/medications`);
      this.state.medications = this.state.medications.filter(m => m.patient_id !== patientId).concat(meds || []);
      return meds || [];
    } catch (error) {
      console.warn(`Failed to refresh medications for patient ${patientId}:`, error);
      return this.state.medications.filter(m => m.patient_id === patientId);
    }
  }

  async refreshPatientEvents(patientId: string): Promise<MedicationEvent[]> {
    try {
      const events = await api.get<MedicationEvent[]>(`/patients/${patientId}/events`);
      this.state.events = this.state.events.filter(e => e.patient_id !== patientId).concat(events || []);
      return events || [];
    } catch (error) {
      console.warn(`Failed to refresh medication events for patient ${patientId}:`, error);
      return this.state.events.filter(e => e.patient_id === patientId);
    }
  }

  private syncStateFromPatientData(patientId: string) {
    const patient = this.getPatient(patientId);
    if (!patient) return;
    this.state.patients = this.state.patients.filter(p => p.patient_id !== patientId);
    this.state.patients.push(patient);
  }

  getPatients() { return this.state.patients; }
  getPatient(id: string) { return this.state.patients.find(p => p.patient_id === id); }

  async getMessages(patientId: string): Promise<Message[]> {
    try {
      const messages = await api.get<Message[]>(`/patients/${patientId}/messages`);
      // Replace local messages for this patient with backend messages
      this.state.messages = this.state.messages.filter(m => m.patient_id !== patientId).concat(messages || []);
      return (messages || []).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.warn(`Failed to fetch messages for patient ${patientId}:`, error);
      // Return cached messages on error
      const cached = this.state.messages.filter(m => m.patient_id === patientId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return cached;
    }
  }

  async getAllMessages(): Promise<Message[]> {
    try {
      const messages = await api.get<Message[]>('/messages');
      this.state.messages = messages || [];
      return messages || [];
    } catch (error) {
      console.error('Failed to fetch all messages:', error);
      throw error;
    }
  }

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

  getDoctorByIdOrEmail(idOrEmail: string) {
    const docs = this.state.doctors || [];
    return docs.find((d:any) => d.doctor_id === idOrEmail || d.email === idOrEmail);
  }

  authenticateDoctor(idOrEmail: string, password: string) {
    const doc = this.getDoctorByIdOrEmail(idOrEmail);
    if (!doc) return { success: false, error: 'not_found' };
    if (btoa(password) !== doc.password_hash) return { success: false, error: 'invalid_password' };
    const session = { id: doc.doctor_id, name: doc.name, email: doc.email, role: 'DOCTOR' };
    this.setAuthSession(session);
    return { success: true, session };
  }

  isDoctorAuthenticated() {
    const s = this.getAuthSession();
    return s && s.role === 'DOCTOR';
  }

  async sendMessage(patientId: string, sender: 'patient'|'doctor', messageText: string): Promise<Message> {
    // Create optimistic message for UI feedback
    const optimisticMsg: Message = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patient_id: patientId,
      sender,
      message: messageText,
      timestamp: this.nowISO(),
      read: false,
    };

    this.state.messages.push(optimisticMsg);
    const patient = this.getPatient(patientId);
    const patientName = patient ? patient.patient_name : patientId;

    // Create notification
    if (sender === 'patient') {
      const notif: Notification = {
        id: `N-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `New message from ${patientName}`,
        message: messageText.slice(0, 120),
        patient_id: patientId,
        timestamp: this.nowISO(),
        read: false,
        for_role: 'doctor'
      } as any;
      this.state.notifications.push(notif);
    }

    if (sender === 'doctor') {
      const auth = this.getAuthSession();
      const doctorName = auth && auth.name ? auth.name : 'Dr. Sharma';
      const notif: Notification = {
        id: `N-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `New message from ${doctorName}`,
        message: messageText.slice(0, 120),
        patient_id: patientId,
        timestamp: this.nowISO(),
        read: false,
        for_role: 'patient'
      } as any;
      this.state.notifications.push(notif);
    }

    try {
      // Send to backend
      const serverMsg = await api.post<Message>('/messages', {
        patient_id: patientId,
        sender,
        message: messageText,
        timestamp: optimisticMsg.timestamp,
        read: false,
      });

      // Replace optimistic message with server version
      this.state.messages = this.state.messages.filter(m => m.id !== optimisticMsg.id);
      this.state.messages.push(serverMsg);
      return serverMsg;
    } catch (error) {
      console.warn('Failed to send message to backend:', error);
      // Keep optimistic message in state for offline support
      return optimisticMsg;
    }
  }

  getNotifications() {
    return this.state.notifications.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getUnreadNotificationCount(patientId?: string) {
    return this.state.notifications.filter(n => !n.read && (patientId ? n.patient_id === patientId : true)).length;
  }

  markNotificationRead(id: string) {
    const n = this.state.notifications.find(nf => nf.id === id);
    if (!n) return;
    n.read = true;
    void api.put(`/notifications/${id}/read`).catch(() => undefined);
  }

  markAllNotificationsRead() {
    this.state.notifications.forEach(n => { n.read = true; });
    this.state.notifications.forEach(n => {
      if (n.id) void api.put(`/notifications/${n.id}/read`).catch(() => undefined);
    });
  }

  markAllNotificationsReadForPatient(patientId: string) {
    this.state.notifications.forEach(n => { if (n.patient_id === patientId) n.read = true; });
    this.state.notifications.forEach(n => {
      if (n.patient_id === patientId && n.id) void api.put(`/notifications/${n.id}/read`).catch(() => undefined);
    });
  }

  markAllNotificationsReadForRole(role: 'doctor'|'patient') {
    this.state.notifications.forEach(n => { if (!n.for_role || n.for_role === role) n.read = true; });
    this.state.notifications.forEach(n => {
      if ((!n.for_role || n.for_role === role) && n.id) void api.put(`/notifications/${n.id}/read`).catch(() => undefined);
    });
  }

  addIntervention(patientId: string, intervention_type: string, description?: string, doctor = 'Dr. Sharma') {
    const patient = this.getPatient(patientId);
    const intervention: import('../types').Intervention = {
      intervention_id: `I-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patient_id: patientId,
      patient_name: patient ? patient.patient_name : patientId,
      doctor,
      intervention_type,
      description,
      status: 'IN_PROGRESS',
      created_at: this.nowISO(),
      updated_at: this.nowISO()
    };
    this.state.interventions.push(intervention);
    void api.post('/interventions', intervention).catch(() => undefined);
    return intervention;
  }

  getInterventions() {
    return this.state.interventions.slice().sort((a:any,b:any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  updateInterventionStatus(interventionId: string, status: 'PENDING'|'IN_PROGRESS'|'COMPLETED') {
    const it = this.state.interventions.find(i => i.intervention_id === interventionId);
    if (!it) return;
    it.status = status;
    it.updated_at = this.nowISO();
    void api.put(`/interventions/${interventionId}/status`, { status }).catch(() => undefined);
  }

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
      end_date: med.end_date || new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
      quantity: med.quantity || 30,
      refill_interval: med.refill_interval || 30,
      active: med.active !== undefined ? med.active : true
    };
    this.state.medications.push(newMed);
    void api.post(`/patients/${patientId}/medications`, newMed).catch(() => undefined);
    return newMed;
  }

  addMedicationEvent(patientId: string, medicationId: string, date: string, scheduled_time: string, status: MedicationStatus, skipReason?: string) {
    const event: MedicationEvent = {
      event_id: `E-${medicationId}-${date}-${scheduled_time.replace(/[: ]/g, '')}`,
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
    void api.post('/medication-events', event).catch(() => undefined);
    return event;
  }

  updatePatientPrediction(
    patientId: string,
    prediction: {
      risk_score?: number;
      risk_level?: RiskLevel;
      adherence_probability?: number;
      non_adherence_risk?: number;
      risk_percentage?: number;
      risk_factors?: string[];
      protective_factors?: string[];
      recommendations?: string[];
    }
  ) {
    const patient = this.state.patients.find(p => p.patient_id === patientId);
    if (!patient) return null;

    if (typeof prediction.risk_score === 'number') patient.risk_score = prediction.risk_score;
    if (prediction.risk_level) patient.risk_level = prediction.risk_level;
    if (typeof prediction.adherence_probability === 'number') patient.adherence_probability = prediction.adherence_probability;
    if (typeof prediction.non_adherence_risk === 'number') patient.non_adherence_risk = prediction.non_adherence_risk;
    if (typeof prediction.risk_percentage === 'number') patient.risk_percentage = prediction.risk_percentage;
    if (prediction.risk_factors) patient.risk_factors = prediction.risk_factors;
    if (prediction.protective_factors) patient.protective_factors = prediction.protective_factors;
    if (prediction.recommendations) patient.recommendations = prediction.recommendations;

    void api.put(`/patients/${patientId}`, {
      ...patient,
      patient_id: patientId,
    }).catch(() => undefined);

    return patient;
  }

  authenticatePatient(patientId: string, password?: string): Patient | null {
    const patient = this.state.patients.find(p => p.patient_id === patientId);
    if (!patient) return null;
    if (patient.password_hash && password) {
      if (btoa(password) !== patient.password_hash) return null;
    }
    return patient;
  }

  generatePatientId(): string {
    const highestNum = this.state.patients
      .map(p => parseInt(p.patient_id.substring(1)))
      .filter(n => !isNaN(n))
      .reduce((max, cur) => Math.max(max, cur), 0);

    const nextNum = Math.max(highestNum + 1, 4001);
    return `P${nextNum.toString().padStart(6, '0')}`;
  }

  registerNewPatient(patientData: Partial<Patient>, password?: string, medsCount: number = 1, doseFreq: string = 'Morning', medicationsList?: Partial<Medication>[], persistToBackend = true): Patient {
    const newId = this.generatePatientId();
    const adherence = patientData.prior_adherence || 100;
    const refillGap = patientData.refill_gap_days || 0;
    const missed = patientData.previous_missed_doses || 0;
    const riskScore = Math.min(100, Math.max(0, 100 - adherence + (refillGap * 2) + (missed * 5)));
    const riskLevel: RiskLevel = riskScore > 75 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

    const newPatient: Patient = {
      patient_id: newId,
      patient_name: patientData.patient_name || 'New Patient',
      age: patientData.age || 0,
      gender: patientData.gender || 'Unknown',
      condition: patientData.condition || 'Not specified',
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

    const today = new Date().toISOString().split('T')[0];
    const medNames = ['Metformin 500mg', 'Atorvastatin 10mg', 'Lisinopril 20mg'];

    if (medicationsList && medicationsList.length > 0) {
      medicationsList.forEach((m, idx) => {
        const scheduled_times = m.scheduled_times || (doseFreq.includes('Twice') ? ['08:00 AM', '08:00 PM'] : doseFreq.includes('Three') ? ['08:00 AM', '01:00 PM', '08:00 PM'] : ['08:00 AM']);
        const medId = `M${newId.substring(1)}-${idx}`;
        const newMed: Medication = {
          medicine_id: medId,
          patient_id: newId,
          medicine_name: m.medicine_name || `Medication ${idx + 1}`,
          dose: m.dose,
          frequency: m.frequency || doseFreq,
          scheduled_times,
          start_date: m.start_date || '2025-01-01',
          end_date: m.end_date || '2026-01-01',
          quantity: m.quantity || 90,
          refill_interval: m.refill_interval || 30,
          active: m.active !== undefined ? m.active : true,
        };
        this.state.medications.push(newMed);
        this.state.slots.push(...scheduled_times.map((time, tIndex): MedicationSlot => ({
          slot_id: `S-${medId}-${tIndex}`,
          patient_id: newId,
          medicine_id: medId,
          date: today,
          scheduled_time: time,
          status: 'PENDING' as MedicationStatus
        })));
        if (persistToBackend) void api.post(`/patients/${newId}/medications`, newMed).catch(() => undefined);
      });
    } else {
      for (let j = 0; j < medsCount; j++) {
        const medId = `M${newId.substring(1)}-${j}`;
        const scheduled_times = doseFreq.includes('Twice') ? ['08:00 AM', '08:00 PM'] : doseFreq.includes('Three') ? ['08:00 AM', '01:00 PM', '08:00 PM'] : ['08:00 AM'];
        const newMed: Medication = {
          medicine_id: medId,
          patient_id: newId,
          medicine_name: medNames[j % medNames.length],
          frequency: doseFreq,
          scheduled_times,
          start_date: '2025-01-01',
          end_date: '2026-01-01',
          quantity: 90,
          refill_interval: 30,
        };
        this.state.medications.push(newMed);
        this.state.slots.push(...scheduled_times.map((time, tIndex): MedicationSlot => ({
          slot_id: `S-${medId}-${tIndex}`,
          patient_id: newId,
          medicine_id: medId,
          date: today,
          scheduled_time: time,
          status: 'PENDING' as MedicationStatus
        })));
        if (persistToBackend) void api.post(`/patients/${newId}/medications`, newMed).catch(() => undefined);
      }
    }

    if (persistToBackend) void api.post('/patients', {
      patient_id: newId,
      patient_name: newPatient.patient_name,
      age: newPatient.age,
      gender: newPatient.gender,
      condition: newPatient.condition,
      chronic_conditions: newPatient.chronic_conditions,
      num_meds: newPatient.num_meds,
      prior_adherence: newPatient.prior_adherence,
      previous_missed_doses: newPatient.previous_missed_doses,
      previous_missed_refills: newPatient.previous_missed_refills,
      refill_gap_days: newPatient.refill_gap_days,
      risk_score: newPatient.risk_score,
      risk_level: newPatient.risk_level,
      password_hash: newPatient.password_hash,
      created_at: newPatient.created_at,
    }).catch(() => undefined);

    return newPatient;
  }

  getAllMedications() { return this.state.medications.slice(); }

  getMedications(patientId: string) { return this.state.medications.filter(m => m.patient_id === patientId); }

  private deriveSlotsForPatient(patientId: string, date: string = new Date().toISOString().split('T')[0]): MedicationSlot[] {
    const meds = this.getMedications(patientId);
    const eventMap = new Map(
      this.state.events
        .filter(e => e.patient_id === patientId && e.date === date)
        .map((event) => [`${event.medicine_id}|${event.scheduled_time}`, event])
    );

    const slots = meds.flatMap((med) => {
      const schedule = Array.isArray(med.scheduled_times) ? med.scheduled_times : [med.scheduled_times];
      return schedule
        .filter(Boolean)
        .map((scheduledTime, index) => {
          const key = `${med.medicine_id}|${scheduledTime}`;
          const event = eventMap.get(key);
          return {
            slot_id: event?.slot_id || `S-${med.medicine_id}-${date}-${index}-${String(scheduledTime).replace(/[^a-zA-Z0-9]/g, '')}`,
            patient_id: patientId,
            medicine_id: med.medicine_id,
            date,
            scheduled_time: scheduledTime,
            status: event?.status || 'PENDING',
          } as MedicationSlot;
        });
    });

    this.state.slots = this.state.slots.filter(s => !(s.patient_id === patientId && s.date === date)).concat(slots);
    return slots;
  }

  getTodaySlots(patientId: string) {
    return this.deriveSlotsForPatient(patientId);
  }

  getEventsForPatientOnDate(patientId: string, date: string) {
    return this.state.events.filter(e => e.patient_id === patientId && e.date === date);
  }

  logMedicationEvent(slotId: string, status: MedicationStatus, skipReason?: string) {
    const slot = this.state.slots.find(s => s.slot_id === slotId) || this.deriveSlotsForPatient(this.state.medications.find(m => m.medicine_id === slotId.split('-')[1])?.patient_id || this.state.events.find(e => e.slot_id === slotId)?.patient_id || '', new Date().toISOString().split('T')[0]).find(s => s.slot_id === slotId);
    if (!slot) return;

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

    const existingIndex = this.state.events.findIndex(e =>
      e.patient_id === slot.patient_id &&
      e.medicine_id === slot.medicine_id &&
      e.date === slot.date &&
      e.scheduled_time === slot.scheduled_time
    );

    if (existingIndex >= 0) {
      this.state.events[existingIndex] = event;
    } else {
      this.state.events.push(event);
    }

    const todaysSlot = this.deriveSlotsForPatient(slot.patient_id).find(s => s.slot_id === slot.slot_id);
    if (todaysSlot) {
      todaysSlot.status = status;
    }

    this.recalculatePatient(slot.patient_id);
    void api.post('/medication-events', event).catch(() => undefined);
  }

  private recalculatePatient(patientId: string) {
    const patient = this.state.patients.find(p => p.patient_id === patientId);
    if (!patient) return;

    const patientEvents = this.state.events.filter(e => e.patient_id === patientId);
    const taken = patientEvents.filter(e => e.status === 'TAKEN').length;
    const skipped = patientEvents.filter(e => e.status === 'SKIPPED').length;
    const total = taken + skipped;

    if (total > 0) {
      const todayAdherence = (taken / total) * 100;
      (patient as any).live_adherence_estimate = Math.round(todayAdherence * 100) / 100;
      patient.previous_missed_doses = (patient.previous_missed_doses || 0) + skipped;
    }
  }
}

export const db = new Database();
