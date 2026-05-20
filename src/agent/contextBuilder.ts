import { db } from '../lib/storage';
import { AgentContext } from './types';
import { agentMemoryStore } from './memoryStore';
import { retrieveKnowledgeCards } from './knowledgeBase';
import { toISODate } from '../lib/utils';

const SCREEN_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/schueler': 'Schülerverwaltung',
  '/planer': 'Planer',
  '/termine': 'Termine',
  '/erinnerungen': 'Erinnerungen',
  '/pruefungen': 'Prüfungen',
  '/cockpit': 'Cockpit',
  '/finanzen': 'Finanzen',
  '/fahrzeug': 'Fahrzeug',
  '/analytik': 'Analytik',
  '/behoerden': 'Behörden',
  '/marketing': 'Marketing',
  '/compliance': 'Compliance',
  '/einstellungen': 'Einstellungen',
};

export const routeAliases: Record<string, string> = {
  dashboard: '/',
  dash: '/',
  home: '/',
  schueler: '/schueler',
  'schüler': '/schueler',
  planer: '/planer',
  planung: '/planer',
  termine: '/termine',
  kalender: '/termine',
  erinnerungen: '/erinnerungen',
  alerts: '/erinnerungen',
  pruefungen: '/pruefungen',
  'prüfungen': '/pruefungen',
  cockpit: '/cockpit',
  finanzen: '/finanzen',
  fahrzeug: '/fahrzeug',
  analytik: '/analytik',
  behoerden: '/behoerden',
  'behörden': '/behoerden',
  marketing: '/marketing',
  compliance: '/compliance',
  einstellungen: '/einstellungen',
  setup: '/einstellungen',
};

export function normalizeAgentRoute(route: string) {
  const lower = String(route || '').trim().toLowerCase();
  if (!lower) return '/';
  if (routeAliases[lower]) return routeAliases[lower];
  const normalized = lower.startsWith('/') ? lower : `/${lower}`;
  return Object.values(routeAliases).includes(normalized) ? normalized : '/';
}

export function getScreenLabel(path: string) {
  const normalized = normalizeAgentRoute(path);
  return SCREEN_LABELS[normalized] || (path.includes('/schueler/') ? 'Schülerdetail' : 'App');
}

export async function buildAgentContext(currentPath: string, query = ''): Promise<AgentContext> {
  const [students, sessions, reminders, rules, memory, learningProfile] = await Promise.all([
    db.getStudents(),
    db.getSessions(),
    db.getReminders(),
    db.getRules(),
    agentMemoryStore.getMemory(),
    agentMemoryStore.getLearningProfile(),
  ]);

  // Extract active student ID from path if present (e.g. /schueler/123 or studentId=123)
  let activeStudentId: string | null = null;
  if (currentPath.includes('/schueler/')) {
    const parts = currentPath.split('/schueler/');
    if (parts.length > 1) {
      activeStudentId = parts[1].split('?')[0];
    }
  } else if (currentPath.includes('studentId=')) {
    const match = currentPath.match(/studentId=([^&]+)/);
    if (match) {
      activeStudentId = match[1];
    }
  }

  // Prioritize active student in students list
  if (activeStudentId) {
    const activeStudentIndex = students.findIndex((s) => s.id === activeStudentId);
    if (activeStudentIndex >= 0) {
      const [activeStudent] = students.splice(activeStudentIndex, 1);
      students.unshift(activeStudent);
    }
  }

  const knowledgeCards = await retrieveKnowledgeCards(query, currentPath);

  return {
    currentPath,
    currentScreen: getScreenLabel(currentPath),
    students,
    sessions,
    reminders,
    rules,
    memory,
    learningProfile,
    knowledgeCards,
  };
}

