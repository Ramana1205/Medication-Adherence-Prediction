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

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
export const API_URL = configuredApiUrl || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const DOCTOR_TOKEN_KEY = 'medadhere_doctor_access_token';
const PATIENT_TOKEN_KEY = 'medadhere_patient_access_token';

export function getDoctorToken(): string | null {
  return sessionStorage.getItem(DOCTOR_TOKEN_KEY);
}

export function clearDoctorToken() {
  sessionStorage.removeItem(DOCTOR_TOKEN_KEY);
}

export function setDoctorToken(token: string) {
  sessionStorage.setItem(DOCTOR_TOKEN_KEY, token);
}

export function getPatientToken(): string | null {
  return sessionStorage.getItem(PATIENT_TOKEN_KEY);
}

export function clearPatientToken() {
  sessionStorage.removeItem(PATIENT_TOKEN_KEY);
}

export function setPatientToken(token: string) {
  sessionStorage.setItem(PATIENT_TOKEN_KEY, token);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError('The production API URL is not configured.', 0);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((getDoctorToken() || getPatientToken()) ? { Authorization: `Bearer ${getDoctorToken() || getPatientToken()}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = 'The request could not be completed.';

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
      // Ignore JSON parsing issues and use the default message.
    }

    throw new ApiError(errorMessage, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function predictAdherence(
  payload: PredictionRequest
): Promise<PredictionResponse> {
  return apiRequest<PredictionResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
};