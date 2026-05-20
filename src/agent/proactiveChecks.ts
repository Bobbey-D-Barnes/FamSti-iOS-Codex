import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/storage';
import { normalizeAgentOperation } from './tools';
import { toISODate } from '../lib/utils';
import { AgentProactiveInsight, AgentProactiveInsightType } from './types';

const DISMISSED_KEY = 'fc_agent_proactive_dismissed';
const DAY_MS = 1000 * 60 * 60 * 24;

const todayISO = () => toISODate(new Date());

const daysBetween = (from: Date, to: Date) => Math.ceil((to.getTime() - from.getTime()) / DAY_MS);

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

const op = (type: string, payload: Record<string, any>) => normalizeAgentOperation({ type, payload });

const makeInsight = (params: {
  id: string;
  type: AgentProactiveInsightType;
  title: string;
  body: string;
  priority: AgentProactiveInsight['priority'];
  route?: string;
  relatedStudentId?: string;
  operations?: ReturnType<typeof normalizeAgentOperation>[];
}): AgentProactiveInsight => ({
  id: params.id,
  type: params.type,
  title: params.title,
  body: params.body,
  priority: params.priority,
  route: params.route,
  relatedStudentId: params.relatedStudentId,
  suggestedOperations: (params.operations || []).filter(Boolean) as AgentProactiveInsight['suggestedOperations'],
});

