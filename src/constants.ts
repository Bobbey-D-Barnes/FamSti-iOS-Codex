// Direct copy from PWA – pure TypeScript, no DOM dependencies

import { PipelineStage, Rules, Student, WorkWindow, CurriculumCategory } from './types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const PIPELINE: PipelineStage[] = [
  // Tag 1-3: Grundfahrten (1x 60min)
  { day: 1, duration: 60, description: 'Grundfahrten 1' },
  { day: 2, duration: 60, description: 'Grundfahrten 2' },
  { day: 3, duration: 60, description: 'Grundfahrten 3' },
  
  // Tag 4-8: Erweiterte Fahrten (2x45min = 90min)
  { day: 4, duration: 90, description: 'Erweiterte Fahrt 1' },
  { day: 5, duration: 90, description: 'Erweiterte Fahrt 2' },
  { day: 6, duration: 90, description: 'Erweiterte Fahrt 3' },
  { day: 7, duration: 90, description: 'Erweiterte Fahrt 4' },
  { day: 8, duration: 90, description: 'Erweiterte Fahrt 5' },
  
  // Tag 9: Überland 1 & 2 (2x45min = 90min) - DOKUMENTE PFLICHT
  { day: 9, duration: 90, description: 'Überland 1 & 2', isHighway: true },
  
  // Tag 10: Überland 3 & 4 (2x45min = 90min)
  { day: 10, duration: 90, description: 'Überland 3 & 4', isHighway: true },
  
  // Tag 11: 1x Grundfahrt + Autobahn 1,2,3 (4x45min = 180min)
  { day: 11, duration: 180, description: 'Autobahn (komplett)', isHighway: true },
  
  // Tag 12: Nachtfahrt 1,2,3 (3x45min = 135min) - Start >= 17:30 (Winter 16:30 per Config)
  { day: 12, duration: 135, description: 'Nachtfahrt', isNight: true },
  
  // Tag 13-15: Prüfungsvorbereitung (2x45min = 90min)
  { day: 13, duration: 90, description: 'Prüfungsvorbereitung 1' },
  { day: 14, duration: 90, description: 'Prüfungsvorbereitung 2' },
  { day: 15, duration: 90, description: 'Prüfungsvorbereitung 3' },
  
  // Tag 16: 1x Überland + 1x Autobahn (2x45min = 90min)
  { day: 16, duration: 90, description: 'ÜL + AB Wiederholung', isHighway: true },
  
  // Tag 17-18: Prüfungsvorbereitung (2x45min = 90min)
  { day: 17, duration: 90, description: 'Prüfungsvorbereitung 4' },
  { day: 18, duration: 90, description: 'Prüfungssimulation' },
];

export const PIPELINE_BE: PipelineStage[] = [
  { day: 1, duration: 60, description: 'Grundfahrten Anhänger' },
  { day: 2, duration: 90, description: 'Rückwärtsfahren / Ankuppeln' },
  { day: 3, duration: 90, description: 'Überland BE', isHighway: true },
  { day: 4, duration: 90, description: 'Autobahn BE', isHighway: true },
  { day: 5, duration: 90, description: 'Nachtfahrt BE', isNight: true },
  { day: 6, duration: 90, description: 'Prüfungsvorbereitung BE' },
];

export const PIPELINE_UMSCHREIBER: PipelineStage[] = [
  { day: 1, duration: 90, description: 'Kompetenzcheck' },
  { day: 2, duration: 90, description: 'Gefahrenbereiche / Stadt' },
  { day: 3, duration: 90, description: 'Prüfungsvorbereitung' },
  { day: 4, duration: 90, description: 'Prüfungssimulation' },
];

