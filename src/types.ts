// Direct copy from PWA – pure TypeScript, no DOM dependencies

export type ZoneType = string;
export type ChannelType = 'whatsapp' | 'phone' | 'sms';
export type ReminderType = 'driving_lesson' | 'theory_exam' | 'practical_exam' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  due_date: string; // ISO String
  type: ReminderType;
  related_student_id?: string;
  related_session_id?: string;
  is_completed: boolean;
  is_dismissed: boolean;
}

export interface TheoryStatus {
  standard_lessons_attended: boolean[]; // Array of 12 booleans (Lektion 1-12 Grundstoff)
  specific_lessons_dates: (string | null)[]; // Array of 2 dates (ISO strings) or null (Lektion 13-14 Zusatzstoff)
  learning_progress: number; // 0-100%
  simulations_passed: number; // 0-5
  has_warning?: boolean;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  zone: ZoneType;
  pickup_address: string;
  next_stage_day: number; // 1-19
  max_sessions_per_week: number;
  theory_passed_at: string | null; // ISO Date
  planned_theory_exam_at?: string | null;
  practical_exam_at: string | null; // ISO Date (Passed date)
  planned_practical_exam_at?: string | null;
  notes: string;
  phone: string;
  email: string;
  birth_date: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'diverse';
  license_class: string; // e.g. 'B'
  previous_class: string; // e.g. 'None'
  needs_vision_aid: boolean;
  application_date: string; // ISO Date (Anmeldedatum Fahrschule)
  application_approval_date: string | null; // ISO Date (Genehmigung vom Amt/TÜV)
  application_expiry_date?: string | null;
  preferred_channel: ChannelType;
  availabilities: Availability[];
  // Documents
  has_picture: boolean;
  has_vision_test: boolean;
  has_first_aid: boolean;
  has_application_submitted: boolean;
  vision_test_date?: string | null; // Date of the vision test
  // Training Progress (Key = Topic ID, Value = Level/Boolean)
  practical_progress?: {
    current_stage: number;
    total_stages: number;
    completed_stages: number[];
  };
  training_progress?: Record<string, number>;
  // Theory Progress
  theory_status?: TheoryStatus;
  // Digital signatures (§ 31 FahrlG)
  signed_at?: string | null;
  signature_date?: string | null;
  student_signature?: string | null;
  instructor_signature?: string | null;
}

export interface Availability {
  id: string;
  weekday: number; // 1=Mo, 6=Sa
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

export type SessionType = 'driving' | 'theory' | 'practice';

export interface Session {
  id: string;
  student_id: string;
  student_name: string;
  zone: ZoneType;
  stage_day: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  used_joker: boolean;
  is_manual: boolean;
  confirmed: boolean;
  type?: SessionType;
  cancellation_reason?: string | null;
  notes?: string;
  interventions?: number;
  compliance_overridden?: boolean; // If a compliance violation was overridden
}

export interface WorkWindow {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxMinutes: number;
  blockedPeriods: { start: string; end: string }[];
}

export interface DashboardConfig {
    show_greeting: boolean;
    show_next_session: boolean;
    show_shortcuts: boolean;
    show_stats: boolean;
    show_sleepers: boolean;
    show_new_students: boolean;
    show_progress: boolean;
    show_tasks?: boolean;
    show_birthdays?: boolean;
    show_upcoming_exams?: boolean;
    show_missing_docs?: boolean;
    show_expiring_apps?: boolean;
    show_today_sessions?: boolean;
    show_expiring_theory?: boolean;
}

export interface PipelineStage {
  day: number;
  duration: number;
  description: string;
  isNight?: boolean;
  isHighway?: boolean;
}

export interface Pricing {
  base_amount: number;         // Grundbetrag (Anmeldung & Theorie)
  normal_lesson_45m: number;   // Normalfahrstunde
  special_lesson_45m: number;  // Sonderfahrt (ÜL, AB, Nacht)
  theory_exam_fee: number;     // Vorstellung zur Theorieprüfung
  practical_exam_fee: number;  // Vorstellung zur Praxisprüfung
}

export interface ComplianceEvent {
  id: string;
  timestamp: string;           // ISO String
  action: string;              // e.g. "Termin bestätigt", "Fahrstunde storniert", "Ausbildungsstand geändert", "Override"
  details: string;             // Detailed explanation
  studentId?: string;          // Optional student link
  instructorName?: string;     // Instructor who made the change
}

export interface Rules {
  gap_minutes: number;
  night_earliest_start: string;
  day11_overtime_minutes: number;
  use_day11_joker_if_needed: boolean;
  saturday_extend_allowed: boolean;
  application_expiration_days: number;
  application_warning_days: number;
  work_windows: Record<number, WorkWindow>;
  dashboard_config: DashboardConfig;
  pipeline: PipelineStage[];
  calendar_sync_enabled?: boolean;
  appearance_mode?: 'system' | 'light' | 'dark';
  gemini_api_key?: string;
  gemini_model?: string;
  ai_provider?: 'gemini' | 'openai' | 'openrouter' | 'ollama' | 'on_device';
  openai_api_key?: string;
  openai_model?: string;
  openrouter_api_key?: string;
  openrouter_model?: string;
  ollama_url?: string;
  ollama_model?: string;
  on_device_model_downloaded?: boolean;
  on_device_model_name?: string;
  proactive_agent_enabled?: boolean;
  proactive_sleeper_interval_days?: number;
  proactive_exam_check_enabled?: boolean;
  proactive_whatsapp_drafts_enabled?: boolean;
  proactive_vehicle_alerts_enabled?: boolean;
  agent_personality?: 'friendly' | 'professional' | 'strict';
  agent_execution_mode?: 'safe' | 'moderate' | 'risk';
  instructor_fortbildung_days?: number;      // § 33a FahrlG Fortbildungstage
  instructor_fortbildung_deadline?: string;  // § 33a FahrlG Fortbildungs-Frist
  instructor_last_fortbildung?: string;      // Letzte Fortbildung Datum
  // Benachrichtigungen
  notifications_enabled?: boolean;
  notification_lead_hours?: number;
  silent_hours_start?: string;
  silent_hours_end?: string;
  // Fahrschulprofil
  school_name?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_logo_text?: string;
  // Führerscheinklassen
  enabled_classes?: string[];  // e.g. ['B', 'BE', 'A']
  default_class?: string;
  // Prüfungsvorbereitung
  min_practice_hours_before_exam?: number;
  min_theory_lessons_before_exam?: number;
  exam_checklist_items?: string[];
  // Datenschutz
  app_lock_enabled?: boolean;
  auto_logout_minutes?: number;
  // Darstellung
  font_size?: 'small' | 'medium' | 'large';
  compact_mode?: boolean;
  // Sprache
  locale?: string;
  date_format?: string;
  currency?: string;
  // Fahrzeug
  vehicle_name?: string;
  vehicle_plate?: string;
  vehicle_tuev_date?: string;
  vehicle_hu_reminder?: boolean;
  // Kalender
  calendar_export_enabled?: boolean;
  calendar_sync_interval_minutes?: number;
  calendar_holidays_enabled?: boolean;
}

export interface CurriculumCategory {
  id: string;
  title: string;
  color: string; // Color name e.g. 'amber'
  items: { id: string; label: string }[];
}

export interface SystemError {
  id: string;
  timestamp: string;      // ISO string
  description: string;    // e.g. "Zeitberechnungs-Fehler..."
  agentResponseText?: string; // Optional context: what did the agent say?
  userQueryText?: string;     // Optional context: what did the user say?
  fixed?: boolean;
}

