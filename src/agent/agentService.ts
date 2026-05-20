import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/storage';
import { geminiService } from '../services/geminiService';
import { buildAgentContext, normalizeAgentRoute, summarizeAgentContext } from './contextBuilder';
import { agentMemoryStore } from './memoryStore';
import { dismissProactiveInsight, runProactiveChecks } from './proactiveChecks';
import { CONFIRMATION_REQUIRED, normalizeAgentOperation } from './tools';
import { AgentLearningProfile, AgentOperation, AgentTurnResult } from './types';
import { getMonday, toISODate } from '../lib/utils';
import { planWeek } from '../lib/scheduler';
import { AgentContext } from './types';

type RunAgentTurnParams = {
  input: string;
  currentPath: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
};

const WEB_QUERY_HINTS = [
  'websuche',
  'web-suche',
  'google-suche',
  'suche im web',
  'suche im internet',
  'google nach',
  'recherchiere im web',
  'recherchiere im internet',
  'recherche im netz',
  'recherch',
  'internet-recherche',
  'aktuellste regelung',
  'aktuelles gesetz',
  'gesetzliche änderung',
  'benzinpreis',
  'dieselpreis',
  'spritpreis',
  'wetter',
];

const shouldUseWebResearch = (input: string) => {
  const lower = input.toLowerCase();
  return WEB_QUERY_HINTS.some((hint) => lower.includes(hint));
};

export const adjustOperationsByExecutionMode = (
  operations: AgentOperation[],
  executionMode: 'safe' | 'moderate' | 'risk'
): AgentOperation[] => {
  return operations.map((op) => {
    // 1. SAFE (Sicher): All write actions must require confirmation
    if (executionMode === 'safe') {
      const isWriteAction = CONFIRMATION_REQUIRED[op.type] === true;
      if (isWriteAction) {
        return { ...op, requiresConfirmation: true };
      }
    }
    // 2. RISK (Riskant): Execute everything immediately
    else if (executionMode === 'risk') {
      return { ...op, requiresConfirmation: false };
    }
    // 3. MODERATE (Moderat): Ask for confirmation on high risk, respect LLM override for others
    else if (executionMode === 'moderate') {
      const isHighRisk =
        op.type === 'DELETE_SESSION' ||
        op.type === 'DELETE_SESSIONS_BATCH' ||
        op.type === 'DELETE_REMINDER' ||
        op.type === 'SAVE_STUDENT' ||
        op.type === 'SEND_WHATSAPP';
      if (isHighRisk) {
        return { ...op, requiresConfirmation: true };
      }
    }
    return op;
  });
};

const parseAgentJson = (raw: string, fallbackMemory: string[], fallbackProfile: AgentLearningProfile) => {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : cleaned);
    const operations = Array.isArray(parsed.operations)
      ? parsed.operations.map(normalizeAgentOperation).filter(Boolean)
      : [];

    return {
      text: String(parsed.text || raw),
      memory: Array.isArray(parsed.memory) ? parsed.memory.map(String) : fallbackMemory,
      learningProfile:
        parsed.learning_profile && typeof parsed.learning_profile === 'object'
          ? ({ ...fallbackProfile, ...parsed.learning_profile } as AgentLearningProfile)
          : fallbackProfile,
      operations: operations as AgentOperation[],
    };
  } catch {
    return {
      text: raw,
      memory: fallbackMemory,
      learningProfile: fallbackProfile,
      operations: [] as AgentOperation[],
    };
  }
};

