import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '../types';

const KEY = 'fc_agent_session_followups';

export type SessionFollowupStatus = 'pending' | 'asked' | 'done' | 'dismissed';

export interface SessionFollowup {
  id: string;
  sessionId: string;
  dueAt: string;
  status: SessionFollowupStatus;
  createdAt: string;
  askedAt?: string;
  snoozeUntil?: string;
}

const endDateForSession = (session: Session) => new Date(`${session.date}T${session.end_time || session.start_time}`);

export const sessionFollowups = {
  async list(): Promise<SessionFollowup[]> {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  async save(items: SessionFollowup[]) {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  },

  async scheduleForSessions(sessions: Session[]) {
    const current = await this.list();
    const bySession = new Map(current.map((item) => [item.sessionId, item]));
    const now = new Date().toISOString();
    for (const session of sessions) {
      if (session.confirmed || session.cancellation_reason) continue;
      if (bySession.has(session.id)) continue;
      const due = endDateForSession(session);
      due.setMinutes(due.getMinutes() + 5);
      current.push({
        id: `followup-${session.id}`,
        sessionId: session.id,
        dueAt: due.toISOString(),
        status: 'pending',
        createdAt: now,
      });
    }
    await this.save(current);
    return current;
  },

  async getDue() {
    const now = Date.now();
    const items = await this.list();
    return items.filter((item) => {
      if (item.status === 'done' || item.status === 'dismissed') return false;
      const dueAt = item.snoozeUntil || item.dueAt;
      return new Date(dueAt).getTime() <= now;
    });
  },

  async markAsked(ids: string[]) {
    const now = new Date().toISOString();
    const items = await this.list();
    await this.save(items.map((item) => (ids.includes(item.id) ? { ...item, status: 'asked', askedAt: now } : item)));
  },

  async snooze(id: string, minutes = 15) {
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    const items = await this.list();
    await this.save(items.map((item) => (item.id === id ? { ...item, status: 'pending', snoozeUntil: until } : item)));
  },

  async completeBySession(sessionId: string) {
    const items = await this.list();
    await this.save(items.map((item) => (item.sessionId === sessionId ? { ...item, status: 'done' } : item)));
  },
};
