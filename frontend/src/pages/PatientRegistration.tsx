// Import React and useState hook for managing local component state (like form inputs and current step)
import React, { useState } from 'react';
// Import routing hook to redirect users to different pages
import { useNavigate } from 'react-router-dom';
// Import UI icons
import { HeartPulse, ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
// Import custom reusable Button component
import { Button } from '../components/ui/Button';
// Import the mock database that handles the ML logic and data storage
import { db } from '../store/db';
import { ApiError, clearDoctorToken, predictAdherence, setPatientToken, api, type PredictionResponse } from '../lib/api';
import type { Medication, Patient } from '../types';

// Define the Registration Wizard component
export const PatientRegistration: React.FC = () => {
  // Initialize navigation hook
  const navigate = useNavigate();
  // State: Tracks which step of the wizard the user is currently on (1 to 4, 5 is success)
  const [step, setStep] = useState(1);
  // State: Tracks if the form is currently submitting (simulating ML delay)
  const [loading, setLoading] = useState(false);
  // State: Stores validation error messages to show to the user
  const [error, setError] = useState('');
  // State: Stores the newly generated Patient ID after successful registration
  const [successId, setSuccessId] = useState('');
  // State: Stores the backend prediction result for display on the success screen
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);
  const [medicationsList, setMedicationsList] = useState<Partial<Medication>[]>([]);

  // State: The massive form data object that precisely maps to the CSV ML features
  const [formData, setFormData] = useState({
    patient_name: '', // Standard UI field
    age: '', // Maps to CSV: age
    gender: '', // Maps to CSV: gender_M, gender_F
    condition: '',
    password: '', 
    confirmPassword: '',
    
    chronic_conditions: '', // Maps to CSV: chronic_conditions
    num_meds: '', // Maps to CSV: num_meds
    dose_freq: 'Morning', // Maps to CSV: daily_dose_frequency
    med_duration: '', // Maps to CSV: medication_duration_days
    
    missed_doses: '', // Maps to CSV: missed_doses_recent
    missed_refills: '', 
    refill_gap: '', // Maps to CSV: refill_gap_days
    days_since_last_refill: '', // Maps to CSV: days_since_last_refill
    missed_appointments: '', // Maps to CSV: missed_appointments
    med_changes: 'No', // Maps to CSV: medication_changes
    copay_tier: 'medium', // Maps to CSV: copay_tier_high/medium/low
    mental_health: 'No' // Maps to CSV: mental_health_flag
  });

  // Generic handler function for whenever any input field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Update the formData object dynamically using the input's 'name' attribute
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear any existing errors when the user starts typing again
    setError('');
  };

  const isIntegerInRange = (value: string, min: number, max?: number) => {
    if (!/^\d+$/.test(value)) return false;
    const parsed = Number(value);
    return parsed >= min && (max === undefined || parsed <= max);
  };

  // Validation function for Step 1: Basic Info
  const validateStep1 = () => {
    if (!formData.patient_name.trim()) return "Please enter your name.";
    if (!isIntegerInRange(formData.age, 0, 120)) return "Age must be between 0 and 120.";
    if (!formData.gender) return "Please select a gender.";
    if (!formData.condition.trim()) return "Please enter your disease or condition.";
    if (formData.password && formData.password !== formData.confirmPassword) return "Passwords do not match.";
    return null; // Return null if there are no errors
  };

  // Validation function for Step 2: Health Info
  const validateStep2 = () => {
    if (!isIntegerInRange(formData.chronic_conditions, 0)) return "Chronic conditions must be a whole number of 0 or more.";
    if (!isIntegerInRange(formData.num_meds, 0)) return "Number of medicines must be a whole number of 0 or more.";
    if (!formData.dose_freq) return "Please select a daily frequency.";
    if (!isIntegerInRange(formData.med_duration, 0)) return "Medication duration must be a whole number of 0 or more.";
    // If the user added medications, validate each
    for (let i = 0; i < medicationsList.length; i++) {
      const m = medicationsList[i];
      const requiredTimes = getRequiredScheduleTimes(m.frequency || 'Once daily');
      if (!m.medicine_name || !m.medicine_name.trim()) return `Please enter a medicine name for medication ${i+1}.`;
      if (!m.dose || !m.dose.trim()) return `Please enter a dose for medication ${i+1}.`;
      if (!m.frequency) return `Please select a frequency for medication ${i+1}.`;
      const scheduledTimes = Array.isArray(m.scheduled_times) ? m.scheduled_times.filter(Boolean) : [];
      if (scheduledTimes.length !== requiredTimes.length) {
        return `Medication ${i+1} requires ${requiredTimes.length} schedule time(s) for ${m.frequency}.`;
      }
      if (scheduledTimes.some(time => !time.trim())) {
        return `Please enter valid schedule times for medication ${i+1}.`;
      }
    }
    return null;
  };

  // Validation function for Step 3: Adherence/Access Info
  const validateStep3 = () => {
    if (!isIntegerInRange(formData.missed_doses, 0)) return "Missed doses must be a whole number of 0 or more.";
    if (!isIntegerInRange(formData.missed_refills, 0)) return "Missed refills must be a whole number of 0 or more.";
    if (!isIntegerInRange(formData.refill_gap, 0)) return "Refill gap must be a whole number of 0 or more.";
    if (!isIntegerInRange(formData.days_since_last_refill, 0)) return "Days since last refill must be a whole number of 0 or more.";
    if (!isIntegerInRange(formData.missed_appointments, 0)) return "Missed appointments must be a whole number of 0 or more.";
    return null;
  };

  // Function called when user clicks "Continue"
  const handleNext = () => {
    let err = null;
    // Run validation depending on which step we are currently on
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();

    // If validation fails, set the error state and stop
    if (err) {
      setError(err);
      return;
    }
    // If successful, increment the step counter
    setStep(prev => prev + 1);
  };

  // Function called when user clicks "Back"
  const handleBack = () => {
    // Decrement the step counter
    setStep(prev => prev - 1);
    setError(''); // Clear any errors
  };

  const getRequiredScheduleTimes = (frequency: string) => {
    if (frequency === 'Twice daily') return ['08:00 AM', '08:00 PM'];
    if (frequency === 'Three times daily') return ['08:00 AM', '01:00 PM', '08:00 PM'];
    return ['08:00 AM'];
  };

  const normalizeMedicationSchedule = (med: Partial<Medication>): string[] => {
    const requirement = getRequiredScheduleTimes(med.frequency || 'Once daily');
    const provided = Array.isArray(med.scheduled_times) ? med.scheduled_times.filter(Boolean) : [];
    const normalized = provided.length ? provided : requirement;
    return requirement.map((slot, index) => normalized[index] || slot);
  };

  // Helpers for medication rows
  const addMedicationRow = () => setMedicationsList(prev => [...prev, { medicine_name: '', dose: '', frequency: 'Once daily', scheduled_times: ['08:00 AM'] }]);
  const removeMedicationRow = (index: number) => setMedicationsList(prev => prev.filter((_, i) => i !== index));
  const updateMedicationField = (index: number, field: keyof Partial<Medication>, value: any) => {
    setMedicationsList(prev => prev.map((m, i) => {
      if (i !== index) return m;
      if (field === 'frequency') {
        return { ...m, frequency: String(value), scheduled_times: getRequiredScheduleTimes(String(value)) };
      }
      if (field === 'scheduled_times') {
        const next = Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : [];
        return { ...m, scheduled_times: next.length ? next : getRequiredScheduleTimes(m.frequency || 'Once daily') };
      }
      return { ...m, [field]: value };
    }));
  };

  const updateMedicationTime = (rowIndex: number, timeIndex: number, value: string) => {
    setMedicationsList(prev => prev.map((med, idx) => {
      if (idx !== rowIndex) return med;
      const schedule = [...(med.scheduled_times || getRequiredScheduleTimes(med.frequency || 'Once daily'))];
      schedule[timeIndex] = value;
      return { ...med, scheduled_times: schedule };
    }));
  };

  // Function called on Step 4 to finalize registration
  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const validationError = validateStep1() || validateStep2() || validateStep3();
      if (validationError) {
        setError(validationError);
        return;
      }
      const parsedAge = Number(formData.age);
      const parsedChronicConditions = Number(formData.chronic_conditions);
      const parsedNumMeds = Number(formData.num_meds);
      const parsedRefillGap = Number(formData.refill_gap);
      const parsedMissedDoses = Number(formData.missed_doses);
      const parsedPriorYearAdherence = Math.min(100, Math.max(0, 100 - (parsedMissedDoses * 2) - (parsedRefillGap * 1.5)));
      const parsedDaysSinceLastRefill = Number(formData.days_since_last_refill);
      const parsedMissedAppointments = Number(formData.missed_appointments);
      const parsedMedicationChanges = formData.med_changes === 'Yes' ? 1 : 0;
      const parsedDailyDoseFrequency = formData.dose_freq === 'Morning' ? 1 : (
        formData.dose_freq === 'Twice daily' ? 2 : (
          formData.dose_freq === 'Three times daily' ? 3 : 4
        )
      );
      const parsedMedicationDurationDays = Number(formData.med_duration) || 0;
      const parsedGenderM = formData.gender === 'Male' ? 1 : 0;
      const parsedGenderF = formData.gender === 'Female' ? 1 : 0;
      const parsedCopayTierHigh = formData.copay_tier === 'high' ? 1 : 0;
      const parsedCopayTierMedium = formData.copay_tier === 'medium' ? 1 : 0;
      const parsedCopayTierLow = formData.copay_tier === 'low' ? 1 : 0;
      const parsedMentalHealthFlag = formData.mental_health === 'Yes' ? 1 : 0;

      const prediction = await predictAdherence({
        age: parsedAge,
        chronic_conditions: parsedChronicConditions,
        num_meds: parsedNumMeds,
        refill_gap_days: parsedRefillGap,
        prior_year_adherence: parsedPriorYearAdherence,
        mental_health_flag: parsedMentalHealthFlag,
        missed_doses_recent: parsedMissedDoses,
        days_since_last_refill: parsedDaysSinceLastRefill,
        missed_appointments: parsedMissedAppointments,
        medication_changes: parsedMedicationChanges,
        daily_dose_frequency: parsedDailyDoseFrequency,
        medication_duration_days: parsedMedicationDurationDays,
        gender_F: parsedGenderF,
        gender_M: parsedGenderM,
        copay_tier_high: parsedCopayTierHigh,
        copay_tier_low: parsedCopayTierLow,
        copay_tier_medium: parsedCopayTierMedium,
      });

      const normalizedMedicationList = medicationsList.map((med) => ({
        ...med,
        frequency: med.frequency || 'Once daily',
        scheduled_times: normalizeMedicationSchedule(med),
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + (Math.max(1, parsedMedicationDurationDays || 30) - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

      const newPatient = db.registerNewPatient({
        patient_name: formData.patient_name,
        age: parsedAge,
        gender: formData.gender,
        condition: formData.condition,
        chronic_conditions: parsedChronicConditions,
        previous_missed_doses: parsedMissedDoses,
        previous_missed_refills: Number(formData.missed_refills),
        refill_gap_days: parsedRefillGap,
        // Keep prior_adherence as the historical estimate derived from the form
        prior_adherence: Math.round(parsedPriorYearAdherence),
        _raw_features: {
          mental_health_flag: parsedMentalHealthFlag,
          days_since_last_refill: parsedDaysSinceLastRefill,
          missed_appointments: parsedMissedAppointments,
          medication_changes: parsedMedicationChanges,
          daily_dose_frequency: parsedDailyDoseFrequency,
          medication_duration_days: parsedMedicationDurationDays,
          copay_tier_high: parsedCopayTierHigh,
          copay_tier_medium: parsedCopayTierMedium,
          copay_tier_low: parsedCopayTierLow,
          gender_M: parsedGenderM,
          gender_F: parsedGenderF,
        },
      }, formData.password, normalizedMedicationList.length, formData.dose_freq, normalizedMedicationList, false);

      const persistedPatient = await api.post<Patient>('/patients', {
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
        password_hash: newPatient.password_hash,
        created_at: newPatient.created_at,
        ...(prediction ? {
          risk_score: Math.round(prediction.risk_percentage),
          risk_level: prediction.risk_level,
          adherence_probability: prediction.adherence_probability,
          non_adherence_risk: prediction.non_adherence_risk,
          risk_percentage: prediction.risk_percentage,
          risk_factors: prediction.risk_factors,
          protective_factors: prediction.protective_factors,
          recommendations: prediction.recommendations,
        } : {}),
      });

      const auth = await api.post<{ access_token: string }>('/auth/patient/login', {
        patient_id: persistedPatient.patient_id,
        password: formData.password,
      });
      setPatientToken(auth.access_token);
      clearDoctorToken();

      await Promise.all(normalizedMedicationList.map((med, index) => api.post(`/patients/${persistedPatient.patient_id}/medications`, {
        medicine_id: med.medicine_id || `M${persistedPatient.patient_id.substring(1)}-${index}`,
        patient_id: persistedPatient.patient_id,
        medicine_name: med.medicine_name,
        dose: med.dose,
        frequency: med.frequency,
        scheduled_times: med.scheduled_times,
        start_date: med.start_date || new Date().toISOString().split('T')[0],
        end_date: med.end_date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
        quantity: med.quantity || 90,
        refill_interval: med.refill_interval || 30,
        active: med.active !== false,
      })));

      setPredictionResult(prediction ?? null);
      setSuccessId(persistedPatient.patient_id);
      localStorage.setItem('active_patient_id', persistedPatient.patient_id);
      setStep(5);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Unable to connect to the server. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER SUCCESS SCREEN (STEP 5) ---
  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Profile Created</h2>
          <p className="text-slate-500 mb-6">Welcome to Medivia, {formData.patient_name.split(' ')[0]}</p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Your Patient ID</p>
            <p className="text-3xl font-mono font-black text-[var(--primary)]">{successId}</p>
          </div>

          {predictionResult ? (
            <div className={`mb-6 rounded-xl border p-4 text-left ${predictionResult.risk_level === 'HIGH' ? 'border-red-200 bg-red-50' : predictionResult.risk_level === 'MEDIUM' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Prediction</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${predictionResult.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : predictionResult.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {predictionResult.risk_level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Risk %</p>
                  <p className="font-bold text-lg">{predictionResult.risk_percentage.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Adherence</p>
                  <p className="font-bold text-lg">{(predictionResult.adherence_probability * 100).toFixed(2)}%</p>
                </div>
              </div>

              {predictionResult.risk_factors.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Risk factors</p>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                    {predictionResult.risk_factors.slice(0, 3).map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {predictionResult.protective_factors.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Protective factors</p>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                    {predictionResult.protective_factors.slice(0, 3).map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {predictionResult.recommendations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Recommendations</p>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                    {predictionResult.recommendations.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
              Risk assessment pending. It will be generated after patient creation.
            </div>
          )}

          <Button 
            onClick={() => navigate('/patient/dashboard')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
          >
            Go to Patient Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // --- RENDER WIZARD MAIN VIEW (STEPS 1-4) ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-2xl">
        
        {/* Back Button: Routes back to auth landing if on step 1, otherwise steps backwards */}
        <button 
          onClick={() => step === 1 ? navigate('/patient/auth') : handleBack()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Header & Progress Bar container */}
          <div className="bg-[var(--primary)] p-6 text-white">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <HeartPulse size={24} />
                <span className="font-bold text-lg">New Patient Registration</span>
              </div>
              <span className="text-sm font-medium text-white/80 bg-white/10 px-3 py-1 rounded-full">
                Step {step === 4 ? 'Review' : `${step} of 3`}
              </span>
            </div>

            {/* Render visual progress bar elements if we aren't on the review screen */}
            {step <= 3 && (
              <div className="flex gap-2">
                <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/20'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/20'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-white' : 'bg-white/20'}`}></div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            {/* Display error message banner if an error exists */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm font-medium mb-6">
                {error}
              </div>
            )}

            {/* ======================= */}
            {/* STEP 1: Basic UI Render */}
            {/* ======================= */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <input type="text" name="patient_name" value={formData.patient_name} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="e.g. John Doe" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
                    <input type="number" name="age" min="0" max="120" step="1" value={formData.age} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Years" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white">
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Disease / Condition</label>
                  <input type="text" name="condition" value={formData.condition} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-3" placeholder="e.g. Hypertension, Type 2 Diabetes" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Set Password (Optional)</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-3" placeholder="Choose a password" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Confirm password" />
                </div>
              </div>
            )}

            {/* ======================= */}
            {/* STEP 2: Health UI Render */}
            {/* ======================= */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Medication & Health Information</h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many chronic conditions do you have?</label>
                  <p className="text-xs text-slate-500 mb-2">E.g. Diabetes, Hypertension, Asthma</p>
                  <input type="number" name="chronic_conditions" min="0" step="1" value={formData.chronic_conditions} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="0" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many medicines are you currently taking?</label>
                  <input type="number" name="num_meds" min="0" step="1" value={formData.num_meds} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Number of prescriptions" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many times per day do you usually take your medicines?</label>
                  <select name="dose_freq" value={formData.dose_freq} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white">
                    <option value="Morning">Once daily (Morning)</option>
                    <option value="Evening">Once daily (Evening)</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How long have you been taking your current medicines?</label>
                  <input type="number" name="med_duration" min="0" step="1" value={formData.med_duration} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="In days" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Have you experienced any recent mental health concerns?</label>
                  <select name="mental_health" value={formData.mental_health} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {/* Medication input section (dynamic) */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Current Medications</h4>
                  {medicationsList.map((m, idx) => (
                    <div key={idx} className="p-3 mb-3 border border-slate-100 rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Medication {idx+1}</div>
                        <button type="button" onClick={() => removeMedicationRow(idx)} className="text-xs text-red-600">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={m.medicine_name || ''} onChange={(e) => updateMedicationField(idx, 'medicine_name', e.target.value)} placeholder="Medicine name (required)" className="p-2 border border-slate-200 rounded" />
                        <input type="text" value={m.dose || ''} onChange={(e) => updateMedicationField(idx, 'dose', e.target.value)} placeholder="Dose (e.g. 500 mg)" className="p-2 border border-slate-200 rounded" />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <select value={m.frequency || 'Once daily'} onChange={(e) => updateMedicationField(idx, 'frequency', e.target.value)} className="p-2 border border-slate-200 rounded bg-white">
                          <option value="Once daily">Once daily</option>
                          <option value="Twice daily">Twice daily</option>
                          <option value="Three times daily">Three times daily</option>
                        </select>
                        <div className="text-xs text-slate-500 self-center">{(m.frequency || 'Once daily')} schedule</div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(m.scheduled_times || getRequiredScheduleTimes(m.frequency || 'Once daily')).map((time, timeIndex) => (
                          <div key={`${idx}-${timeIndex}`} className="flex items-center gap-2">
                            <label className="w-20 text-xs font-medium text-slate-600">Time {timeIndex + 1}</label>
                            <input
                              type="text"
                              value={time}
                              onChange={(e) => updateMedicationTime(idx, timeIndex, e.target.value)}
                              placeholder={getRequiredScheduleTimes(m.frequency || 'Once daily')[timeIndex] || '08:00 AM'}
                              className="flex-1 p-2 border border-slate-200 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="text-sm">
                    <button type="button" onClick={addMedicationRow} className="text-[var(--primary)] font-bold">+ Add Medication</button>
                  </div>
                </div>

              </div>
            )}

            {/* ======================= */}
            {/* STEP 3: Adherence Render */}
            {/* ======================= */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Access & Medication History</h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many medicine doses have you missed recently?</label>
                  <input type="number" name="missed_doses" min="0" step="1" value={formData.missed_doses} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Number of doses" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many pharmacy refills have you missed?</label>
                  <input type="number" name="missed_refills" min="0" step="1" value={formData.missed_refills} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Number of refills" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many days has it been since your last pharmacy refill?</label>
                  <input type="number" name="days_since_last_refill" min="0" step="1" value={formData.days_since_last_refill} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Days" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many days was the gap between your expected refill and actual refill?</label>
                  <input type="number" name="refill_gap" min="0" step="1" value={formData.refill_gap} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Number of days" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">What is your typical medication Copay Tier?</label>
                  <select name="copay_tier" value={formData.copay_tier} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white">
                    <option value="low">Low (e.g. Generic)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (e.g. Specialty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">How many medication/healthcare appointments have you missed recently?</label>
                  <input type="number" name="missed_appointments" min="0" step="1" value={formData.missed_appointments} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Number of appointments" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Have there been any recent changes to your medicines?</label>
                  <select name="med_changes" value={formData.med_changes} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            )}

            {/* ======================= */}
            {/* STEP 4: Review Render */}
            {/* ======================= */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Review Your Information</h3>
                <p className="text-sm text-slate-500 mb-6">Please confirm your details before creating your profile.</p>
                
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Basic Information</h4>
                    <p className="text-sm font-medium text-slate-700">{formData.patient_name} • {formData.age} yrs • {formData.gender}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Medication Information</h4>
                    <p className="text-sm font-medium text-slate-700">{formData.num_meds} medicines • {formData.dose_freq} • {formData.chronic_conditions} conditions</p>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Adherence Information</h4>
                    <p className="text-sm font-medium text-slate-700">{formData.missed_doses} missed doses • {formData.refill_gap} day refill gap • {formData.missed_appointments} missed appts</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Risk assessment will be generated after patient creation.
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="mt-8 flex gap-3">
              {step < 4 ? (
                // If not on final step, show Continue button
                <Button onClick={handleNext} className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-3 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </Button>
              ) : (
                // If on final step, show Submit button that triggers ML mock
                <Button onClick={handleSubmit} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 flex items-center justify-center gap-2">
                  {loading ? 'Creating Profile & Running AI Model...' : 'Create Patient Profile'}
                </Button>
              )}
            </div>

            {/* Quick Fill Button (Hackathon Demo Specific) */}
            {step === 1 && (
              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    // Instantly populate the form with mock data to save typing time during presentation
                    setFormData({
                      patient_name: 'Demo Patient', age: '45', gender: 'Female', condition: 'Type 2 Diabetes', password: '', confirmPassword: '',
                      chronic_conditions: '2', num_meds: '3', dose_freq: 'Twice daily', med_duration: '365', mental_health: 'No',
                      missed_doses: '4', missed_refills: '1', days_since_last_refill: '14', refill_gap: '5', copay_tier: 'medium', missed_appointments: '0', med_changes: 'No'
                    });
                  }}
                  className="text-xs text-[var(--primary)] hover:underline font-bold"
                >
                  Quick Fill
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