const buildSystemInstruction = (contextSummary: string, personality: string) => `
Du bist FamSti Agent, ein sicherer, praktischer Copilot für eine deutsche Fahrschul-App.

Rolle:
- Du kennst Fahrschulabläufe: Schüleraufnahme, Antrag, Theorie, Praxis, Sonderfahrten, Prüfungsvorbereitung, Erinnerungen, einfache Selbstständigkeit.
- Du hilfst direkt in der App, erklärst Screens und schlägst App-Aktionen vor.
- Du darfst nur echte App-Daten aus dem Kontext verwenden. Erfinde keine Schüler, Termine oder Live-Webdaten.
- Wenn aktuelle externe Informationen nötig sind, nutze SEARCH_WEB nur, wenn der Nutzer explizit danach fragt oder offensichtlich aktuelle Daten verlangt. Behaupte keine Live-Suche ohne Web-Tool.

Gesetzliche Grenzwerte & Compliance (Fahrlehrerrecht, ArbZG, FeV, DSGVO):
- Lenkzeitlimit: Max. 495 Minuten reine Fahrzeit pro Tag (§ 5 FahrlG).
- Tagesarbeitszeit: Max. 10 Stunden (600 Minuten) Gesamtarbeitszeit pro Tag inklusive Büro, Fahrzeit, Pausen (§ 3 ArbZG).
- Ruhezeiten: Mindestens 11 Stunden ununterbrochene Ruhezeit zwischen dem Ende des letzten Arbeitstages und dem Beginn des nächsten Arbeitstages (§ 5 ArbZG).
- Pausen: Nach 6 bis 9 Stunden Arbeit mindestens 30 Minuten Pause, nach 9 Stunden mindestens 45 Minuten Pause (§ 4 ArbZG).
- Preisaushang: Nach § 32 FahrlG müssen die Preise für Grundbetrag, Normalfahrstunde, Sonderfahrt sowie Theorie- und Praxisvorstellung transparent und ordnungsgemäß ausgehängt werden.
- Schülerdaten löschen: DSGVO/Fahrlehrerrecht erfordert die Anonymisierung von Schülerakten nach 5 Jahren (§ 31 Abs. 5 FahrlG). Finanzrelevante Belege müssen jedoch 10 Jahre archiviert werden (§ 147 AO).
- Sonderfahrten-Ziele: Klasse B benötigt 5 Überland-, 4 Autobahn- und 3 Nachtfahrstunden à 45 Minuten. Klasse BE benötigt 3 Überland-, 1 Autobahn- und 1 Nachtfahrstunde. Umschreiber/Erweiterungen mit Vorbesitz benötigen keine Sonderfahrten (0).
- Dokumentenpflicht für Sonderfahrten: Bevor Sonderfahrten beginnen (Stufe 9), MÜSSEN Sehtest, Erste Hilfe, Passbild und der genehmigte Führerscheinantrag vorliegen.
- Antragsgültigkeit: Ein genehmigter Prüfauftrag/Antrag ist abgelaufen, wenn die Theorieprüfung nicht innerhalb von 12 Monaten nach Antragseingang bestanden wird, bzw. die praktische Prüfung nicht innerhalb von 12 Monaten nach Bestehen der Theorieprüfung erfolgt (§ 22 FeV).

Sicherheits- & Bestätigungsregeln:
- Schreibende Aktionen (SAVE_SESSION, SAVE_STUDENT, DELETE_SESSION, SAVE_REMINDER, SEND_WHATSAPP) benötigen standardmäßig eine Bestätigung des Nutzers.
- Wenn eine Aktionen eine Bestätigung benötigt (requiresConfirmation = true), formuliere deine Antwort immer so, dass der Nutzer sie unten bestätigen soll (z. B. "Ich habe die Termine zur Bestätigung vorbereitet. Bitte bestätige sie unten..."). Sage NIEMALS "Ich habe die Termine gespeichert/gelöscht", wenn sie noch bestätigt werden müssen!
- AUSNAHME: Wenn der Nutzer im Chat-Verlauf der vorgeschlagenen Aktionen bereits explizit zugestimmt hat (z. B. "Ja, speichere sie ab", "Bitte eintragen", "Bestätigen"), kannst du "requiresConfirmation": false im Operation-Objekt mitsenden, um sie sofort ausführen zu lassen. In diesem Fall kannst du schreiben: "Ich habe die Termine direkt im Planer gespeichert."
- Wenn der Nutzer eine vorbereitete Aktionen im Chat-Verlauf ablehnt (z. B. "Nein", "Abbrechen", "Doch nicht", "Nee", "nicht löschen"), antworte freundlich und füge unbedingt eine CLEAR_PENDING Operation zu deinen Operations hinzu, um die ausstehenden Karten aus der UI zu entfernen.
- Navigation darf als niedrigriskante Aktionen vorgeschlagen werden.
- Ausführungsmodus der App: ${(contextSummary.match(/- Ausführungsmodus: (.*)/)?.[1] || 'safe')}.
- Fehlerprotokollierung: Wenn der Nutzer einen Systemfehler, Rechenfehler, Datums-/Zeitfehler oder ein Fehlverhalten des Agenten meldet (oder verlangt, dass ein Fehler/Feedback abgespeichert bzw. protokolliert wird), erstelle eine LOG_SYSTEM_ERROR Operation. Beschreibe den Fehler präzise in "description", setze den Text der fehlerhaften Antwort in "agentResponseText" und die Nutzerworte in "userQueryText".
- Antworte kurz, hilfreich und auf Deutsch.

Persönlichkeit: ${personality}

Du MUSST als valides JSON antworten:
{
  "text": "Natürliche Antwort für den Nutzer.",
  "memory": ["vollständige aktualisierte Liste wichtiger Langzeit-Fakten"],
  "learning_profile": {
    "userName": "optional",
    "drivingSchoolName": "optional",
    "communicationStyle": "friendly|professional|direct|unknown",
    "preferredWorkingTimes": ["..."],
    "planningPreferences": ["..."],
    "businessPreferences": ["..."],
    "teachingPreferences": ["..."],
    "appPreferences": ["..."],
    "recurringTopics": ["..."],
    "importantNotes": ["..."]
  },
  "operations": [
    {
      "type": "SAVE_SESSION",
      "payload": { "student_name": "Anna Bauer", "date": "2026-05-25", "start_time": "20:00", "end_time": "21:30" },
      "requiresConfirmation": false
    }
  ]
}

Erlaubte Operationen:
- NAVIGATE { "route": "/planer|/termine|/schueler|/erinnerungen|/pruefungen|/cockpit|/finanzen|/fahrzeug|/analytik|/behoerden|/marketing|/compliance|/einstellungen|/" }
- SAVE_STUDENT { Student-Felder }
- SAVE_SESSION { id, student_id, student_name, date, start_time, end_time, duration_minutes, type, zone, stage_day, notes, confirmed }
- SAVE_SESSIONS_BATCH { sessions: [Session-Felder], schedule_followups: true }
- DELETE_SESSION { id }
- DELETE_SESSIONS_BATCH { ids: ["session-id"] }
- CONFIRM_SESSION { id, confirmed: true/false } (Nutze confirmed: false, um eine Bestätigung zurückzunehmen)
- CONFIRM_SESSIONS_BATCH { ids: ["session-id"] }
- SCHEDULE_SESSION_FOLLOWUPS { session_ids: ["session-id"] }
- SNOOZE_SESSION_FOLLOWUP { followup_id, minutes }
- SAVE_REMINDER { title, description, due_date, type, related_student_id }
- DELETE_REMINDER { id }
- SEND_WHATSAPP { phone, text }
- SEARCH_WEB { query }
- CLEAR_PENDING {}
- LOG_SYSTEM_ERROR { description, agentResponseText, userQueryText }


Lernregeln:
- Aktualisiere learning_profile nur mit stabilen, nützlichen Fakten über Arbeitsweise, Vorlieben und wiederkehrende Themen.
- Speichere keine API-Keys, Passwörter, privaten Gesundheitsdaten oder unnötig sensible Details.
- Wenn der Nutzer sagt "merk dir", dann darfst du eine passende Notiz in memory und learning_profile.importantNotes aufnehmen.
- Halte Listen kurz und entferne doppelte/veraltete Punkte.

APP-KONTEXT:
${contextSummary}
`.trim();