export const getPipelineForStudent = (student: Student, fallback: PipelineStage[] = PIPELINE): PipelineStage[] => {
  if (student.license_class?.toUpperCase() === 'BE') return PIPELINE_BE;
  const previousClass = (student.previous_class || '').toLowerCase();
  const notes = (student.notes || '').toLowerCase();
  if (notes.includes('umschreiber') || (previousClass && previousClass !== 'keine' && previousClass !== 'none')) {
    return PIPELINE_UMSCHREIBER;
  }
  return fallback;
};

export const CURRICULUM: CurriculumCategory[] = [
  {
    id: 'grundstufe',
    title: 'Grundstufe',
    color: 'orange',
    items: [
      { id: 'einweisung', label: 'Einweisung am Fzg.' },
      { id: 'sitz', label: 'Sitz / Spiegel / Gurt' },
      { id: 'motor', label: 'Motor anlassen' },
      { id: 'anfahren', label: 'Anfahren / Anhalten' },
      { id: 'lenken', label: 'Lenkradhaltung' },
      { id: 'schalten', label: 'Schalten / Wählhebel' },
      { id: 'pedale', label: 'Pedale' }
    ]
  },
  {
    id: 'grundfahraufgaben',
    title: 'Grundfahraufgaben',
    color: 'amber',
    items: [
      { id: 'rueckwaerts', label: 'Rückwärtsfahren' },
      { id: 'umkehren', label: 'Umkehren' },
      { id: 'einparken_laengs', label: 'Einparken Längs' },
      { id: 'einparken_quer', label: 'Einparken Quer' },
      { id: 'gefahrenbremsung', label: 'Gefahrenbremsung' }
    ]
  },
  {
    id: 'aufbaustufe',
    title: 'Aufbaustufe',
    color: 'blue',
    items: [
      { id: 'umwelt', label: 'Umweltbewusstes Fahren' },
      { id: 'blick', label: 'Blicktechnik' },
      { id: 'verkehr', label: 'Verkehrsbeobachtung' },
      { id: 'vorfahrt', label: 'Vorfahrt' },
      { id: 'abbiegen', label: 'Abbiegen' },
      { id: 'spurwechsel', label: 'Fahrstreifenwechsel' },
      { id: 'einfadeln', label: 'Einordnen' }
    ]
  },
  {
    id: 'leistungsstufe',
    title: 'Leistungsstufe',
    color: 'red',
    items: [
      { id: 'autobahn', label: 'Autobahn' },
      { id: 'ueberland', label: 'Überland' },
      { id: 'nacht', label: 'Nachtfahrt' },
      { id: 'schwierig', label: 'Schwierige Verkehrslagen' }
    ]
  }
];

export const DEFAULT_WORK_WINDOW: WorkWindow = {
  startTime: '08:00',
  endTime: '17:00',
  maxMinutes: 540,
  blockedPeriods: [],
};

export const DEFAULT_RULES: Rules = {
  gap_minutes: 15,
  night_earliest_start: '17:30',
  day11_overtime_minutes: 30,
  use_day11_joker_if_needed: true,
  saturday_extend_allowed: false,
  application_expiration_days: 365,
  application_warning_days: 90,
  work_windows: {
    1: { ...DEFAULT_WORK_WINDOW },
    2: { ...DEFAULT_WORK_WINDOW },
    3: { ...DEFAULT_WORK_WINDOW },
    4: { ...DEFAULT_WORK_WINDOW },
    5: { ...DEFAULT_WORK_WINDOW },
    6: { ...DEFAULT_WORK_WINDOW, startTime: '09:00', endTime: '13:00', maxMinutes: 240 },
  },
  dashboard_config: {
      show_greeting: true,
      show_next_session: true,
      show_shortcuts: true,
      show_stats: true,
      show_sleepers: true,
      show_new_students: true,
      show_progress: true,
      show_tasks: true,
      show_birthdays: true,
      show_upcoming_exams: true,
      show_missing_docs: true,
      show_expiring_apps: true,
      show_today_sessions: true,
      show_expiring_theory: true
  },
  pipeline: PIPELINE,
  calendar_sync_enabled: false,
  appearance_mode: 'system',
  ai_provider: 'gemini',
  gemini_model: 'gemini-3.5-flash',
  openai_model: 'gpt-4o-mini',
  openrouter_model: 'google/gemini-3.5-flash',
  ollama_url: 'http://localhost:11434',
  ollama_model: 'llama3',
  on_device_model_downloaded: false,
  on_device_model_name: 'Gemma lokal',
  proactive_agent_enabled: false,
  proactive_sleeper_interval_days: 14,
  proactive_exam_check_enabled: true,
  proactive_whatsapp_drafts_enabled: false,
  proactive_vehicle_alerts_enabled: true,
  agent_personality: 'friendly',
  agent_execution_mode: 'safe'
};

