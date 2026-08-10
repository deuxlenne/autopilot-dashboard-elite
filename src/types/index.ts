export type TaskCategory = 'urgent' | 'daily' | 'weekly';

export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  reminder_interval_minutes: number;
  status: TaskStatus;
  notes?: string | null;
  last_reminded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  clock_in: string | null; // HH:MM
  clock_out: string | null; // HH:MM
  overtime_hours: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
}