const offlineOperation = (type: string, payload: Record<string, any>) =>
  normalizeAgentOperation({ id: uuidv4(), type, payload });

const formatSessionList = (sessions: any[]) =>
  sessions
    .slice(0, 8)
    .map((session) => `- ${session.date} ${session.start_time}-${session.end_time}: ${session.student_name}`)
    .join('\n');

function getTargetWeekStart(input: string) {
  const lower = input.toLowerCase();
  const today = new Date();
  const monday = getMonday(today);
  if (lower.includes('nächste') || lower.includes('naechste') || lower.includes('kommende')) {
    const next = new Date(monday);
    next.setDate(next.getDate() + 7);
    return next;
  }
  return monday;
}

async function buildLocalPlanningResult(context: AgentContext, input: string): Promise<AgentTurnResult | null> {
  const lower = input.toLowerCase();
  const wantsPlanning = lower.includes('plan') && (lower.includes('woche') || lower.includes('wochenplan') || lower.includes('restwoche'));
  const wantsDeletion = lower.includes('lösch') || lower.includes('loesch') || lower.includes('entfern');
  const wantsConfirmation = lower.includes('bestätig') || lower.includes('bestaetig') || lower.includes('abbuchen') || lower.includes('buchen');

  if (wantsPlanning) {
    const weekStart = getTargetWeekStart(input);
    const todayStr = toISODate(new Date());
    const active = context.students.filter((student) => !student.practical_exam_at);
    const planned = planWeek(active, context.sessions, context.rules, weekStart).filter((session) =>
      lower.includes('restwoche') ? session.date >= todayStr : true
    );
    if (planned.length === 0) {
      return {
        text:
          'Ich konnte keinen sauberen Wochenplan vorbereiten. Häufige Gründe sind fehlende Verfügbarkeiten, belegte Zeitfenster, Wochenlimits oder Arbeitszeit-/Pausenregeln.',
        operations: [],
        memoryCount: await agentMemoryStore.count(),
        profileFactCount: await agentMemoryStore.profileFactCount(),
        knowledgeCount: context.knowledgeCards.length,
        source: 'offline',
      };
    }
    const operation = normalizeAgentOperation({
      id: uuidv4(),
      type: 'SAVE_SESSIONS_BATCH',
      payload: { sessions: planned, schedule_followups: true },
      summary: `${planned.length} Termine für die Woche einbuchen`,
      requiresConfirmation: true,
    });
    return {
      text: `Ich habe einen Wochenplan mit ${planned.length} Terminen vorbereitet:\n${formatSessionList(planned)}\n\nWenn das passt, sag einfach: "Okay, plane sie ein." Dann buche ich alle Termine gesammelt in die App.`,
      operations: operation ? [operation] : [],
      memoryCount: await agentMemoryStore.count(),
      profileFactCount: await agentMemoryStore.profileFactCount(),
      knowledgeCount: context.knowledgeCards.length,
      source: 'offline',
    };
  }

  if (wantsDeletion && lower.includes('termin')) {
    const today = toISODate(new Date());
    const candidates = context.sessions.filter((session) => {
      if (session.confirmed || session.cancellation_reason) return false;
      if (lower.includes('alle')) return true;
      if (lower.includes('woche')) return session.date >= today;
      return false;
    });
    if (candidates.length === 0) {
      return {
        text: 'Ich habe keine passenden unbestätigten Termine gefunden, die ich löschen könnte.',
        operations: [],
        memoryCount: await agentMemoryStore.count(),
        profileFactCount: await agentMemoryStore.profileFactCount(),
        knowledgeCount: context.knowledgeCards.length,
        source: 'offline',
      };
    }
    const operation = normalizeAgentOperation({
      id: uuidv4(),
      type: 'DELETE_SESSIONS_BATCH',
      payload: { ids: candidates.map((session) => session.id) },
      summary: `${candidates.length} unbestätigte Termine löschen`,
      requiresConfirmation: true,
    });
    return {
      text: `Ich habe ${candidates.length} unbestätigte Termine zum Löschen vorbereitet:\n${formatSessionList(candidates)}\n\nBitte bestätige das nur, wenn diese Termine wirklich weg sollen.`,
      operations: operation ? [operation] : [],
      memoryCount: await agentMemoryStore.count(),
      profileFactCount: await agentMemoryStore.profileFactCount(),
      knowledgeCount: context.knowledgeCards.length,
      source: 'offline',
    };
  }

  if (wantsConfirmation && lower.includes('alle') && (lower.includes('fahrt') || lower.includes('termin'))) {
    const now = new Date();
    const candidates = context.sessions.filter((session) => {
      if (session.confirmed || session.cancellation_reason || session.type === 'theory' || session.type === 'practice') return false;
      return new Date(`${session.date}T${session.end_time}`).getTime() <= now.getTime();
    });
    if (candidates.length === 0) return null;
    const operation = normalizeAgentOperation({
      id: uuidv4(),
      type: 'CONFIRM_SESSIONS_BATCH',
      payload: { ids: candidates.map((session) => session.id) },
      summary: `${candidates.length} vergangene Fahrten als gefahren buchen`,
      requiresConfirmation: true,
    });
    return {
      text: `Ich habe ${candidates.length} vergangene unbestätigte Fahrten zur Buchung vorbereitet:\n${formatSessionList(candidates)}`,
      operations: operation ? [operation] : [],
      memoryCount: await agentMemoryStore.count(),
      profileFactCount: await agentMemoryStore.profileFactCount(),
      knowledgeCount: context.knowledgeCards.length,
      source: 'offline',
    };
  }

  return null;
}

