// Storage layer – adapted from PWA: localStorage → AsyncStorage
// Supabase path remains identical

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Rules, Session, Student, Reminder, SystemError, Pricing, ComplianceEvent } from '../types';
import { DEFAULT_RULES, DEMO_STUDENTS, EXTRA_DEMO_STUDENTS } from '../constants';
import { supabase } from './supabase';
import { secureStorage } from '../agent/memoryStore';

const KEYS = {
  STUDENTS: 'fc_students',
  SESSIONS: 'fc_sessions',
  RULES: 'fc_rules',
  SHORTCUTS: 'fc_dashboard_shortcuts',
  REMINDERS: 'fc_reminders',
  SYSTEM_ERRORS: 'fc_system_errors',
  PRICES: 'fc_pricing',
  COMPLIANCE_LOG: 'fc_compliance_log',
};

const mergeRules = (stored?: Partial<Rules> | null): Rules => {
  const merged: Rules = {
    ...JSON.parse(JSON.stringify(DEFAULT_RULES)),
    ...(stored || {}),
    dashboard_config: {
      ...DEFAULT_RULES.dashboard_config,
      ...(stored?.dashboard_config || {}),
    },
    work_windows: {
      ...DEFAULT_RULES.work_windows,
      ...(stored?.work_windows || {}),
    },
    pipeline: stored?.pipeline?.length ? stored.pipeline : DEFAULT_RULES.pipeline,
  };

  // Auto-migrate old default models to the new Gemini 3.5 Flash models
  if (merged.gemini_model === 'gemini-3.1-flash-lite') {
    merged.gemini_model = 'gemini-3.5-flash';
  }
  if (merged.openrouter_model === 'google/gemini-2.5-flash:free') {
    merged.openrouter_model = 'google/gemini-3.5-flash';
  }

  return merged;
};

// Initialize Local DB if empty and no backend
const initLocal = async () => {
  try {
    const students = await AsyncStorage.getItem(KEYS.STUDENTS);
    if (!students) {
      await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(DEMO_STUDENTS));
    }
    const sessions = await AsyncStorage.getItem(KEYS.SESSIONS);
    if (!sessions) {
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
    }
    const rules = await AsyncStorage.getItem(KEYS.RULES);
    if (!rules) {
      await AsyncStorage.setItem(KEYS.RULES, JSON.stringify(DEFAULT_RULES));
    }
    const reminders = await AsyncStorage.getItem(KEYS.REMINDERS);
    if (!reminders) {
      await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify([]));
    }
    const systemErrors = await AsyncStorage.getItem(KEYS.SYSTEM_ERRORS);
    if (!systemErrors) {
      await AsyncStorage.setItem(KEYS.SYSTEM_ERRORS, JSON.stringify([]));
    }
    const shortcuts = await AsyncStorage.getItem(KEYS.SHORTCUTS);
    if (!shortcuts) {
      await AsyncStorage.setItem(KEYS.SHORTCUTS, JSON.stringify(['new_student', 'plan', 'schedule', 'settings']));
    }
  } catch (e) {
    console.error('Critical: Failed to initialize local storage.', e);
  }
};

// Initialize on import (safe for SSR/Node)
let initPromise: Promise<void> | null = null;
const ensureInitialized = (): Promise<void> => {
  if (supabase) return Promise.resolve();
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = initLocal();
  }
  return initPromise;
};

