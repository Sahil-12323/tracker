export type Status = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
export type Source = 'manual' | 'email' | 'share' | 'screenshot';

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  auth_provider: string;
};

export type Application = {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  status: Status;
  applied_date: string;
  job_link?: string;
  notes?: string;
  resume_version?: string;
  follow_up_date?: string;
  source: Source;
  created_at: string;
  updated_at: string;
};

export type ApplicationDraft = Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export type Detection = {
  id: string;
  user_id: string;
  source: Source;
  company_name: string;
  role: string;
  status: Status;
  applied_date: string;
  job_link: string;
  notes: string;
  resume_version: string;
  follow_up_date: string;
  confidence: number;
  raw_text_preview: string;
  state: 'pending' | 'accepted' | 'ignored';
  ai_available: boolean;
  config_message: string;
  created_at: string;
};

export type Analytics = {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  rejected: number;
  success_rate: number;
  by_status: Record<Status, number>;
  by_resume: Record<string, number>;
  upcoming_followups: number;
};

export const STATUSES: Status[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];