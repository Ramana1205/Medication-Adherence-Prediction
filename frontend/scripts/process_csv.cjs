const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'medication_adherence_processed.csv');
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'patients.json');

const firstNames = ['Ramana', 'Suresh', 'Lakshmi', 'Anitha', 'Rajesh', 'Meena', 'Kiran', 'Priya', 'Amit', 'Neha', 'Vikram', 'Sneha', 'Rahul', 'Pooja', 'Arun'];
const lastNames = ['K.', 'P.', 'M.', 'S.', 'T.', 'L.', 'V.', 'R.', 'D.', 'N.', 'B.'];

function generateName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

try {
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    console.error("CSV is empty.");
    process.exit(1);
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const patients = [];

  // Take up to 200 rows (skipping header)
  const maxRows = Math.min(201, lines.length);

  for (let i = 1; i < maxRows; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = parseFloat(values[idx]); // Convert all strings to numbers as per CSV
    });

    const patient_id = `P${i.toString().padStart(4, '0')}`;
    const priorAdherence = row.prior_year_adherence || 100;
    
    // Adherent flag in CSV: 1 = Adherent (Low risk), 0 = Non-adherent (High risk)
    const isAdherent = row.adherent === 1;
    let risk_level = isAdherent ? 'LOW' : 'HIGH';
    let risk_score = isAdherent ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 20) + 80;

    const patient = {
      patient_id,
      patient_name: generateName(),
      age: Math.floor(row.age) || 45,
      gender: row.gender_M === 1 ? 'Male' : (row.gender_F === 1 ? 'Female' : 'Other'),
      chronic_conditions: Math.floor(row.chronic_conditions) || 0,
      num_meds: Math.floor(row.num_meds) || 1,
      prior_adherence: priorAdherence,
      previous_missed_doses: Math.floor(row.missed_doses_recent) || 0,
      previous_missed_refills: 0, // Not directly in CSV, mock to 0
      refill_gap_days: Math.floor(row.refill_gap_days) || 0,
      risk_score,
      risk_level,
      // Store raw features for ML integration if needed later
      _raw_features: {
        mental_health_flag: row.mental_health_flag,
        days_since_last_refill: row.days_since_last_refill,
        missed_appointments: row.missed_appointments,
        medication_changes: row.medication_changes,
        daily_dose_frequency: row.daily_dose_frequency,
        medication_duration_days: row.medication_duration_days,
        copay_tier_high: row.copay_tier_high,
        copay_tier_low: row.copay_tier_low,
        copay_tier_medium: row.copay_tier_medium
      }
    };

    patients.push(patient);
  }

  // Ensure src/data exists
  const dataDir = path.dirname(jsonPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(patients, null, 2));
  console.log(`Successfully generated patients.json with ${patients.length} records.`);

} catch (e) {
  console.error("Error processing CSV:", e);
}
