export interface Cadet {
  id: string;
  enrollment_number: string;
  name: string;
  rank: string;
  unit: string;
  division: 'SD' | 'SW' | string;
  blood_group: string;
  mobile: string;
  photo_path: string | null;
  father_guardian_name: string;
  date_of_birth: string;
  emergency_contact: string;
  residential_address: string;
  valid_from: string;
  valid_till: string;
  purpose_of_issue: string;
  created_at?: string;
}

export interface RegistrationPayload {
  enrollment_number: string;
  name: string;
  rank: string;
  unit: string;
  division: string;
  blood_group: string;
  mobile: string;
  father_guardian_name: string;
  date_of_birth: string;
  emergency_contact: string;
  residential_address: string;
  valid_from: string;
  valid_till: string;
  purpose_of_issue: string;
  registration_password: string;
  photo: string; // base64 data URL
  photo_name: string;
}

export interface RegistrationResponse {
  ok: boolean;
  cadet?: Cadet;
  verification_url?: string;
  qr_data_url?: string;
  error?: string;
}

export interface VerifyResponse {
  ok: boolean;
  cadet?: Cadet;
  photo_url?: string | null;
  error?: string;
  code?: 'INVALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN' | 'NETWORK';
}
