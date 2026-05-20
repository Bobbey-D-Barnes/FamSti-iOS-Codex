// Direct copy from PWA – pure TypeScript, no DOM dependencies

import { Rules, Session, Student, WorkWindow } from '../types';
import { PIPELINE, getPipelineForStudent } from '../constants';
import { timeToMinutes, minutesToTime, toISODate } from './utils';
import { v4 as uuidv4 } from 'uuid';

// Helper to check collision
export const checkCollision = (
  date: string,
  start: number,
  end: number,
  existingSessions: Session[],
  gap: number
) => {
  return existingSessions.some((sess) => {
    if (sess.date !== date || sess.cancellation_reason) return false;
    const s = timeToMinutes(sess.start_time);
    const e = timeToMinutes(sess.end_time);
    return start < e + gap && end + gap > s;
  });
};

// Priority Score: Higher is more important
const calculatePriority = (student: Student, rules: Rules): number => {
  let score = student.next_stage_day * 10;

  if (student.next_stage_day >= 17) score += 500;
  if (student.next_stage_day === 12) score += 300;
  if (student.next_stage_day === 11) score += 200;

  const notes = (student.notes || '').toLowerCase();
  if (notes.includes('eilt') || notes.includes('schnell') || notes.includes('dringend') || notes.includes('prüfung'))
    score += 1000;
  if (notes.includes('priorität') || notes.includes('wichtig')) score += 500;
  if (notes.includes('pause') || notes.includes('urlaub')) score -= 1000;

  return score;
};

const countWeekSessions = (studentId: string, weekStartDate: Date, existingSessions: Session[]) => {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return existingSessions.filter((session) => {
    if (session.student_id !== studentId || session.cancellation_reason) return false;
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    return date >= weekStart && date <= weekEnd;
  }).length;
};

export const planDay = (
  targetDate: string,
  students: Student[],
  existingSessions: Session[],
  rules: Rules,
  weekStartDate?: Date
): Session[] => {
  const dateObj = new Date(targetDate);
  const weekday = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
  const workRule = rules.work_windows[weekday];

  if (!workRule) return [];

  const newSessions: Session[] = [];
  const sortedStudents = [...students].sort((a, b) => calculatePriority(b, rules) - calculatePriority(a, rules));

  const dayStartLimit = timeToMinutes(workRule.startTime);
  const dayEndLimit = timeToMinutes(workRule.endTime);

  for (const student of sortedStudents) {
    if (weekStartDate && student.max_sessions_per_week > 0) {
      const bookedThisWeek =
        countWeekSessions(student.id, weekStartDate, existingSessions) +
        countWeekSessions(student.id, weekStartDate, newSessions);
      if (bookedThisWeek >= student.max_sessions_per_week) continue;
    }

    const alreadyBooked = [...existingSessions, ...newSessions].some(
      (s) => s.student_id === student.id && s.date === targetDate && !s.cancellation_reason
    );
    if (alreadyBooked) continue;

    const pipeline = getPipelineForStudent(student, rules.pipeline || PIPELINE);
    const stage = pipeline.find((p) => p.day === student.next_stage_day);
    if (!stage) continue;

    const avails = student.availabilities.filter((a) => a.weekday === weekday);
    const windows =
      avails.length > 0
        ? avails
        : [{ id: 'work-window', weekday, start_time: workRule.startTime, end_time: workRule.endTime }];

    let booked = false;

    for (const avail of windows) {
      if (booked) break;

      const availStart = timeToMinutes(avail.start_time);
      const availEnd = timeToMinutes(avail.end_time);

      let startMin = Math.max(availStart, dayStartLimit);
      let endMin = Math.min(availEnd, dayEndLimit);

      if (stage.isNight) {
        const nightStart = timeToMinutes(rules.night_earliest_start);
        startMin = Math.max(startMin, nightStart);
      }

      const duration = stage.duration;

      for (let t = startMin; t + duration <= endMin; t += 15) {
        const collision = checkCollision(targetDate, t, t + duration, [...existingSessions, ...newSessions], rules.gap_minutes);

        if (!collision) {
          newSessions.push({
            id: uuidv4(),
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            zone: student.zone,
            stage_day: student.next_stage_day,
            date: targetDate,
            start_time: minutesToTime(t),
            end_time: minutesToTime(t + duration),
            duration_minutes: duration,
            used_joker: false,
            is_manual: false,
            confirmed: false,
          });
          booked = true;
          break;
        }
      }
    }
  }
  return newSessions;
};

export const planWeek = (
  students: Student[],
  existingSessions: Session[],
  rules: Rules,
  weekStartDate: Date
): Session[] => {
  let allNewSessions: Session[] = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + i);
    const dateStr = toISODate(date);

    const daySessions = planDay(dateStr, students, [...existingSessions, ...allNewSessions], rules, weekStartDate);
    allNewSessions = [...allNewSessions, ...daySessions];
  }
  return allNewSessions;
};

export const projectMasterPlan = (
  students: Student[],
  existingSessions: Session[],
  rules: Rules,
  startDate: Date
): Session[] => {
  let allProjected: Session[] = [];
  const MAX_WEEKS = 12;

  const virtualStudents = students.map((s) => ({ ...s }));

  for (let w = 0; w < MAX_WEEKS; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + w * 7);

    const currentKnownSessions = [...existingSessions, ...allProjected];
    const weekSessions = planWeek(virtualStudents, currentKnownSessions, rules, weekStart);

    weekSessions.forEach((sess) => {
      const s = virtualStudents.find((vs) => vs.id === sess.student_id);
      const pipeline = s ? getPipelineForStudent(s, rules.pipeline || PIPELINE) : rules.pipeline || PIPELINE;
      if (s && s.next_stage_day <= pipeline.length) {
        s.next_stage_day++;
      }
    });

    allProjected = [...allProjected, ...weekSessions];

    if (virtualStudents.every((vs) => vs.next_stage_day > getPipelineForStudent(vs, rules.pipeline || PIPELINE).length)) break;
  }

  return allProjected;
};
