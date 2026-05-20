import { Platform } from 'react-native';
import { Student, Session, PipelineStage, Rules, Availability, ZoneType } from '../types';
import { checkCollision } from '../lib/scheduler';
import { timeToMinutes } from '../lib/utils';
import { getPipelineForStudent } from '../constants';
import { db } from '../lib/storage';
import { AgentWebSource } from '../agent/types';

const GEMINI_MODEL = 'gemini-3.5-flash';

class RateLimitTracker {
  private limits: Record<string, { timestamp: number; message: string }> = {};

  setLimit(model: string, message: string) {
    this.limits[model] = { timestamp: Date.now(), message };
  }

  clearLimit(model: string) {
    delete this.limits[model];
  }

  isLimited(model: string): boolean {
    const entry = this.limits[model];
    if (!entry) return false;
    // Expire limit warning after 5 minutes
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      delete this.limits[model];
      return false;
    }
    return true;
  }

  getLimitMessage(model: string): string | null {
    if (this.isLimited(model)) {
      return this.limits[model].message;
    }
    return null;
  }
}

export const rateLimitTracker = new RateLimitTracker();

type AIParams = {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
};

const asPromptText = (contents: any) => {
  if (typeof contents === 'string') return contents;
  if (Array.isArray(contents)) {
    const direct = contents.find((part) => typeof part === 'string');
    if (direct) return direct;
    const user = contents.find((part) => part?.role === 'user');
    const textPart = user?.parts?.find((part: any) => part?.text);
    if (textPart?.text) return textPart.text;
  }
  return JSON.stringify(contents);
};

const buildChatMessages = (params: AIParams) => {
  const messages = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }

  if (Array.isArray(params.contents)) {
    for (const msg of params.contents) {
      if (msg && typeof msg === 'object') {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        let content = '';
        if (Array.isArray(msg.parts)) {
          content = msg.parts.map((p: any) => p?.text || '').join('\n').trim();
        } else if (typeof msg.content === 'string') {
          content = msg.content;
        }
        messages.push({ role, content });
      }
    }
  } else {
    messages.push({ role: 'user', content: asPromptText(params.contents) });
  }
  return messages;
};

const parseJsonObject = (text: string) => {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
};

const hasGeminiKey = (rules: Rules) => Boolean(rules.gemini_api_key || process.env.EXPO_PUBLIC_GEMINI_API_KEY);

async function callGeminiREST(params: AIParams, model: string) {
  const rules = await db.getRules();
  const apiKey = rules.gemini_api_key || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('Gemini API-Key fehlt.');

  const body: any = {
    contents:
      typeof params.contents === 'string'
        ? [{ role: 'user', parts: [{ text: params.contents }] }]
        : params.contents,
  };

  if (params.systemInstruction) {
    body.systemInstruction = { parts: [{ text: params.systemInstruction }] };
  }
  if (params.temperature !== undefined) {
    body.generationConfig = { temperature: params.temperature };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Gemini HTTP ${response.status}`;
    if (response.status === 429) {
      rateLimitTracker.setLimit(model, errorMsg);
    }
    throw new Error(errorMsg);
  }

  rateLimitTracker.clearLimit(model);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini hat keine Textantwort geliefert.');
  return text as string;
}

async function callGeminiGroundedSearch(query: string) {
  const rules = await db.getRules();
  const apiKey = rules.gemini_api_key || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('Gemini API-Key fehlt.');

  const model = rules.gemini_model || GEMINI_MODEL;
  const todayStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Recherchiere aktuell im Web und antworte auf Deutsch. Fasse knapp und praktisch zusammen. Nenne keine Quellen im Fließtext; Quellen werden separat angezeigt.\n\n(Aktuelles Datum: ${todayStr})\n\nFrage: ${query}`,
          },
        ],
      },
    ],
    tools: [{ googleSearchRetrieval: {} }],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini Search HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini-Websuche hat keine Textantwort geliefert.');

  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: AgentWebSource[] = chunks
    .map((chunk: any) => {
      const url = chunk.web?.uri || chunk.web?.url || '';
      if (!url) return null;
      let domain = '';
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        domain = '';
      }
      return {
        title: chunk.web?.title || domain || url,
        url,
        domain,
      };
    })
    .filter(Boolean)
    .filter((source: AgentWebSource, index: number, arr: AgentWebSource[]) => arr.findIndex((item) => item.url === source.url) === index)
    .slice(0, 6);

  return { text: text as string, sources };
}

