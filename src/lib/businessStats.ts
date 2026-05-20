import { getPipelineForStudent } from '../constants';
import { Pricing, Rules, Session, Student } from '../types';
import { toISODate } from './utils';

export const DEFAULT_PRICING: Pricing = {
  base_amount: 350,
  normal_lesson_45m: 65,
  special_lesson_45m: 75,
  theory_exam_fee: 50,
  practical_exam_fee: 150,
};

export function isSpecialLesson(session: Session, students: Student[], rules?: Rules): boolean {
  if (session.type && session.type !== 'driving') return false;
  const student = students.find((item) => item.id === session.student_id);
  if (!student) return false;
  const pipeline = getPipelineForStudent(student, rules?.pipeline);
  const stage = pipeline.find((item) => item.day === session.stage_day);
  return Boolean(stage?.isNight || stage?.isHighway);
}

export function calculateSessionCost(
  session: Session,
  students: Student[],
  pricing: Pricing = DEFAULT_PRICING,
  rules?: Rules
): number {
  const rate = isSpecialLesson(session, students, rules) ? pricing.special_lesson_45m : pricing.normal_lesson_45m;
  return Math.round((session.duration_minutes / 45) * rate);
}

export function hasMissingDocuments(student: Student) {
  return !student.has_application_submitted || !student.has_first_aid || !student.has_picture || !student.has_vision_test;
}

export function isExamReady(student: Student, rules?: Rules) {
  const minPractice = rules?.min_practice_hours_before_exam || 17;
  const minTheory = rules?.min_theory_lessons_before_exam || 14;
  const theoryDone =
    Boolean(student.theory_passed_at) ||
    ((student.theory_status?.standard_lessons_attended || []).filter(Boolean).length +
      (student.theory_status?.specific_lessons_dates || []).filter(Boolean).length >=
      minTheory);
  return student.next_stage_day >= minPractice && theoryDone && !hasMissingDocuments(student);
}

export function buildBusinessStats(
  students: Student[] = [],
  sessions: Session[] = [],
  pricing: Pricing = DEFAULT_PRICING,
  rules?: Rules
) {
  const today = toISODate(new Date());
  const activeStudents = students.filter((student) => !student.practical_exam_at && student.first_name !== 'Anonymisiert');
  const confirmedSessions = sessions.filter((session) => session.confirmed && !session.cancellation_reason);
  const cancelledSessions = sessions.filter((session) => Boolean(session.cancellation_reason));
  const plannedSessions = sessions.filter((session) => !session.confirmed && !session.cancellation_reason);
  const todaySessions = sessions.filter((session) => session.date === today && !session.cancellation_reason);
  const drivingMinutesToday = todaySessions.reduce((sum, session) => sum + session.duration_minutes, 0);
  const revenue = confirmedSessions.reduce((sum, session) => sum + calculateSessionCost(session, students, pricing, rules), 0);
  const lostRevenue = cancelledSessions.reduce((sum, session) => sum + calculateSessionCost(session, students, pricing, rules), 0);
  const missingDocs = activeStudents.filter(hasMissingDocuments).length;
  const examReady = activeStudents.filter((student) => isExamReady(student, rules)).length;
  const sleepers = activeStudents.filter((student) => {
    const latest = sessions
      .filter((session) => session.student_id === student.id && !session.cancellation_reason)
      .sort((a, b) => `${b.date}T${b.start_time}`.localeCompare(`${a.date}T${a.start_time}`))[0];
    if (!latest) return true;
    const days = Math.floor((Date.now() - new Date(`${latest.date}T${latest.start_time}`).getTime()) / 86400000);
    return days >= (rules?.proactive_sleeper_interval_days || 14);
  }).length;

  const completionBase = confirmedSessions.length + cancelledSessions.length;
  const cancellationRate = completionBase ? Math.round((cancelledSessions.length / completionBase) * 100) : 0;
  const confirmationRate = sessions.length ? Math.round((confirmedSessions.length / sessions.length) * 100) : 0;
  const documentScore = activeStudents.length ? Math.round(((activeStudents.length - missingDocs) / activeStudents.length) * 100) : 100;
  const utilizationScore = Math.min(100, Math.round((drivingMinutesToday / 495) * 100));
  const readinessScore = activeStudents.length ? Math.round((examReady / activeStudents.length) * 100) : 100;
  const analyticsScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(documentScore * 0.3 + confirmationRate * 0.25 + readinessScore * 0.2 + utilizationScore * 0.15 + (100 - cancellationRate) * 0.1)
    )
  );

  return {
    activeStudents,
    confirmedSessions,
    cancelledSessions,
    plannedSessions,
    todaySessions,
    drivingMinutesToday,
    drivingHoursToday: Math.round((drivingMinutesToday / 60) * 10) / 10,
    revenue,
    lostRevenue,
    missingDocs,
    examReady,
    sleepers,
    cancellationRate,
    confirmationRate,
    documentScore,
    utilizationScore,
    readinessScore,
    analyticsScore,
    marketingLeads: activeStudents.filter((student) => !student.theory_passed_at && student.next_stage_day <= 2).length,
    vehicleHealth: Math.max(0, Math.min(100, 100 - Math.max(0, drivingMinutesToday - 360) / 6)),
  };
}
