export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'worker';
  house_number?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  batch_name: string;
  start_date: string;
  end_date?: string;
  initial_count: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  batch_id: string;
  house_number: number;
  record_date: string;
  
  morning_dead?: number;
  morning_culled?: number;
  morning_temp_outside?: number;
  morning_temp_inside?: number;
  morning_humidity?: number;
  morning_water_meter?: number;
  morning_recorded_by?: string;
  morning_recorded_at?: string;
  
  afternoon_dead?: number;
  afternoon_culled?: number;
  afternoon_recorded_by?: string;
  afternoon_recorded_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  batch_id: string;
  house_number: number;
  record_date: string;
  total_dead: number;
  total_culled: number;
  total_loss: number;
  morning_temp_outside?: number;
  morning_temp_inside?: number;
  morning_humidity?: number;
  morning_water_meter?: number;
}