async function callDuckDuckGoSearch(query: string): Promise<{ sources: (AgentWebSource & { snippet: string })[] }> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) throw new Error(`DuckDuckGo HTTP ${response.status}`);
  const html = await response.text();

  const snippets: string[] = [];
  const titles: string[] = [];
  const urls: string[] = [];

  const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
  }

  const titleRegex = /<a class="result__url"[^>]*>([\s\S]*?)<\/a>/g;
  while ((match = titleRegex.exec(html)) !== null) {
    titles.push(match[1].replace(/<[^>]*>/g, '').trim());
  }

  const urlRegex = /<a class="result__url"[^>]*href="([^"]*)"/g;
  while ((match = urlRegex.exec(html)) !== null) {
    let rawUrl = match[1];
    if (rawUrl.includes('uddg=')) {
      const uddgMatch = rawUrl.match(/uddg=([^&]*)/);
      if (uddgMatch) {
        rawUrl = decodeURIComponent(uddgMatch[1]);
      }
    }
    if (rawUrl.startsWith('//')) {
      rawUrl = 'https:' + rawUrl;
    }
    urls.push(rawUrl);
  }

  const sources: (AgentWebSource & { snippet: string })[] = [];
  const minLength = Math.min(snippets.length, titles.length, urls.length);
  for (let i = 0; i < minLength; i++) {
    let domain = '';
    try {
      domain = new URL(urls[i]).hostname.replace(/^www\./, '');
    } catch {}

    sources.push({
      title: titles[i] || domain || urls[i],
      url: urls[i],
      domain,
      snippet: snippets[i],
    });
  }

  return { sources };
}