export const DEMO_STUDENTS: Student[] = [
  {
    id: uuidv4(),
    first_name: 'Max',
    last_name: 'Müller',
    zone: 'Rosenheim',
    pickup_address: 'Bahnhofstr. 1',
    next_stage_day: 5,
    max_sessions_per_week: 3,
    phone: '+4917012345601',
    email: 'max.mueller@example.com',
    birth_date: '2007-05-15',
    license_class: 'B',
    previous_class: 'AM',
    needs_vision_aid: false,
    preferred_channel: 'whatsapp',
    application_date: '2025-12-01',
    application_approval_date: '2026-01-15',
    availabilities: [
      { id: uuidv4(), weekday: 1, start_time: '08:00', end_time: '12:00' },
      { id: uuidv4(), weekday: 3, start_time: '08:00', end_time: '12:00' },
      { id: uuidv4(), weekday: 5, start_time: '08:00', end_time: '12:00' },
    ],
    notes: 'Schneller Lerner',
    theory_passed_at: '2026-01-10',
    practical_exam_at: null,
    has_picture: true,
    has_vision_test: true,
    has_first_aid: true,
    has_application_submitted: true,
    training_progress: {
      'einweisung': 1,
      'sitz': 1,
      'motor': 1,
      'anfahren': 1
    }
  },
  {
    id: uuidv4(),
    first_name: 'Lisa',
    last_name: 'Schmidt',
    zone: 'Haidholzen',
    pickup_address: 'Dorfplatz 3',
    next_stage_day: 11,
    max_sessions_per_week: 2,
    phone: '+4917012345602',
    email: 'lisa.schmidt@example.com',
    birth_date: '2007-11-20',
    license_class: 'B',
    previous_class: 'Keine',
    needs_vision_aid: true,
    preferred_channel: 'phone',
    application_date: '2025-11-15',
    application_approval_date: null,
    availabilities: [
      { id: uuidv4(), weekday: 2, start_time: '14:00', end_time: '18:00' },
      { id: uuidv4(), weekday: 4, start_time: '14:00', end_time: '18:00' },
    ],
    notes: '',
    theory_passed_at: null,
    practical_exam_at: null,
    has_picture: false,
    has_vision_test: false,
    has_first_aid: false,
    has_application_submitted: true
  },
  {
    id: uuidv4(),
    first_name: 'Anna',
    last_name: 'Bauer',
    zone: 'Rosenheim',
    pickup_address: 'Innstraße 45',
    next_stage_day: 12,
    max_sessions_per_week: 2,
    phone: '+4917012345604',
    email: 'anna.bauer@example.com',
    birth_date: '2006-03-10',
    license_class: 'B',
    previous_class: 'A1',
    needs_vision_aid: false,
    preferred_channel: 'sms',
    application_date: '2025-02-01',
    application_approval_date: '2025-03-01',
    availabilities: [
      { id: uuidv4(), weekday: 3, start_time: '17:00', end_time: '20:00' },
      { id: uuidv4(), weekday: 5, start_time: '17:00', end_time: '20:00' },
    ],
    notes: 'Braucht Nachtfahrt',
    theory_passed_at: '2026-01-05',
    practical_exam_at: null,
    has_picture: true,
    has_vision_test: true,
    has_first_aid: true,
    has_application_submitted: true
  },
];