const getDismissed = async (): Promise<Record<string, string>> => {
  try {
    const stored = await AsyncStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const isDismissedToday = (id: string, dismissed: Record<string, string>) => {
  const value = dismissed[id];
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < DAY_MS;
};

export async function dismissProactiveInsight(id: string) {
  const dismissed = await getDismissed();
  dismissed[id] = new Date().toISOString();
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
}

export async function runProactiveChecks(): Promise<AgentProactiveInsight[]> {
  const [students, sessions, rules] = await Promise.all([db.getStudents(), db.getSessions(), db.getRules()]);
  if (!rules.proactive_agent_enabled) return [];

  const dismissed = await getDismissed();
  const now = new Date();
  const today = todayISO();
  const activeStudents = students.filter((student) => !student.practical_exam_at);
  const activeSessions = sessions.filter((session) => !session.cancellation_reason);
  const futureSessions = activeSessions.filter((session) => session.date >= today);
  const insights: AgentProactiveInsight[] = [];

  const sleeperInterval = rules.proactive_sleeper_interval_days || 14;
  const sleepers = activeStudents
    .map((student) => {
      const studentSessions = activeSessions.filter((session) => session.student_id === student.id).sort((a, b) => b.date.localeCompare(a.date));
      const hasFuture = futureSessions.some((session) => session.student_id === student.id);
      const last = studentSessions[0]?.date;
      const daysSinceLast = last ? Math.max(0, daysBetween(new Date(last), now)) : 999;
      return { student, hasFuture, last, daysSinceLast };
    })
    .filter((item) => !item.hasFuture && item.daysSinceLast >= sleeperInterval)
    .sort((a, b) => b.daysSinceLast - a.daysSinceLast)
    .slice(0, 3);

  for (const item of sleepers) {
    insights.push(
      makeInsight({
        id: `sleeper:${item.student.id}`,
        type: 'sleeper',
        title: `${item.student.first_name} hat keinen Folgetermin`,
        body: item.last
          ? `Letzte Fahrt vor ${item.daysSinceLast} Tagen. Nachfassen oder neu einplanen.`
          : 'Noch keine Fahrt im Kalender. Ersttermin oder Verfügbarkeit prüfen.',
        priority: item.daysSinceLast > sleeperInterval * 2 ? 'high' : 'medium',
        route: '/schueler',
        relatedStudentId: item.student.id,
        operations: [op('NAVIGATE', { route: '/schueler' })],
      })
    );
  }

  const missingDocs = activeStudents
    .map((student) => ({
      student,
      missing: [
        !student.has_application_submitted && 'Antrag',
        !student.has_picture && 'Bild',
        !student.has_vision_test && 'Sehtest',
        !student.has_first_aid && 'Erste Hilfe',
      ].filter(Boolean) as string[],
    }))
    .filter((item) => item.missing.length > 0)
    .slice(0, 3);

  for (const item of missingDocs) {
    insights.push(
      makeInsight({
        id: `missing-docs:${item.student.id}`,
        type: 'missing_docs',
        title: `${item.student.first_name}: Unterlagen fehlen`,
        body: `Offen: ${item.missing.join(', ')}.`,
        priority: item.missing.includes('Antrag') ? 'high' : 'medium',
        route: '/schueler',
        relatedStudentId: item.student.id,
        operations: [op('NAVIGATE', { route: '/schueler' })],
      })
    );
  }

  if (rules.proactive_exam_check_enabled !== false) {
    const upcomingExamStudents = activeStudents
      .flatMap((student) => [
        student.planned_theory_exam_at
          ? { student, kind: 'Theorieprüfung', date: student.planned_theory_exam_at }
          : null,
        student.planned_practical_exam_at
          ? { student, kind: 'Praxisprüfung', date: student.planned_practical_exam_at }
          : null,
      ])
      .filter(Boolean)
      .map((item) => ({ ...(item as { student: typeof activeStudents[number]; kind: string; date: string }), days: daysBetween(now, new Date((item as any).date)) }))
      .filter((item) => item.days >= 0 && item.days <= 14)
      .sort((a, b) => a.days - b.days)
      .slice(0, 4);

    for (const item of upcomingExamStudents) {
      insights.push(
        makeInsight({
          id: `exam:${item.kind}:${item.student.id}:${item.date}`,
          type: 'upcoming_exam',
          title: `${item.kind} in ${item.days} Tagen`,
          body: `${item.student.first_name} ${item.student.last_name} am ${formatDate(item.date)}. Fortschritt, Unterlagen und letzte Fahrt prüfen.`,
          priority: item.days <= 3 ? 'high' : 'medium',
          route: '/pruefungen',
          relatedStudentId: item.student.id,
          operations: [op('NAVIGATE', { route: '/pruefungen' })],
        })
      );
    }
  }

  const expiringApplications = activeStudents
    .filter((student) => student.application_date)
    .map((student) => {
      const expiry = student.application_expiry_date
        ? new Date(student.application_expiry_date)
        : addDays(new Date(student.application_date), rules.application_expiration_days || 365);
      return { student, expiry, days: daysBetween(now, expiry) };
    })
    .filter((item) => item.days >= 0 && item.days <= (rules.application_warning_days || 90))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  for (const item of expiringApplications) {
    insights.push(
      makeInsight({
        id: `application-expiry:${item.student.id}`,
        type: 'expiring_application',
        title: `${item.student.first_name}: Antrag läuft bald ab`,
        body: `Noch ${item.days} Tage bis ${formatDate(item.expiry)}. Behörden-/TÜV-Status prüfen.`,
        priority: item.days <= 14 ? 'high' : 'medium',
        route: '/behoerden',
        relatedStudentId: item.student.id,
        operations: [op('NAVIGATE', { route: '/behoerden' })],
      })
    );
  }

  const expiringTheory = activeStudents
    .filter((student) => student.theory_passed_at && !student.practical_exam_at)
    .map((student) => {
      const expiry = new Date(student.theory_passed_at!);
      expiry.setFullYear(expiry.getFullYear() + 1);
      return { student, expiry, days: daysBetween(now, expiry) };
    })
    .filter((item) => item.days >= 0 && item.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  for (const item of expiringTheory) {
    insights.push(
      makeInsight({
        id: `theory-expiry:${item.student.id}`,
        type: 'expiring_theory',
        title: `${item.student.first_name}: Theorie läuft ab`,
        body: `Noch ${item.days} Tage. Praxisprüfung oder Intensivplanung prüfen.`,
        priority: item.days <= 14 ? 'high' : 'medium',
        route: '/pruefungen',
        relatedStudentId: item.student.id,
        operations: [op('NAVIGATE', { route: '/pruefungen' })],
      })
    );
  }

  const nextSevenDays = Array.from({ length: 7 }, (_, index) => toISODate(addDays(now, index)));
  const emptyWorkdays = nextSevenDays.filter((date) => {
    const weekday = new Date(date).getDay() || 7;
    return weekday <= 6 && rules.work_windows[weekday] && !futureSessions.some((session) => session.date === date);
  });
  if (emptyWorkdays.length >= 2 && activeStudents.length > 0) {
    insights.push(
      makeInsight({
        id: `planning-gap:${today}`,
        type: 'planning_gap',
        title: `${emptyWorkdays.length} freie Arbeitstage in den nächsten 7 Tagen`,
        body: 'Der Planer kann Schläfer, Prüfungsnähe und Verfügbarkeiten priorisieren.',
        priority: 'low',
        route: '/planer',
        operations: [op('NAVIGATE', { route: '/planer' })],
      })
    );
  }

  if (rules.proactive_vehicle_alerts_enabled) {
    const weekday = now.getDay() || 7;
    if (weekday === 1 || weekday === 5) {
      insights.push(
        makeInsight({
          id: `vehicle-weekly:${today}`,
          type: 'vehicle_check',
          title: 'Fahrzeugcheck einplanen',
          body: 'TÜV, Reifen, Kilometerstand, Schäden und Tankbelege kurz prüfen.',
          priority: 'low',
          route: '/fahrzeug',
          operations: [op('NAVIGATE', { route: '/fahrzeug' })],
        })
      );
    }
  }

  return insights
    .filter((insight) => !isDismissedToday(insight.id, dismissed))
    .sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    })
    .slice(0, 8);
}