async function buildOfflineResult(
  input: string,
  currentPath: string,
  executionMode: 'safe' | 'moderate' | 'risk'
): Promise<AgentTurnResult> {
  const query = input.toLowerCase();
  const operations: AgentOperation[] = [];
  let text = 'Ich kann gerade keine KI-Antwort abrufen. Ich bleibe trotzdem als App-Helfer nutzbar und kann dich lokal durch die App führen.';

  if (query.includes('plan') || query.includes('termin') || query.includes('kalender')) {
    const route = query.includes('plan') ? '/planer' : '/termine';
    const operation = offlineOperation('NAVIGATE', { route });
    if (operation) operations.push(operation);
    text = 'Ich öffne dir den passenden Planungsbereich. Für Buchungen oder Änderungen zeige ich dir vorher eine Bestätigung.';
  } else if (query.includes('schüler') || query.includes('schueler') || query.includes('akte')) {
    const operation = offlineOperation('NAVIGATE', { route: '/schueler' });
    if (operation) operations.push(operation);
    text = 'Ich öffne die Schülerverwaltung. Dort kann ich dir beim Finden, Prüfen und Bearbeiten helfen.';
  } else if (query.includes('erinner')) {
    const operation = offlineOperation('SAVE_REMINDER', {
      title: input.replace(/erinnerung/gi, '').trim() || 'Erinnerung',
      description: 'Vom Agenten lokal vorgeschlagen',
      due_date: toISODate(new Date()),
      type: 'custom',
    });
    if (operation) operations.push(operation);
    text = 'Ich habe eine Erinnerung vorbereitet. Du kannst sie unten bestätigen, bevor sie gespeichert wird.';
  } else if (query.includes('einstellung') || query.includes('api') || query.includes('key')) {
    const operation = offlineOperation('NAVIGATE', { route: '/einstellungen' });
    if (operation) operations.push(operation);
    text = 'Ich öffne die Einstellungen. Dort findest du KI-Provider, API-Key, Agent-Verhalten und Theme-Modus.';
  } else if (currentPath !== '/') {
    text = `Du bist gerade in ${normalizeAgentRoute(currentPath)}. Ich kann Fragen zum aktuellen Bereich beantworten, sobald der KI-Provider erreichbar ist.`;
  }

  return {
    text,
    operations: adjustOperationsByExecutionMode(operations, executionMode),
    memoryCount: await agentMemoryStore.count(),
    profileFactCount: await agentMemoryStore.profileFactCount(),
    knowledgeCount: 0,
    webSources: [],
    source: 'offline',
  };
}