export function summarizeAgentContext(context: AgentContext) {
  const today = toISODate(new Date());
  const openReminders = context.reminders.filter((reminder) => !reminder.is_completed && !reminder.is_dismissed);
  const futureSessions = context.sessions
    .filter((session) => session.date >= today && !session.cancellation_reason)
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));

  // Extract active student ID from path
  let activeStudentId: string | null = null;
  if (context.currentPath.includes('/schueler/')) {
    const parts = context.currentPath.split('/schueler/');
    if (parts.length > 1) {
      activeStudentId = parts[1].split('?')[0];
    }
  } else if (context.currentPath.includes('studentId=')) {
    const match = context.currentPath.match(/studentId=([^&]+)/);
    if (match) {
      activeStudentId = match[1];
    }
  }

  let activeStudentHeader = '';
  if (activeStudentId) {
    const activeStudent = context.students.find((s) => s.id === activeStudentId);
    if (activeStudent) {
      activeStudentHeader = `
GEÖFFNETER SCHÜLER (AKTIVER SCREEN-KONTEXT):
- ID: ${activeStudent.id}
- Name: ${activeStudent.first_name} ${activeStudent.last_name}
- Klasse: ${activeStudent.license_class}
- Ausbildungsstufe: Tag ${activeStudent.next_stage_day} von 19
- Pickup: ${activeStudent.pickup_address || 'nicht angegeben'}
- Telefon: ${activeStudent.phone || 'keine'}
- E-Mail: ${activeStudent.email || 'keine'}
- Geburt: ${activeStudent.birth_date || 'unbekannt'}
- Anmeldedatum: ${activeStudent.application_date || 'unbekannt'}
- Sehtest: ${activeStudent.needs_vision_aid ? 'Brille/Sehhilfe' : 'keine Sehhilfe'} / Dokument ${activeStudent.has_vision_test ? 'vorhanden' : 'fehlt'}
- Erste Hilfe: ${activeStudent.has_first_aid ? 'vorhanden' : 'fehlt'}
- Passbild: ${activeStudent.has_picture ? 'vorhanden' : 'fehlt'}
- Behördenantrag eingereicht: ${activeStudent.has_application_submitted ? 'ja' : 'nein'} (Genehmigt am: ${activeStudent.application_approval_date || 'noch offen'}, Läuft ab am: ${activeStudent.application_expiry_date || 'noch offen'})
- Theorie bestanden: ${activeStudent.theory_passed_at ? activeStudent.theory_passed_at : 'offen'} (Geplant: ${activeStudent.planned_theory_exam_at || 'nicht geplant'})
- Praxis bestanden: ${activeStudent.practical_exam_at ? activeStudent.practical_exam_at : 'offen'} (Geplant: ${activeStudent.planned_practical_exam_at || 'nicht geplant'})
- Fortschritt: ${activeStudent.training_progress ? JSON.stringify(activeStudent.training_progress) : 'keine Einträge'}
- Notizen: ${activeStudent.notes || 'keine'}
`;
    }
  }

  return `
AKTUELLER SCREEN:
- Datum heute: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${today})
- Pfad: ${context.currentPath}
- Bereich: ${context.currentScreen}
${activeStudentHeader}
SCHÜLER AUSZUG:
${context.students
  .slice(0, 25)
  .map(
    (student) =>
      `- ${student.id}: ${student.first_name} ${student.last_name}, Klasse ${student.license_class}, Stufe ${student.next_stage_day}, Zone ${student.zone}, Tel ${student.phone || 'keine'}, Theorie ${student.theory_passed_at ? 'bestanden' : 'offen'}`
  )
  .join('\n') || '- keine Schüler'}

NÄCHSTE TERMINE:
${futureSessions
  .slice(0, 25)
  .map((session) => `- ${session.id}: ${session.date} ${session.start_time}-${session.end_time}, ${session.student_name}, ${session.type || 'driving'}, bestätigt ${session.confirmed ? 'ja' : 'nein'}`)
  .join('\n') || '- keine Termine'}

OFFENE ERINNERUNGEN:
${openReminders
  .slice(0, 15)
  .map((reminder) => `- ${reminder.id}: ${reminder.due_date}, ${reminder.title}, Typ ${reminder.type}`)
  .join('\n') || '- keine offenen Erinnerungen'}

APP-REGELN:
- KI-Provider: ${context.rules.ai_provider || 'gemini'}
- Agent-Persönlichkeit: ${context.rules.agent_personality || 'friendly'}
- Ausführungsmodus: ${context.rules.agent_execution_mode || 'safe'}
- Proaktiv: ${context.rules.proactive_agent_enabled ? 'aktiv' : 'aus'}
- Pause zwischen Terminen: ${context.rules.gap_minutes} Minuten

LANGZEIT-GEDÄCHTNIS:
${context.memory.map((fact, index) => `${index + 1}. ${fact}`).join('\n') || '- leer'}

LERNPROFIL:
- Name: ${context.learningProfile.userName || 'unbekannt'}
- Fahrschule: ${context.learningProfile.drivingSchoolName || 'unbekannt'}
- Kommunikationsstil: ${context.learningProfile.communicationStyle}
- Arbeitszeiten/Timing: ${context.learningProfile.preferredWorkingTimes.join(' | ') || 'keine'}
- Planungspräferenzen: ${context.learningProfile.planningPreferences.join(' | ') || 'keine'}
- Unterrichtspräferenzen: ${context.learningProfile.teachingPreferences.join(' | ') || 'keine'}
- Business-Präferenzen: ${context.learningProfile.businessPreferences.join(' | ') || 'keine'}
- App-Vorlieben: ${context.learningProfile.appPreferences.join(' | ') || 'keine'}
- Wiederkehrende Themen: ${context.learningProfile.recurringTopics.join(' | ') || 'keine'}
- Wichtige Hinweise: ${context.learningProfile.importantNotes.join(' | ') || 'keine'}

RELEVANTES FAMSTI-WISSEN:
${context.knowledgeCards.map((card) => `- ${card.title} (${card.category}): ${card.content}`).join('\n') || '- keine Wissenskarten gefunden'}
  `.trim();
}