export const EXTRA_DEMO_STUDENTS: Student[] = Array.from({ length: 30 }).map((_, i) => {
  const zones = ['Rosenheim', 'Haidholzen', 'Prutting'] as const;
  const firstNames = [
    'Lukas',
    'Julia',
    'Tim',
    'Laura',
    'Felix',
    'Marie',
    'Jan',
    'Sophie',
    'Paul',
    'Lena',
    'Leon',
    'Mia',
    'Jonas',
    'Lea',
    'Elias',
    'Hanna',
    'David',
    'Emma',
    'Julian',
    'Clara',
    'Simon',
    'Lara',
    'Ben',
    'Sarah',
    'Noah',
    'Nele',
    'Philipp',
    'Johanna',
    'Moritz',
    'Emily',
  ];
  const lastNames = [
    'Weber',
    'Wagner',
    'Becker',
    'Hoffmann',
    'Schäfer',
    'Koch',
    'Bauer',
    'Richter',
    'Klein',
    'Wolf',
    'Schröder',
    'Neumann',
    'Schwarz',
    'Zimmermann',
    'Braun',
    'Krüger',
    'Hofmann',
    'Hartmann',
    'Lange',
    'Schmitt',
    'Werner',
    'Schmitz',
    'Krause',
    'Meier',
    'Lehmann',
    'Schmid',
    'Schulze',
    'Maier',
    'Köhler',
    'Herrmann',
  ];
  const idx = i % firstNames.length;
  const zone = zones[i % zones.length];
  const pattern = i % 5;
  const availabilities =
    pattern === 0
      ? [1, 2, 3, 4, 5].map((d) => ({ id: `demo-avail-${i}-${d}`, weekday: d, start_time: '13:30', end_time: '18:00' }))
      : pattern === 1
        ? [1, 2, 3, 4, 5].map((d) => ({ id: `demo-avail-${i}-${d}`, weekday: d, start_time: '08:00', end_time: '12:30' }))
        : pattern === 2
          ? [1, 3].map((d) => ({ id: `demo-avail-${i}-${d}`, weekday: d, start_time: '08:00', end_time: '18:00' }))
          : pattern === 3
            ? [2, 4].map((d) => ({ id: `demo-avail-${i}-${d}`, weekday: d, start_time: '16:00', end_time: '20:00' }))
            : [
                { id: `demo-avail-${i}-5`, weekday: 5, start_time: '13:00', end_time: '18:00' },
                { id: `demo-avail-${i}-6`, weekday: 6, start_time: '09:00', end_time: '14:00' },
              ];

  return {
    id: `demo-${String(i + 1).padStart(2, '0')}`,
    first_name: firstNames[idx],
    last_name: lastNames[idx],
    zone,
    pickup_address: zone === 'Rosenheim' ? 'Salinstr. 10' : zone === 'Haidholzen' ? 'Schulstraße 5' : 'Dorfstraße 12',
    next_stage_day: (i % 18) + 1,
    max_sessions_per_week: pattern === 2 ? 3 : 2,
    theory_passed_at: i % 2 === 0 ? '2025-06-01' : null,
    practical_exam_at: null,
    notes: i % 10 === 0 ? 'Sehr nervös' : '',
    phone: `+4917000000${String(i).padStart(2, '0')}`,
    email: `demo${i}@test.com`,
    birth_date: '2006-01-01',
    license_class: 'B',
    previous_class: i % 5 === 0 ? 'AM' : 'Keine',
    needs_vision_aid: i % 3 === 0,
    application_date: '2025-01-01',
    application_approval_date: '2025-02-01',
    preferred_channel: i % 2 === 0 ? 'whatsapp' : 'phone',
    availabilities,
    has_picture: true,
    has_vision_test: true,
    has_first_aid: true,
    has_application_submitted: true,
    training_progress: {},
  };
});