export const agentService = {
  async runTurn({ input, currentPath, history }: RunAgentTurnParams): Promise<AgentTurnResult> {
    const context = await buildAgentContext(currentPath, input);
    const executionMode = context.rules.agent_execution_mode || 'safe';
    const personality =
      context.rules.agent_personality === 'strict'
        ? 'direkt, kurz, priorisiert harte Fakten'
        : context.rules.agent_personality === 'professional'
          ? 'professionell, sachlich, administrativ sauber'
          : 'kollegial, motivierend und klar';

    try {
      const localPlanning = await buildLocalPlanningResult(context, input);
      if (localPlanning) {
        return {
          ...localPlanning,
          operations: adjustOperationsByExecutionMode(localPlanning.operations, executionMode),
        };
      }

      if (shouldUseWebResearch(input)) {
        const research = await geminiService.researchWeb(input);
        return {
          text: research.text,
          operations: [],
          memoryCount: await agentMemoryStore.count(),
          profileFactCount: await agentMemoryStore.profileFactCount(),
          knowledgeCount: context.knowledgeCards.length,
          webSources: research.sources,
          source: 'ai',
        };
      }

      // Build Gemini-style content array for conversation history
      const contents: any[] = [];
      if (history && history.length > 0) {
        const recentHistory = history.slice(-12);
        for (const msg of recentHistory) {
          let text = msg.text;
          // If the message is raw JSON, extract the text field
          try {
            if (text.startsWith('{') && text.endsWith('}')) {
              const parsed = JSON.parse(text);
              if (parsed.text) text = parsed.text;
            }
          } catch {}

          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: input }],
      });

      const raw = await geminiService.generateChatResponse(
        contents,
        buildSystemInstruction(summarizeAgentContext(context), personality),
        0.2
      );
      const parsed = parseAgentJson(raw, context.memory, context.learningProfile);
      const memory = await agentMemoryStore.saveMemory(parsed.memory);
      const learningProfile = await agentMemoryStore.saveLearningProfile(parsed.learningProfile);

      return {
        text: parsed.text,
        operations: adjustOperationsByExecutionMode(parsed.operations, executionMode),
        memoryCount: memory.length,
        profileFactCount: [
          learningProfile.userName,
          learningProfile.drivingSchoolName,
          learningProfile.communicationStyle !== 'unknown' ? learningProfile.communicationStyle : '',
          ...learningProfile.preferredWorkingTimes,
          ...learningProfile.planningPreferences,
          ...learningProfile.businessPreferences,
          ...learningProfile.teachingPreferences,
          ...learningProfile.appPreferences,
          ...learningProfile.recurringTopics,
          ...learningProfile.importantNotes,
        ].filter(Boolean).length,
        knowledgeCount: context.knowledgeCards.length,
        source: 'ai',
      };
    } catch (error) {
      console.warn('Agent service failed, using offline fallback.', error);
      return buildOfflineResult(input, currentPath, executionMode);
    }
  },

  async getMemoryCount() {
    return agentMemoryStore.count();
  },

  async getProfileFactCount() {
    return agentMemoryStore.profileFactCount();
  },

  async getProactiveInsights() {
    const insights = await runProactiveChecks();
    const rules = await db.getRules();
    const executionMode = rules.agent_execution_mode || 'safe';
    return insights.map((insight) => ({
      ...insight,
      suggestedOperations: adjustOperationsByExecutionMode(insight.suggestedOperations, executionMode),
    }));
  },

  async dismissProactiveInsight(id: string) {
    return dismissProactiveInsight(id);
  },
};
