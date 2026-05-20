import { Reminder, Rules, Session, Student } from '../types';

export type AgentOperationType =
  | 'SAVE_STUDENT'
  | 'SAVE_SESSION'
  | 'SAVE_SESSIONS_BATCH'
  | 'DELETE_SESSION'
  | 'DELETE_SESSIONS_BATCH'
  | 'CONFIRM_SESSION'
  | 'CONFIRM_SESSIONS_BATCH'
  | 'SNOOZE_SESSION_FOLLOWUP'
  | 'SCHEDULE_SESSION_FOLLOWUPS'
  | 'SAVE_REMINDER'
  | 'DELETE_REMINDER'
  | 'NAVIGATE'
  | 'SEND_WHATSAPP'
  | 'SEARCH_WEB'
  | 'SEARCH_DATABASE'
  | 'SCHEDULE_NOTIFICATION'
  | 'ANALYZE_PROGRESS'
  | 'FIND_PLANNING_GAPS'
  | 'OPEN_STUDENT_PROFILE'
  | 'CLEAR_PENDING'
  | 'LOG_SYSTEM_ERROR';

export type AgentOperationRisk = 'low' | 'medium' | 'high';

export interface AgentOperation {
  id: string;
  type: AgentOperationType;
  payload: Record<string, any>;
  summary: string;
  risk: AgentOperationRisk;
  requiresConfirmation: boolean;
}

export interface AgentWebSource {
  title: string;
  url: string;
  domain?: string;
}

export type AgentProactiveInsightType =
  | 'sleeper'
  | 'missing_docs'
  | 'upcoming_exam'
  | 'expiring_application'
  | 'expiring_theory'
  | 'planning_gap'
  | 'vehicle_check'
  | 'confirmation_pending'
  | 'daily_briefing'
  | 'evening_wrap'
  | 'no_show'
  | 'payment'
  | 'documents';

export interface AgentProactiveInsight {
  id: string;
  type: AgentProactiveInsightType;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  route?: string;
  relatedStudentId?: string;
  suggestedOperations: AgentOperation[];
}

export interface AgentContext {
  currentPath: string;
  currentScreen: string;
  students: Student[];
  sessions: Session[];
  reminders: Reminder[];
  rules: Rules;
  memory: string[];
  learningProfile: AgentLearningProfile;
  knowledgeCards: AgentKnowledgeCard[];
}

export interface AgentTurnResult {
  text: string;
  operations: AgentOperation[];
  memoryCount: number;
  profileFactCount: number;
  knowledgeCount: number;
  webSources?: AgentWebSource[];
  source: 'ai' | 'offline';
}

export interface AgentLearningProfile {
  version: number;
  updatedAt: string;
  userName?: string;
  drivingSchoolName?: string;
  communicationStyle: 'friendly' | 'professional' | 'direct' | 'unknown';
  preferredWorkingTimes: string[];
  planningPreferences: string[];
  businessPreferences: string[];
  teachingPreferences: string[];
  appPreferences: string[];
  recurringTopics: string[];
  importantNotes: string[];
}

export interface AgentKnowledgeCard {
  id: string;
  title: string;
  category: 'app' | 'fahrschule' | 'selbststaendigkeit' | 'agent';
  keywords: string[];
  content: string;
}

export interface AgentMemoryItem {
  id: string;
  category: 'preferences' | 'business' | 'private' | 'general';
  content: string;
  createdAt: string;
}
