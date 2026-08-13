import { Patient, Medication, MedicationSlot, MedicationEvent, RiskLevel, MedicationStatus } from '../types';

const STORAGE_KEY = 'medadhere_db_v2';

interface DBState {
  patients: Patient[];
  medications: Medication[];
  slots: MedicationSlot[];
  events: MedicationEvent[];
}

import csvPatients from '../data/patients.json';

const frequencies = ['Morning', 'Afternoon', 'Evening', 'Twice daily', 'Three times daily'];
const times = ['08:00 AM', '01:00 PM', '08:00 PM'];
const medNames = ['Metformin 500mg', 'Atorvastatin 10mg', 'Lisinopril 20mg', 'Amlodipine 5mg', 'Levothyroxine 50mcg'];

const generateSyntheticData = (): DBState => {
  const patients: Patient[] = csvPatients;
  const medications: Medication[] = [];
  const slots: MedicationSlot[] = [];
  const events: MedicationEvent[] = [];

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
      scheduled_times.forEach((time, tIndex) => {
        const slotId = `S-${medId}-${tIndex}`;
        
        const isPast = parseInt(time.split(':')[0]) < 12 && time.includes('AM');
        let status: MedicationStatus = 'PENDING';
        
        if (isPast) {
          const didTake = Math.random() > (1 - patient.prior_adherence/100);
          status = didTake ? 'TAKEN' : 'SKIPPED';
          
          events.push({
            event_id: `E-${slotId}-${Date.now()}`,
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

  return { patients, medications, slots, events };
};

class Database {
  private state: DBState;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.state = JSON.parse(saved);
    } else {
      this.state = generateSyntheticData();
      this.persist();
    }
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  // --- Patients ---
  getPatients() { return this.state.patients; }
  getPatient(id: string) { return this.state.patients.find(p => p.patient_id === id); }
  
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

  registerNewPatient(patientData: Partial<Patient>, password?: string, medsCount: number = 1, doseFreq: string = 'Morning'): Patient {
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
      // Very basic mock algorithm to adjust prior adherence based on today's actions
      const todayAdherence = (taken / total) * 100;
      patient.prior_adherence = Math.round((patient.prior_adherence * 9 + todayAdherence) / 10);
      
      // Dynamically update their risk score and level
      const riskScore = 100 - patient.prior_adherence + (patient.refill_gap_days * 2) + (skipped * 5);
      patient.risk_score = Math.min(100, Math.max(0, riskScore));
      patient.risk_level = patient.risk_score > 75 ? 'HIGH' : patient.risk_score > 40 ? 'MEDIUM' : 'LOW';
      
      patient.previous_missed_doses += skipped;
    }
  }
}

export const db = new Database();
