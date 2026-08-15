export interface PredictionRequest {
  age: number;
  chronic_conditions: number;
  num_meds: number;
  refill_gap_days: number;
  prior_year_adherence: number;
  mental_health_flag: 0 | 1;
  missed_doses_recent: number;
  days_since_last_refill: number;
  missed_appointments: number;
  medication_changes: number;
  daily_dose_frequency: number;
  medication_duration_days: number;
  gender_F: 0 | 1;
  gender_M: 0 | 1;
  copay_tier_high: 0 | 1;
  copay_tier_low: 0 | 1;
  copay_tier_medium: 0 | 1;
}

export interface PredictionResponse {
  prediction: number;
  adherence_probability: number;
  non_adherence_risk: number;
  risk_percentage: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  risk_factors: string[];
  protective_factors: string[];
  recommendations: string[];
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function predictAdherence(
  payload: PredictionRequest
): Promise<PredictionResponse> {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = 'Unable to fetch prediction right now.';

    try {
      const errorBody = await response.json();

      if (Array.isArray(errorBody?.detail)) {
        errorMessage = errorBody.detail
          .map((item: { msg?: string }) => item.msg || 'Request failed')
          .join('; ');
      } else if (typeof errorBody?.detail === 'string') {
        errorMessage = errorBody.detail;
      } else if (typeof errorBody?.message === 'string') {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore JSON parsing issues and keep the fallback message.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<PredictionResponse>;
}