async function callGeminiWithFallback(params: AIParams) {
  const rules = await db.getRules();
  const models = [
    rules.gemini_model || GEMINI_MODEL,
    GEMINI_MODEL,
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  let lastError: unknown;

  for (const model of [...new Set(models)]) {
    try {
      return await callGeminiREST(params, model);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Alle Gemini-Modelle sind fehlgeschlagen.');
}

async function callOpenAI(params: AIParams) {
  const rules = await db.getRules();
  const apiKey = rules.openai_api_key || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('OpenAI API-Key fehlt.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: rules.openai_model || 'gpt-4o-mini',
      messages: buildChatMessages(params),
      temperature: params.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI hat keine Textantwort geliefert.');
  return text as string;
}

async function callOpenRouter(params: AIParams, modelOverride?: string) {
  const rules = await db.getRules();
  const apiKey = rules.openrouter_api_key || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OpenRouter API-Key fehlt.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://famsti.app',
      'X-Title': 'FamSti',
    },
    body: JSON.stringify({
      model: modelOverride || rules.openrouter_model || 'google/gemini-3.5-flash',
      messages: buildChatMessages(params),
      temperature: params.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter hat keine Textantwort geliefert.');
  return text as string;
}

async function callOllama(params: AIParams) {
  const rules = await db.getRules();
  const url = (rules.ollama_url || 'http://localhost:11434').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: rules.ollama_model || 'llama3',
        messages: buildChatMessages(params),
        temperature: params.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Ollama hat keine Textantwort geliefert.');
    return text as string;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOnDeviceLLM(): Promise<string> {
  throw new Error(
    Platform.OS === 'web'
      ? 'Lokales On-Device-Modell ist im Web nicht verfügbar.'
      : 'On-Device-LLM ist in Expo Go nicht im nativen Bundle enthalten.'
  );
}

async function generateContentWithFallback(params: AIParams) {
  const rules = await db.getRules();
  const provider = rules.ai_provider || 'gemini';
  const attempts: (() => Promise<string>)[] = [];

  if (provider === 'on_device') attempts.push(callOnDeviceLLM);
  if (provider === 'ollama') attempts.push(() => callOllama(params));
  if (provider === 'openai') attempts.push(() => callOpenAI(params));
  if (provider === 'openrouter') attempts.push(() => callOpenRouter(params));
  if (provider === 'gemini') attempts.push(() => callGeminiWithFallback(params));

  if (provider !== 'gemini' && hasGeminiKey(rules)) attempts.push(() => callGeminiWithFallback(params));
  if (provider !== 'openai' && (rules.openai_api_key || process.env.EXPO_PUBLIC_OPENAI_API_KEY)) attempts.push(() => callOpenAI(params));
  if (provider !== 'openrouter' && (rules.openrouter_api_key || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY)) {
    attempts.push(() => callOpenRouter(params));
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Kein KI-Provider ist eingerichtet.');
}

export const geminiService = {
  hasApiKey() {
    return Boolean(
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
        process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
        process.env.EXPO_PUBLIC_OPENROUTER_API_KEY
    );
  },

  async generateChatResponse(prompt: string | any[], systemInstruction?: string, temperature?: number) {
    return generateContentWithFallback({
      contents: prompt,
      systemInstruction,
      temperature: temperature ?? 0.7,
    });
  },

  async researchWeb(query: string): Promise<{ text: string; sources: AgentWebSource[] }> {
    try {
      return await callGeminiGroundedSearch(query);
    } catch (error) {
      console.warn('Gemini grounded search failed, trying DuckDuckGo fallback...', error);
      try {
        const ddgResults = await callDuckDuckGoSearch(query);
        if (ddgResults.sources.length > 0) {
          const context = ddgResults.sources
            .map((s, idx) => `[${idx + 1}] Quelle: ${s.title} (${s.url})\nInformation: ${s.snippet}`)
            .join('\n\n');
          
          const todayStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const prompt = `Du bist ein hilfreicher KI-Assistent für Fahrlehrer. Beantworte die Frage des Nutzers basierend auf den folgenden Suchergebnissen. Antworte auf Deutsch und bleibe kompakt und freundlich. Nenne die Quellen nicht im Fließtext, da sie dem Nutzer separat angezeigt werden.\n\n(Aktuelles Datum: ${todayStr})\n\nSuchergebnisse:\n${context}\n\nFrage: ${query}`;
          
          const text = await generateContentWithFallback({
            contents: prompt,
            temperature: 0.3,
          });
          
          return {
            text,
            sources: ddgResults.sources.map(s => ({ title: s.title, url: s.url, domain: s.domain })),
          };
        }
      } catch (ddgErr) {
        console.warn('DuckDuckGo fallback search failed too.', ddgErr);
      }

      const fallbackText = await generateContentWithFallback({
        contents: `Der Nutzer wollte aktuelle Web-Recherche, aber das Web-Tool ist nicht erreichbar. Erkläre kurz auf Deutsch, dass aktuelle Recherche gerade nicht möglich ist, und gib nur allgemeine Hinweise ohne Aktualitätsanspruch. Frage: ${query}`,
        temperature: 0.3,
      });
      return { text: fallbackText, sources: [] };
    }
  },

  async extractStudentFromImage(base64: string, mimeType: string) {
    const prompt =
      "Analysiere dieses Bild als deutschen Fahrschueler-Import. Antworte nur als JSON mit first_name, last_name, zone, pickup_address, phone, email, next_stage_day, notes und availabilities. Verfügbarkeiten: weekday 1-6, start_time HH:MM, end_time HH:MM.";

    try {
      const text = await generateContentWithFallback({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        temperature: 0.2,
      });

      const parsed = parseJsonObject(text);
      return {
        first_name: parsed.first_name || 'Unbekannt',
        last_name: parsed.last_name || 'Neu',
        zone: (parsed.zone || 'Rosenheim') as ZoneType,
        pickup_address: parsed.pickup_address || '',
        phone: parsed.phone || '',
        email: parsed.email || '',
        next_stage_day: Math.min(19, Math.max(1, Number(parsed.next_stage_day) || 1)),
        notes: parsed.notes || 'Scan Import',
        availabilities: Array.isArray(parsed.availabilities)
          ? (parsed.availabilities.filter(
              (a: Partial<Availability>) =>
                Number(a.weekday) >= 1 &&
                Number(a.weekday) <= 6 &&
                typeof a.start_time === 'string' &&
                typeof a.end_time === 'string'
            ) as Omit<Availability, 'id'>[])
          : [],
      };
    } catch (error) {
      console.warn('KI-Scan fehlgeschlagen.', error);
      throw new Error('Dokument konnte nicht ausgelesen werden. Bitte manuell eintragen.');
    }
  },

  async suggestSessionSlot(student: Student, students: Student[], sessions: Session[], rules: Rules, targetDate: string) {
    const weekday = new Date(targetDate).getDay() || 7;
    const workWindow = rules.work_windows[weekday];
    const stage = getPipelineForStudent(student, rules.pipeline).find((p) => p.day === student.next_stage_day);
    if (!workWindow || !stage) return null;

    const availability = student.availabilities.find((a) => a.weekday === weekday);
    const prompt = `
      Plane eine kollisionsfreie Fahrstunde.
      Schüler: ${student.first_name} ${student.last_name}
      Zieltag: ${targetDate}, Arbeitszeit ${workWindow.startTime}-${workWindow.endTime}
      Verfügbarkeit: ${availability ? `${availability.start_time}-${availability.end_time}` : 'keine Angabe, nutze Arbeitszeit'}
      Ausbildungsstufe: ${student.next_stage_day}, ${stage.duration} Minuten, ${stage.description}
      Schüleranzahl Kontext: ${students.length}
      Termine am Tag: ${sessions
        .filter((s) => s.date === targetDate && !s.cancellation_reason)
        .map((s) => `${s.start_time}-${s.end_time} ${s.student_name}`)
        .join('; ') || 'keine'}
      Antworte nur als JSON: {"start_time":"HH:MM","end_time":"HH:MM","reason":"..."}.
    `;

    try {
      const text = await generateContentWithFallback({ contents: prompt, temperature: 0.2 });
      const parsed = parseJsonObject(text);
      const start = typeof parsed.start_time === 'string' ? parsed.start_time : '';
      const end = typeof parsed.end_time === 'string' ? parsed.end_time : '';
      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);
      if (!start || !end || !Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) return null;
      if (checkCollision(targetDate, startMin, endMin, sessions, rules.gap_minutes)) return null;
      return {
        student,
        date: targetDate,
        start_time: start,
        end_time: end,
        duration_minutes: endMin - startMin,
        reason: parsed.reason || 'KI-Vorschlag',
      };
    } catch (error) {
      console.warn('KI-Planung fehlgeschlagen.', error);
      return null;
    }
  },

  async analyzeStudentProgress(student: Student, sessions: Session[], pipeline: PipelineStage[]) {
    const historicalSessions = sessions
      .filter((s) => s.student_id === student.id && s.confirmed)
      .sort((a, b) => a.date.localeCompare(b.date));
    const confirmedStages = historicalSessions.map((s) => s.stage_day);
    const totalStages = pipeline.length || 18;

    const prompt = `
      Analysiere den Fortschritt von ${student.first_name} ${student.last_name}.
      Aktueller Stand: Stufe ${student.next_stage_day}/${totalStages}.
      Absolvierte Stufen: ${confirmedStages.join(', ') || 'keine'}.
      Theorie bestanden: ${student.theory_passed_at || 'nein'}.
      Letzte Notizen: ${historicalSessions.map((s) => s.notes).filter(Boolean).slice(-3).join(' | ') || 'keine'}.
      Gib eine kurze professionelle Einschätzung auf Deutsch mit nächstem Fokus.
    `;

    try {
      return await generateContentWithFallback({
        contents: prompt,
        systemInstruction: 'Du bist ein erfahrener Fahrlehrer-Assistent.',
        temperature: 0.7,
      });
    } catch (error) {
      const progressPercent = Math.min(100, Math.round((student.next_stage_day / totalStages) * 100));
      return `Lokaler Fortschritts-Check: ${student.first_name} ist bei Stufe ${student.next_stage_day} (${progressPercent}%). Bestätigte Fahrten: ${historicalSessions.length}. Nächster Fokus: aktuelle Stufe sauber festigen.`;
    }
  },

  async getLiveCoachingTip(student: Student, currentStage: PipelineStage | undefined) {
    if (!currentStage) return null;

    try {
      return await generateContentWithFallback({
        contents: `Gib einen kurzen Coaching-Tipp für ${student.first_name} in Stufe ${currentStage.day}: ${currentStage.description}. Maximal zwei Sätze.`,
        systemInstruction: 'Du bist Mentor für Fahrlehrer. Antworte praktisch, knapp und auf Deutsch.',
      });
    } catch (error) {
      return `Achte bei ${currentStage.description} besonders auf ruhige Blickführung, klare Ansagen und frühzeitiges Absichern.`;
    }
  },

  async getDashboardInsights(students: Student[]) {
    const summaryData = {
      total: students.length,
      nearExpiry: students.filter((s) => {
        if (!s.application_date) return false;
        const expiry = new Date(s.application_date);
        expiry.setFullYear(expiry.getFullYear() + 1);
        const diff = expiry.getTime() - Date.now();
        return diff > 0 && diff < 1000 * 60 * 60 * 24 * 60;
      }).length,
      readyForTheory: students.filter((s) => s.has_application_submitted && !s.theory_passed_at).length,
      stalled: students.filter((s) => s.next_stage_day < 3 && !s.theory_passed_at).length,
    };

    try {
      return await generateContentWithFallback({
        contents: `Fahrschule: ${summaryData.total} Schüler, ${summaryData.nearExpiry} Anträge laufen bald ab, ${summaryData.readyForTheory} bereit für Theorie, ${summaryData.stalled} langsame Starter. Gib 3 kurze Action Items auf Deutsch.`,
        systemInstruction: 'Du bist ein Fahrschul-Betriebsberater.',
      });
    } catch (error) {
      return `Lokale Analyse: ${summaryData.total} aktive Schüler. ${summaryData.nearExpiry} Anträge laufen bald ab. ${summaryData.readyForTheory} Schüler können Richtung Theorieprüfung vorbereitet werden.`;
    }
  },

  async analyzeDocument(base64Image: string) {
    return this.extractStudentFromImage(base64Image, 'image/jpeg');
  },

  async summarizeSessionNotes(rawText: string) {
    try {
      return await generateContentWithFallback({
        contents: `Strukturiere diese Fahrstunden-Notizen professionell auf Deutsch:\n${rawText}`,
        systemInstruction: 'Du bist Fahrlehrer-Sekretariat. Antworte kurz und brauchbar.',
      });
    } catch (error) {
      return `Erreicht: Notizen erfasst.\nNächstes Mal: Inhalte vertiefen.\nFeedback: ${rawText || 'Keine Details.'}`;
    }
  },

  async getSmartPlanningSuggestion(students: Student[], sessions: Session[]) {
    const sleepers = students.filter((student) => {
      const hasFuture = sessions.some((session) => session.student_id === student.id && new Date(session.date) >= new Date());
      return !hasFuture && !student.practical_exam_at;
    });
    const nearExam = students.filter((student) => student.next_stage_day >= 17 && !student.practical_exam_at);

    try {
      return await generateContentWithFallback({
        contents: `Gib 3 konkrete Buchungsempfehlungen. Schläfer: ${sleepers.map((s) => s.first_name).join(', ') || 'keine'}. Kurz vor Prüfung: ${nearExam.map((s) => s.first_name).join(', ') || 'keine'}.`,
        systemInstruction: 'Du bist Disponent für eine Fahrschule.',
      });
    } catch (error) {
      return `Planungs-Tipps: Kontaktiere zuerst ${sleepers.slice(0, 3).map((s) => s.first_name).join(', ') || 'Schüler ohne Folgetermin'}. Für Prüfungsvorbereitung priorisieren: ${nearExam.slice(0, 3).map((s) => s.first_name).join(', ') || 'keine Kandidaten'}.`;
    }
  },

  async getRouteOptimizationSuggestion(sessions: Session[]) {
    const todaySessions = [...sessions].sort((a, b) => a.start_time.localeCompare(b.start_time));

    try {
      return await generateContentWithFallback({
        contents: `Analysiere diese Tagesroute: ${todaySessions.map((s) => `${s.start_time} ${s.student_name} ${s.zone}`).join('; ') || 'keine Termine'}. Maximal 3 Sätze.`,
        systemInstruction: 'Du bist Logistik-Experte für Fahrschulen.',
      });
    } catch (error) {
      return `Lokaler Routen-Check: ${todaySessions.length} Termine geplant. Achte auf Zonenwechsel und genug Puffer zwischen den Fahrten.`;
    }
  },

  async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    const rules = await db.getRules();
    const apiKey = rules.gemini_api_key || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Gemini API-Key fehlt.');

    const models = [
      rules.gemini_model || GEMINI_MODEL,
      GEMINI_MODEL,
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];
    const uniqueModels = [...new Set(models)];
    let lastError: any = null;

    for (const model of uniqueModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: 'Transkribiere dieses Audio exakt auf Deutsch. Gib NUR den transkribierten Text zurück, keinen weiteren Text, keinen Kommentar, keine Einleitung und keine Anführungszeichen. Wenn das Audio stumm oder unverständlich ist, gib ein leeres Wort zurück.',
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Audio,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          const errorMsg = errorJson.error?.message || `HTTP ${response.status}`;
          if (response.status === 429) {
            rateLimitTracker.setLimit(model, errorMsg);
          }
          throw new Error(`Gemini Audio transcription failed for model ${model}: ${errorMsg}`);
        }

        rateLimitTracker.clearLimit(model);

        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text !== undefined) {
          return text.trim();
        }
      } catch (err) {
        lastError = err;
        console.warn(`Transcription failed for model ${model}, trying next...`, err);
      }
    }

    throw lastError || new Error('Gemini Audio transcription failed for all models.');
  },
};
