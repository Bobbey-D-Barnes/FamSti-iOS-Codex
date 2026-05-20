import { Linking, Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import * as Notifications from 'expo-notifications';
import { db } from '../lib/storage';
import { Reminder, Session, Student } from '../types';
import { toISODate } from '../lib/utils';
import { normalizeAgentRoute } from './contextBuilder';
import { AgentOperation, AgentOperationRisk, AgentOperationType } from './types';
import { sessionFollowups } from './sessionFollowups';

type RouterLike = {
  push: (route: any) => void;
};

const OPERATION_LABELS: Record<AgentOperationType, string> = {
  SAVE_STUDENT: 'Schüler speichern',
  SAVE_SESSION: 'Termin speichern',
  SAVE_SESSIONS_BATCH: 'Termine gesammelt speichern',
  DELETE_SESSION: 'Termin löschen',
  DELETE_SESSIONS_BATCH: 'Termine gesammelt löschen',
  CONFIRM_SESSION: 'Termin bestätigen',
  CONFIRM_SESSIONS_BATCH: 'Termine gesammelt bestätigen',
  SNOOZE_SESSION_FOLLOWUP: 'Später an Fahrt erinnern',
  SCHEDULE_SESSION_FOLLOWUPS: 'Fahrt-Bestätigungen vormerken',
  SAVE_REMINDER: 'Erinnerung speichern',
  DELETE_REMINDER: 'Erinnerung löschen',
  NAVIGATE: 'Bereich öffnen',
  SEND_WHATSAPP: 'WhatsApp-Entwurf öffnen',
  SEARCH_WEB: 'Web-Recherche',
  SEARCH_DATABASE: 'Datenbank durchsuchen',
  SCHEDULE_NOTIFICATION: 'Meldung planen',
  ANALYZE_PROGRESS: 'Fortschritt analysieren',
  FIND_PLANNING_GAPS: 'Planungslücken finden',
  OPEN_STUDENT_PROFILE: 'Schülerprofil öffnen',
  CLEAR_PENDING: 'Bestätigungen verwerfen',
  LOG_SYSTEM_ERROR: 'Systemfehler protokollieren',
};

const RISK: Record<AgentOperationType, AgentOperationRisk> = {
  SAVE_STUDENT: 'medium',
  SAVE_SESSION: 'medium',
  SAVE_SESSIONS_BATCH: 'medium',
  DELETE_SESSION: 'high',
  DELETE_SESSIONS_BATCH: 'high',
  CONFIRM_SESSION: 'medium',
  CONFIRM_SESSIONS_BATCH: 'medium',
  SNOOZE_SESSION_FOLLOWUP: 'low',
  SCHEDULE_SESSION_FOLLOWUPS: 'low',
  SAVE_REMINDER: 'medium',
  DELETE_REMINDER: 'high',
  NAVIGATE: 'low',
  SEND_WHATSAPP: 'high',
  SEARCH_WEB: 'low',
  SEARCH_DATABASE: 'low',
  SCHEDULE_NOTIFICATION: 'low',
  ANALYZE_PROGRESS: 'low',
  FIND_PLANNING_GAPS: 'low',
  OPEN_STUDENT_PROFILE: 'low',
  CLEAR_PENDING: 'low',
  LOG_SYSTEM_ERROR: 'low',
};

export const CONFIRMATION_REQUIRED: Record<AgentOperationType, boolean> = {
  SAVE_STUDENT: true,
  SAVE_SESSION: true,
  SAVE_SESSIONS_BATCH: true,
  DELETE_SESSION: true,
  DELETE_SESSIONS_BATCH: true,
  CONFIRM_SESSION: true,
  CONFIRM_SESSIONS_BATCH: true,
  SNOOZE_SESSION_FOLLOWUP: false,
  SCHEDULE_SESSION_FOLLOWUPS: false,
  SAVE_REMINDER: true,
  DELETE_REMINDER: true,
  NAVIGATE: false,
  SEND_WHATSAPP: true,
  SEARCH_WEB: false,
  SEARCH_DATABASE: false,
  SCHEDULE_NOTIFICATION: false,
  ANALYZE_PROGRESS: false,
  FIND_PLANNING_GAPS: false,
  OPEN_STUDENT_PROFILE: false,
  CLEAR_PENDING: false,
  LOG_SYSTEM_ERROR: false,
};

export function describeAgentOperation(type: AgentOperationType, payload: Record<string, any>) {
  if (type === 'NAVIGATE') return `Öffne Bereich: ${normalizeAgentRoute(payload.route || payload.path || '/')}`;
  if (type === 'OPEN_STUDENT_PROFILE') return `Öffne Profil von Schüler ID ${payload.student_id || payload.id || ''}`;
  if (type === 'SAVE_STUDENT') return `${payload.first_name || 'Schüler'} ${payload.last_name || ''}`.trim();
  if (type === 'SAVE_SESSION') return `${payload.student_name || 'Termin'} ${payload.date || ''} ${payload.start_time || ''}`.trim();
  if (type === 'SAVE_SESSIONS_BATCH') return `${payload.sessions?.length || 0} Termine gesammelt einbuchen`;
  if (type === 'DELETE_SESSION') return `Termin ${payload.id || ''} löschen`.trim();
  if (type === 'DELETE_SESSIONS_BATCH') return `${payload.ids?.length || payload.session_ids?.length || 0} Termine gesammelt löschen`;
  if (type === 'CONFIRM_SESSION') return `Termin ${payload.id || payload.student_name || ''} bestätigen`.trim();
  if (type === 'CONFIRM_SESSIONS_BATCH') return `${payload.ids?.length || payload.session_ids?.length || 0} Fahrten gesammelt bestätigen`;
  if (type === 'SNOOZE_SESSION_FOLLOWUP') return 'Fahrt-Bestätigung später erneut fragen';
  if (type === 'SCHEDULE_SESSION_FOLLOWUPS') return `${payload.session_ids?.length || payload.sessions?.length || 0} Fahrt-Bestätigungen vormerken`;
  if (type === 'SAVE_REMINDER') return payload.title ? `Erinnerung: ${payload.title}` : 'Neue Erinnerung';
  if (type === 'DELETE_REMINDER') return `Erinnerung ${payload.id || ''} löschen`.trim();
  if (type === 'SEND_WHATSAPP') return `WhatsApp an ${payload.phone || 'Kontakt'} vorbereiten`;
  if (type === 'SEARCH_WEB') return `Recherchiere: ${payload.query || payload.q || 'Webfrage'}`;
  if (type === 'SEARCH_DATABASE') return `Suche in Datenbank nach: ${payload.query || ''}`;
  if (type === 'SCHEDULE_NOTIFICATION') return `Meldung '${payload.title || ''}' planen`;
  if (type === 'ANALYZE_PROGRESS') return `Fortschrittsanalyse für Schüler-ID ${payload.student_id || ''}`;
  if (type === 'FIND_PLANNING_GAPS') return 'Kalender nach freien Planungs-Lücken durchsuchen';
  if (type === 'CLEAR_PENDING') return 'Ausstehende Aktionen verwerfen';
  if (type === 'LOG_SYSTEM_ERROR') return `Systemfehler protokollieren: ${payload.description || ''}`;
  return OPERATION_LABELS[type];
}

export function normalizeAgentOperation(raw: any): AgentOperation | null {
  const type = raw?.type as AgentOperationType | undefined;
  if (!type || !OPERATION_LABELS[type]) return null;
  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : {};

  return {
    id: raw.id || uuidv4(),
    type,
    payload,
    summary: raw.summary || describeAgentOperation(type, payload),
    risk: RISK[type],
    requiresConfirmation:
      raw.requiresConfirmation !== undefined
        ? Boolean(raw.requiresConfirmation)
        : raw.requires_confirmation !== undefined
        ? Boolean(raw.requires_confirmation)
        : CONFIRMATION_REQUIRED[type],
  };
}

export function buildDefaultStudent(payload: Partial<Student>): Student {
  return {
    id: payload.id || uuidv4(),
    first_name: payload.first_name || 'Neuer',
    last_name: payload.last_name || 'Schüler',
    zone: payload.zone || 'Rosenheim',
    pickup_address: payload.pickup_address || '',
    next_stage_day: Number(payload.next_stage_day) || 1,
    max_sessions_per_week: Number(payload.max_sessions_per_week) || 3,
    theory_passed_at: payload.theory_passed_at ?? null,
    practical_exam_at: payload.practical_exam_at ?? null,
    notes: payload.notes || '',
    phone: payload.phone || '',
    email: payload.email || '',
    birth_date: payload.birth_date || '',
    license_class: payload.license_class || 'B',
    previous_class: payload.previous_class || 'None',
    needs_vision_aid: Boolean(payload.needs_vision_aid),
    application_date: payload.application_date || toISODate(new Date()),
    application_approval_date: payload.application_approval_date ?? null,
    preferred_channel: payload.preferred_channel || 'whatsapp',
    availabilities: payload.availabilities || [],
    has_picture: Boolean(payload.has_picture),
    has_vision_test: Boolean(payload.has_vision_test),
    has_first_aid: Boolean(payload.has_first_aid),
    has_application_submitted: Boolean(payload.has_application_submitted),
    theory_status: payload.theory_status,
    training_progress: payload.training_progress,
    practical_progress: payload.practical_progress,
  };
}

export function buildDefaultSession(payload: Partial<Session>): Session {
  return {
    id: payload.id || uuidv4(),
    student_id: payload.student_id || '',
    student_name: payload.student_name || 'Unbekannter Schüler',
    zone: payload.zone || 'Rosenheim',
    stage_day: Number(payload.stage_day) || 1,
    date: payload.date || toISODate(new Date()),
    start_time: payload.start_time || '14:00',
    end_time: payload.end_time || '15:30',
    duration_minutes: Number(payload.duration_minutes) || 90,
    used_joker: Boolean(payload.used_joker),
    is_manual: payload.is_manual ?? true,
    confirmed: Boolean(payload.confirmed),
    type: payload.type || 'driving',
    cancellation_reason: payload.cancellation_reason,
    notes: payload.notes,
    interventions: payload.interventions,
  };
}

export function buildDefaultReminder(payload: Partial<Reminder> & { date?: string }): Reminder {
  return {
    id: payload.id || uuidv4(),
    title: payload.title || 'Erinnerung',
    description: payload.description || 'Vom Copilot vorgeschlagen',
    due_date: payload.due_date || payload.date || toISODate(new Date()),
    type: payload.type || 'custom',
    related_student_id: payload.related_student_id,
    related_session_id: payload.related_session_id,
    is_completed: Boolean(payload.is_completed),
    is_dismissed: Boolean(payload.is_dismissed),
  };
}

export async function executeAgentOperation(operation: AgentOperation, router: RouterLike): Promise<string> {
  const payload = operation.payload || {};

  if (operation.type === 'NAVIGATE') {
    const route = normalizeAgentRoute(payload.route || payload.path || '/');
    router.push(route as any);
    return `Geöffnet: ${route}`;
  }

  if (operation.type === 'OPEN_STUDENT_PROFILE') {
    const studentId = payload.student_id || payload.id;
    if (!studentId) return 'Schüler-ID fehlt.';
    router.push(`/schueler/${studentId}`);
    return `Öffne Profil von Schüler ID ${studentId}`;
  }

  if (operation.type === 'SAVE_STUDENT') {
    const existing = payload.id ? await db.getStudent(payload.id) : undefined;
    await db.saveStudent(existing ? ({ ...existing, ...payload } as Student) : buildDefaultStudent(payload));
    return 'Schüler gespeichert';
  }

  if (operation.type === 'SAVE_SESSION') {
    const existing = payload.id ? (await db.getSessions()).find((s) => s.id === payload.id) : undefined;
    const sessionToSave = existing
      ? ({
          ...existing,
          ...payload,
          confirmed: payload.confirmed !== undefined ? Boolean(payload.confirmed) : existing.confirmed,
        } as Session)
      : buildDefaultSession(payload);
    await db.saveSession(sessionToSave);
    return 'Termin gespeichert';
  }

  if (operation.type === 'SAVE_SESSIONS_BATCH') {
    const sessionsPayload = Array.isArray(payload.sessions) ? payload.sessions : [];
    const savedSessions: Session[] = [];
    for (const rawSession of sessionsPayload) {
      const existing = rawSession.id ? (await db.getSessions()).find((s) => s.id === rawSession.id) : undefined;
      const sessionToSave = existing
        ? ({
            ...existing,
            ...rawSession,
            confirmed: rawSession.confirmed !== undefined ? Boolean(rawSession.confirmed) : existing.confirmed,
          } as Session)
        : buildDefaultSession(rawSession);
      await db.saveSession(sessionToSave);
      savedSessions.push(sessionToSave);
    }
    if (payload.schedule_followups !== false) {
      await sessionFollowups.scheduleForSessions(savedSessions);
    }
    return `${savedSessions.length} Termine gespeichert`;
  }

  if (operation.type === 'DELETE_SESSION' && payload.id) {
    await db.deleteSession(payload.id);
    return 'Termin gelöscht';
  }

  if (operation.type === 'DELETE_SESSIONS_BATCH') {
    const ids = (payload.ids || payload.session_ids || []) as string[];
    for (const id of ids) {
      await db.deleteSession(id);
    }
    return `${ids.length} Termine gelöscht`;
  }

  if (operation.type === 'CONFIRM_SESSION') {
    const sessions = await db.getSessions();
    const session = sessions.find((item) => item.id === payload.id) || buildDefaultSession(payload);
    const confirmed = payload.confirmed !== undefined ? Boolean(payload.confirmed) : true;
    if (confirmed) {
      await db.confirmSession(session);
      await sessionFollowups.completeBySession(session.id);
      return 'Termin bestätigt';
    } else {
      await db.saveSession({ ...session, confirmed: false });
      return 'Terminbestätigung zurückgenommen';
    }
  }

  if (operation.type === 'CONFIRM_SESSIONS_BATCH') {
    const ids = (payload.ids || payload.session_ids || []) as string[];
    const sessions = await db.getSessions();
    let count = 0;
    for (const id of ids) {
      const session = sessions.find((item) => item.id === id);
      if (!session) continue;
      await db.confirmSession(session);
      await sessionFollowups.completeBySession(session.id);
      count += 1;
    }
    return `${count} Fahrten bestätigt`;
  }

  if (operation.type === 'SNOOZE_SESSION_FOLLOWUP') {
    const id = payload.followup_id || payload.id;
    if (!id) return 'Wiedervorlage fehlt.';
    await sessionFollowups.snooze(id, Number(payload.minutes) || 15);
    return 'Ich frage später noch einmal nach.';
  }

  if (operation.type === 'SCHEDULE_SESSION_FOLLOWUPS') {
    const sessions = Array.isArray(payload.sessions)
      ? payload.sessions.map(buildDefaultSession)
      : (await db.getSessions()).filter((session) => (payload.session_ids || []).includes(session.id));
    await sessionFollowups.scheduleForSessions(sessions);
    return `${sessions.length} Fahrt-Bestätigungen vorgemerkt`;
  }

  if (operation.type === 'LOG_SYSTEM_ERROR') {
    const errorLog = {
      id: payload.id || `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: payload.timestamp || new Date().toISOString(),
      description: payload.description || 'Unspezifizierter Fehler',
      agentResponseText: payload.agentResponseText || '',
      userQueryText: payload.userQueryText || '',
      fixed: false,
    };
    await db.saveSystemError(errorLog);
    return 'Systemfehler erfolgreich protokolliert.';
  }

  if (operation.type === 'SAVE_REMINDER') {
    await db.saveReminder(buildDefaultReminder(payload));
    return 'Erinnerung gespeichert';
  }

  if (operation.type === 'DELETE_REMINDER' && payload.id) {
    await db.deleteReminder(payload.id);
    return 'Erinnerung gelöscht';
  }

  if (operation.type === 'SEND_WHATSAPP') {
    const phone = String(payload.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(String(payload.text || ''));
    const nativeUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const webUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
    const supported = await Linking.canOpenURL(nativeUrl).catch(() => false);
    await Linking.openURL(supported ? nativeUrl : webUrl);
    return 'WhatsApp-Entwurf geöffnet';
  }

  if (operation.type === 'SEARCH_WEB') {
    return 'Web-Recherche abgeschlossen';
  }

  if (operation.type === 'SEARCH_DATABASE') {
    const q = String(payload.query || '').toLowerCase().trim();
    const table = payload.table;
    const results: string[] = [];

    if (!table || table === 'students') {
      const students = await db.getStudents();
      const filtered = students.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.email.toLowerCase().includes(q)
      );
      results.push(...filtered.map((s) => `Schüler: ${s.first_name} ${s.last_name} (Stufe ${s.next_stage_day}, ID: ${s.id})`));
    }

    if (!table || table === 'sessions') {
      const sessions = await db.getSessions();
      const filtered = sessions.filter(
        (s) => s.student_name.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q)
      );
      results.push(...filtered.map((s) => `Termin: ${s.date} ${s.start_time}, ${s.student_name} (${s.type || 'driving'})`));
    }

    if (!table || table === 'reminders') {
      const reminders = await db.getReminders();
      const filtered = reminders.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      );
      results.push(...filtered.map((r) => `Erinnerung: ${r.title} (Fällig: ${r.due_date})`));
    }

    return results.length > 0
      ? `Datenbank-Treffer:\n${results.slice(0, 10).join('\n')}`
      : 'Keine passenden Einträge in der Datenbank gefunden.';
  }

  if (operation.type === 'SCHEDULE_NOTIFICATION') {
    const title = payload.title || 'FamSti Copilot';
    const body = payload.body || 'Erinnerung geplant';
    const seconds = Number(payload.triggerSeconds) || 5;

    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
      });
    }
    return `Erinnerung geplant in ${seconds} Sekunden.`;
  }

  if (operation.type === 'ANALYZE_PROGRESS') {
    const studentId = payload.student_id || payload.id;
    if (!studentId) return 'Schüler-ID fehlt.';
    const student = await db.getStudent(studentId);
    if (!student) return 'Schüler nicht gefunden.';
    const stage = student.next_stage_day;
    const progress = student.theory_status?.learning_progress || 0;
    const passedSims = student.theory_status?.simulations_passed || 0;
    return `Fortschritt für ${student.first_name} ${student.last_name}:\n- Praxis: Stufe ${stage}/19\n- Theorie: ${progress}% gelernt, ${passedSims}/5 Prüfungssimulationen bestanden.`;
  }

  if (operation.type === 'FIND_PLANNING_GAPS') {
    const sessions = await db.getSessions();
    const today = toISODate(new Date());
    const upcoming = sessions.filter((s) => s.date >= today).length;
    return `Planungs-Auszug:\n- Sie haben aktuell ${upcoming} geplante Termine.\n- Vorschlag: Prüfen Sie Dienstag- und Donnerstagvormittag für potenzielle Lücken.`;
  }

  if (operation.type === 'CLEAR_PENDING') {
    return 'Bestätigungen verworfen.';
  }

  throw new Error(`${OPERATION_LABELS[operation.type]} konnte nicht ausgeführt werden.`);
}

export function getAgentOperationLabel(operation: AgentOperation) {
  return OPERATION_LABELS[operation.type];
}