export const db = {
  // --- STUDENTS ---
  getStudents: async (): Promise<Student[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('students').select('*');
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return data || [];
    }
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.STUDENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse students from storage', e);
      return [];
    }
  },

  getStudent: async (id: string): Promise<Student | undefined> => {
    const students = await db.getStudents();
    return students.find((s) => s.id === id);
  },

  saveStudent: async (student: Student): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('students').upsert(student);
      if (error) throw error;
      return;
    }
    try {
      const students = await db.getStudents();
      const idx = students.findIndex((s) => s.id === student.id);
      let logMsg = '';
      if (idx >= 0) {
        const old = students[idx];
        const changes: string[] = [];
        if (old.next_stage_day !== student.next_stage_day) {
          changes.push(`Praktische Ausbildungsstufe geändert von Tag ${old.next_stage_day} auf Tag ${student.next_stage_day}`);
        }
        if (old.theory_passed_at !== student.theory_passed_at && student.theory_passed_at) {
          changes.push(`Theorieprüfung als bestanden markiert am ${student.theory_passed_at}`);
        }
        if (old.practical_exam_at !== student.practical_exam_at && student.practical_exam_at) {
          changes.push(`Praktische Prüfung als bestanden markiert am ${student.practical_exam_at}`);
        }
        if (!old.signed_at && student.signed_at) {
          changes.push(`Ausbildung digital abgeschlossen und beidseitig signiert`);
        }
        if (changes.length > 0) {
          logMsg = changes.join(', ');
        }
        students[idx] = student;
      } else {
        logMsg = `Schülerakte angelegt`;
        students.push(student);
      }
      await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
      if (logMsg) {
        await db.logComplianceEvent(
          idx >= 0 ? 'Ausbildungsstand geändert' : 'Schülerakte angelegt',
          `Schüler ${student.first_name} ${student.last_name}: ${logMsg}`,
          student.id
        );
      }
    } catch (e) {
      console.error('Failed to save student', e);
    }
  },

  deleteStudent: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      const { error: sessError } = await supabase.from('sessions').delete().eq('student_id', id);
      if (sessError) console.warn('Failed to cascade delete sessions remotely', sessError);
      return;
    }
    const students = await db.getStudents();
    const newStudents = students.filter((s) => s.id !== id);
    await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(newStudents));

    // Cascade delete sessions
    const sessions = await db.getSessions();
    const newSessions = sessions.filter((s) => s.student_id !== id);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(newSessions));
  },

  loadExtraDemoStudents: async (): Promise<void> => {
    const students = await db.getStudents();
    const existingIds = new Set(students.map((s) => s.id));
    const merged = [...students, ...EXTRA_DEMO_STUDENTS.filter((s) => !existingIds.has(s.id))];
    await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(merged));
  },

  removeExtraDemoStudents: async (): Promise<void> => {
    const students = await db.getStudents();
    await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(students.filter((s) => !s.id.startsWith('demo-'))));
  },

  // --- SESSIONS ---
  getSessions: async (): Promise<Session[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('sessions').select('*');
      if (error) throw error;
      return data || [];
    }
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse sessions', e);
      return [];
    }
  },

  saveSession: async (session: Session): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('sessions').upsert(session);
      if (error) throw error;
      return;
    }
    const sessions = await db.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    let logMsg = '';
    let logAction = 'Termin geplant';
    if (idx >= 0) {
      const old = sessions[idx];
      const changes: string[] = [];
      if (old.date !== session.date || old.start_time !== session.start_time || old.end_time !== session.end_time) {
        changes.push(`Zeit geändert von ${old.date} ${old.start_time}-${old.end_time} auf ${session.date} ${session.start_time}-${session.end_time}`);
      }
      if (old.confirmed !== session.confirmed && session.confirmed) {
        changes.push(`Termin bestätigt`);
        logAction = 'Termin bestätigt';
      }
      if (old.cancellation_reason !== session.cancellation_reason && session.cancellation_reason) {
        changes.push(`Termin storniert (Grund: ${session.cancellation_reason})`);
        logAction = 'Termin storniert';
      }
      if (old.compliance_overridden !== session.compliance_overridden && session.compliance_overridden) {
        changes.push(`Gesetzlicher Richtlinien-Verstoß durch Fahrlehrer überschrieben (Override)`);
        logAction = 'Richtlinien-Override';
      }
      if (changes.length > 0) {
        logMsg = changes.join(', ');
        if (logAction === 'Termin geplant') {
          logAction = 'Termin bearbeitet';
        }
      }
      sessions[idx] = session;
    } else {
      logMsg = `Termin am ${session.date} von ${session.start_time} bis ${session.end_time} geplant`;
      sessions.push(session);
    }
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    if (logMsg) {
      await db.logComplianceEvent(
        logAction,
        `Fahrstunde für Schüler ${session.student_name}: ${logMsg}`,
        session.student_id
      );
    }
  },

  deleteSession: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const sessions = await db.getSessions();
    const session = sessions.find((s) => s.id === id);
    const newSessions = sessions.filter((s) => s.id !== id);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(newSessions));
    if (session) {
      await db.logComplianceEvent(
        'Termin gelöscht',
        `Fahrstunde für Schüler ${session.student_name} am ${session.date} (${session.start_time}-${session.end_time}) wurde dauerhaft aus dem Kalender gelöscht.`,
        session.student_id
      );
    }
  },

  confirmSession: async (session: Session): Promise<void> => {
    if (session.confirmed) return;

    const updatedSession = { ...session, confirmed: true };
    await db.saveSession(updatedSession);

    const student = await db.getStudent(session.student_id);
    if (student && session.type === 'driving' && student.next_stage_day < 19 && session.stage_day !== 0) {
      const nextStage = student.next_stage_day + 1;
      await db.saveStudent({ ...student, next_stage_day: nextStage });
    }

    if (student && (session.type === 'theory' || session.type === 'practice')) {
      const updated = { ...student };
      if (session.type === 'theory') updated.theory_passed_at = session.date;
      if (session.type === 'practice') updated.practical_exam_at = session.date;
      await db.saveStudent(updated);
    }
  },

  // --- RULES ---
  getRules: async (): Promise<Rules> => {
    let rules: Rules;
    if (supabase) {
      const { data, error } = await supabase.from('rules').select('*').limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        rules = data[0] as Rules;
      } else {
        rules = mergeRules();
      }
    } else {
      await ensureInitialized();
      try {
        const stored = await AsyncStorage.getItem(KEYS.RULES);
        rules = mergeRules(stored ? JSON.parse(stored) : null);
      } catch (e) {
        rules = mergeRules();
      }
    }
    // Load secure keys
    const gKey = await secureStorage.getItem('secure_gemini_api_key');
    const oKey = await secureStorage.getItem('secure_openai_api_key');
    const rKey = await secureStorage.getItem('secure_openrouter_api_key');
    if (gKey) rules.gemini_api_key = gKey;
    if (oKey) rules.openai_api_key = oKey;
    if (rKey) rules.openrouter_api_key = rKey;
    return rules;
  },

  saveRules: async (rules: Rules): Promise<void> => {
    // Store keys securely and strip them from the db payload
    const mutableRules = { ...rules };
    if (mutableRules.gemini_api_key !== undefined) {
      await secureStorage.setItem('secure_gemini_api_key', mutableRules.gemini_api_key || '');
      delete mutableRules.gemini_api_key;
    }
    if (mutableRules.openai_api_key !== undefined) {
      await secureStorage.setItem('secure_openai_api_key', mutableRules.openai_api_key || '');
      delete mutableRules.openai_api_key;
    }
    if (mutableRules.openrouter_api_key !== undefined) {
      await secureStorage.setItem('secure_openrouter_api_key', mutableRules.openrouter_api_key || '');
      delete mutableRules.openrouter_api_key;
    }

    if (supabase) {
      const { data } = await supabase.from('rules').select('id').limit(1);
      let idToUpdate = data?.[0]?.id;

      if (idToUpdate) {
        const { error } = await supabase.from('rules').update(mutableRules).eq('id', idToUpdate);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rules').insert(mutableRules);
        if (error) throw error;
      }
      return;
    }
    await AsyncStorage.setItem(KEYS.RULES, JSON.stringify(mutableRules));
  },

  // --- SHORTCUTS ---
  getDashboardShortcuts: async (): Promise<string[]> => {
    await ensureInitialized();
    const stored = await AsyncStorage.getItem(KEYS.SHORTCUTS);
    return stored ? JSON.parse(stored) : ['new_student', 'plan', 'schedule', 'settings'];
  },

  saveDashboardShortcuts: async (shortcuts: string[]): Promise<void> => {
    await AsyncStorage.setItem(KEYS.SHORTCUTS, JSON.stringify(shortcuts));
  },

  // --- REMINDERS ---
  getReminders: async (): Promise<Reminder[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('reminders').select('*');
      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      return data || [];
    }
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.REMINDERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse reminders', e);
      return [];
    }
  },

  saveReminder: async (reminder: Reminder): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('reminders').upsert(reminder);
      if (error) throw error;
      return;
    }
    const reminders = await db.getReminders();
    const idx = reminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) reminders[idx] = reminder;
    else reminders.push(reminder);
    await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
  },

  deleteReminder: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const reminders = await db.getReminders();
    const newReminders = reminders.filter((r) => r.id !== id);
    await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(newReminders));
  },

  // --- SYSTEM ERRORS ---
  getSystemErrors: async (): Promise<SystemError[]> => {
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.SYSTEM_ERRORS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse system errors', e);
      return [];
    }
  },

  syncSystemErrors: async (): Promise<SystemError[]> => {
    await ensureInitialized();
    const errors = await db.getSystemErrors();
    if (__DEV__ && errors.length > 0) {
      try {
        const hostUri = Constants.expoConfig?.hostUri;
        const protocol = hostUri && (hostUri.includes('ngrok') || !/^[0-9.:]+$/.test(hostUri)) ? 'https' : 'http';
        const syncUrl = hostUri ? `${protocol}://${hostUri}/log-error` : 'http://localhost:8081/log-error';
        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errors),
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && Array.isArray(resData.errors)) {
            await AsyncStorage.setItem(KEYS.SYSTEM_ERRORS, JSON.stringify(resData.errors));
            return resData.errors;
          }
        }
      } catch (err) {
        // Dev server not running, ignore
      }
    }
    return errors;
  },

  saveSystemError: async (error: SystemError): Promise<void> => {
    const errors = await db.getSystemErrors();
    const idx = errors.findIndex((e) => e.id === error.id);
    if (idx >= 0) errors[idx] = error;
    else errors.push(error);
    await AsyncStorage.setItem(KEYS.SYSTEM_ERRORS, JSON.stringify(errors));

    // Instantly sync the list
    await db.syncSystemErrors();
  },

  deleteSystemError: async (id: string): Promise<void> => {
    const errors = await db.getSystemErrors();
    const filtered = errors.filter((e) => e.id !== id);
    await AsyncStorage.setItem(KEYS.SYSTEM_ERRORS, JSON.stringify(filtered));
  },

  clearSystemErrors: async (): Promise<void> => {
    await AsyncStorage.setItem(KEYS.SYSTEM_ERRORS, JSON.stringify([]));
  },

  // --- PRICING & COMPLIANCE LOGGING ---
  getPricing: async (): Promise<Pricing> => {
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.PRICES);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse pricing', e);
    }
    return {
      base_amount: 350,
      normal_lesson_45m: 65,
      special_lesson_45m: 75,
      theory_exam_fee: 50,
      practical_exam_fee: 150,
    };
  },

  savePricing: async (pricing: Pricing): Promise<void> => {
    await ensureInitialized();
    await AsyncStorage.setItem(KEYS.PRICES, JSON.stringify(pricing));
  },

  getComplianceLogs: async (): Promise<ComplianceEvent[]> => {
    await ensureInitialized();
    try {
      const stored = await AsyncStorage.getItem(KEYS.COMPLIANCE_LOG);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse compliance logs', e);
      return [];
    }
  },

  logComplianceEvent: async (
    action: string,
    details: string,
    studentId?: string,
    instructorName?: string
  ): Promise<void> => {
    await ensureInitialized();
    try {
      const logs = await db.getComplianceLogs();
      const newEvent: ComplianceEvent = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        action,
        details,
        studentId,
        instructorName: instructorName || 'Fahrlehrer Bernd',
      };
      logs.unshift(newEvent);
      await AsyncStorage.setItem(KEYS.COMPLIANCE_LOG, JSON.stringify(logs.slice(0, 500)));
    } catch (e) {
      console.error('Failed to log compliance event', e);
    }
  },

  clearComplianceLogs: async (): Promise<void> => {
    await ensureInitialized();
    await AsyncStorage.removeItem(KEYS.COMPLIANCE_LOG);
  },

  anonymizeOldStudentRecords: async (): Promise<number> => {
    await ensureInitialized();
    try {
      const students = await db.getStudents();
      const sessions = await db.getSessions();
      
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      
      let count = 0;
      const updatedStudents = students.map((student) => {
        if (student.practical_exam_at) {
          const examDate = new Date(student.practical_exam_at);
          if (examDate < fiveYearsAgo) {
            count++;
            return {
              ...student,
              first_name: 'Anonymisiert',
              last_name: `Schüler #${student.id.substring(0, 4)}`,
              pickup_address: 'Gelöscht (DSGVO)',
              notes: 'Akte nach 5 Jahren gemäß § 31 Abs. 5 FahrlG anonymisiert.',
              phone: '0000000000',
              email: 'anonym@fahrschule.de',
              birth_date: '1970-01-01',
              gender: undefined,
              student_signature: 'Gelöscht (DSGVO)',
              instructor_signature: 'Gelöscht (DSGVO)',
            };
          }
        }
        return student;
      });
      
      if (count > 0) {
        await AsyncStorage.setItem(KEYS.STUDENTS, JSON.stringify(updatedStudents));
        
        const studentMap = new Map(updatedStudents.map(s => [s.id, `${s.first_name} ${s.last_name}`]));
        const updatedSessions = sessions.map((session) => {
          if (studentMap.has(session.student_id)) {
            return {
              ...session,
              student_name: studentMap.get(session.student_id)!,
            };
          }
          return session;
        });
        await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(updatedSessions));
        
        await db.logComplianceEvent(
          'Systembereinigung',
          `${count} Schülerakten, die älter als 5 Jahre sind, wurden gemäß § 31 Abs. 5 FahrlG datenschutzkonform anonymisiert.`
        );
      }
      return count;
    } catch (e) {
      console.error('Failed to anonymize old records', e);
      return 0;
    }
  },

  // --- UTILS ---
  reset: async () => {
    if (supabase) {
      console.warn('Remote Datenbank Reset wird über die App nicht unterstützt.');
      return;
    }
    await AsyncStorage.clear();
    await initLocal();
  },
};
