import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useQueryClient } from '@tanstack/react-query';
import { agentService } from './agentService';
import { geminiService } from '../services/geminiService';
import { executeAgentOperation } from './tools';
import { AgentOperation, AgentProactiveInsight, AgentWebSource } from './types';
import { sessionFollowups } from './sessionFollowups';
import { db } from '../lib/storage';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isVoice?: boolean;
  webSources?: AgentWebSource[];
};

export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'transcribing';

interface AgentContextType {
  open: boolean;
  setOpen: (val: boolean) => void;
  input: string;
  setInput: (val: string) => void;
  messages: Message[];
  loading: boolean;
  pendingOperations: AgentOperation[];
  setPendingOperations: React.Dispatch<React.SetStateAction<AgentOperation[]>>;
  proactiveInsights: AgentProactiveInsight[];
  setProactiveInsights: React.Dispatch<React.SetStateAction<AgentProactiveInsight[]>>;
  memoryCount: number;
  profileFactCount: number;
  knowledgeCount: number;
  notice: string | null;
  showNotice: (text: string) => void;
  sendMessage: (text: string, isVoice?: boolean) => Promise<void>;
  triggerWithQuery: (query: string) => Promise<void>;
  confirmOperation: (operation: AgentOperation) => Promise<void>;
  rejectOperation: (operation: AgentOperation) => void;
  handleInsightAction: (insight: AgentProactiveInsight) => Promise<void>;
  dismissInsight: (insight: AgentProactiveInsight) => Promise<void>;
  recordingState: RecordingState;
  isRecording: boolean;
  handleMicPress: () => void;
  refreshInsights: () => void;
}

const isSimilarOperation = (op1: AgentOperation, op2: AgentOperation): boolean => {
  if (op1.type !== op2.type) return false;
  const p1 = op1.payload || {};
  const p2 = op2.payload || {};

  if (op1.type === 'SAVE_SESSION') {
    return (
      (p1.student_name === p2.student_name || p1.student_id === p2.student_id) &&
      p1.date === p2.date &&
      p1.start_time === p2.start_time
    );
  }
  if (op1.type === 'SAVE_SESSIONS_BATCH' || op1.type === 'DELETE_SESSIONS_BATCH' || op1.type === 'CONFIRM_SESSIONS_BATCH') {
    return op1.id === op2.id || op1.summary === op2.summary;
  }
  if (op1.type === 'SAVE_STUDENT') {
    return p1.first_name === p2.first_name && p1.last_name === p2.last_name;
  }
  if (op1.type === 'DELETE_SESSION') {
    return p1.id === p2.id;
  }
  if (op1.type === 'SAVE_REMINDER') {
    return p1.title === p2.title && p1.due_date === p2.due_date;
  }
  if (op1.type === 'SEND_WHATSAPP') {
    return p1.phone === p2.phone;
  }
  if (op1.type === 'NAVIGATE') {
    return (p1.route || p1.path) === (p2.route || p2.path);
  }
  return false;
};


const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [profileFactCount, setProfileFactCount] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<AgentOperation[]>([]);
  const [proactiveInsights, setProactiveInsights] = useState<AgentProactiveInsight[]>([]);
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const isRecording = recordingState === 'recording' || recordingState === 'starting';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ich bin dein FamSti Agent. Ich kenne die App, kann Aktionen vorbereiten und frage bei Änderungen erst nach deiner Bestätigung.',
    },
  ]);

  // Load counts on mount
  useEffect(() => {
    agentService.getMemoryCount().then(setMemoryCount).catch(() => setMemoryCount(0));
    agentService.getProfileFactCount().then(setProfileFactCount).catch(() => setProfileFactCount(0));
  }, []);

  // Proactive insights polling
  const loadInsights = () => {
    agentService
      .getProactiveInsights()
      .then((insights) => {
        setProactiveInsights(insights);
      })
      .catch(() => {
        setProactiveInsights([]);
      });
  };

  useEffect(() => {
    loadInsights();
    const interval = setInterval(loadInsights, 1000 * 60 * 5); // 5 mins
    return () => clearInterval(interval);
  }, [pathname]);

  const checkDueSessionFollowups = async () => {
    const due = await sessionFollowups.getDue().catch(() => []);
    if (due.length === 0) return;

    const sessions = await db.getSessions().catch(() => []);
    const operations: AgentOperation[] = [];
    for (const followup of due.slice(0, 3)) {
      const session = sessions.find((item) => item.id === followup.sessionId);
      if (!session || session.confirmed || session.cancellation_reason) {
        await sessionFollowups.completeBySession(followup.sessionId);
        continue;
      }
      operations.push({
        id: `confirm-${followup.id}`,
        type: 'CONFIRM_SESSION',
        payload: { id: session.id, followup_id: followup.id, confirmed: true },
        summary: `${session.student_name} ${session.date} ${session.start_time}-${session.end_time} als gefahren buchen`,
        risk: 'medium',
        requiresConfirmation: true,
      });
    }

    if (operations.length > 0) {
      await sessionFollowups.markAsked(due.map((item) => item.id));
      setPendingOperations((prev) => [...operations, ...prev].slice(0, 10));
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          text: 'Eine oder mehrere Fahrstunden sind vorbei. Ich habe dir die Buchung zur Bestätigung vorbereitet.',
        },
      ]);
      setOpen(true);
    }
  };

  useEffect(() => {
    checkDueSessionFollowups();
    const interval = setInterval(checkDueSessionFollowups, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const invalidateQueryKeysForOperation = (type: string) => {
    if (type.includes('SESSION')) {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    } else if (type.includes('STUDENT')) {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    } else if (type.includes('REMINDER')) {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    } else if (type.includes('ERROR')) {
      queryClient.invalidateQueries({ queryKey: ['systemErrors'] });
    }
  };

  const runImmediateOperations = async (operations: AgentOperation[]) => {
    for (const operation of operations) {
      if (operation.type === 'CLEAR_PENDING') {
        setPendingOperations([]);
        continue;
      }
      try {
        const result = await executeAgentOperation(operation, router);
        showNotice(result);
        invalidateQueryKeysForOperation(operation.type);
        setPendingOperations((prev) => prev.filter((item) => !isSimilarOperation(operation, item)));
      } catch (error) {
        console.warn('Agent operation failed', error);
        showNotice('Aktion konnte nicht ausgeführt werden.');
      }
    }
  };

  const confirmAllPending = async () => {
    const operations = pendingOperations;
    if (operations.length === 0) return false;
    setPendingOperations([]);
    let success = 0;
    for (const operation of operations) {
      try {
        await executeAgentOperation(operation, router);
        invalidateQueryKeysForOperation(operation.type);
        success += 1;
      } catch (error) {
        console.warn('Agent batch operation failed', error);
      }
    }
    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), role: 'assistant', text: `${success} vorbereitete Aktion${success === 1 ? '' : 'en'} wurden ausgeführt.` },
    ]);
    showNotice(`${success} Aktion${success === 1 ? '' : 'en'} ausgeführt`);
    return true;
  };

  const sendMessage = async (text: string, isVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { id: uuidv4(), role: 'user', text: trimmed, isVoice }]);

    // Immediate local cancellation fallback
    const lowercaseInput = trimmed.toLowerCase();
    const isCancellation = 
      /^(abbrechen|doch\s+nicht|nein|stopp|halt|storno|verwerfen|cancel|nichts\s+löschen|nicht\s+löschen|nicht\s+speichern)$/i.test(lowercaseInput) ||
      (lowercaseInput.includes('nicht') && (lowercaseInput.includes('lösch') || lowercaseInput.includes('speicher') || lowercaseInput.includes('änder'))) ||
      lowercaseInput === 'nee' || lowercaseInput === 'nein';

    if (isCancellation) {
      setPendingOperations([]);
    }

    const isApproval = /^(ja|jawohl|ok|okay|mach|einbuchen|speichern|bestätigen|buchen|plane sie ein|trag.*ein)/i.test(lowercaseInput);
    if (isApproval && pendingOperations.length > 0) {
      await confirmAllPending();
      setLoading(false);
      return;
    }

    try {
      const result = await agentService.runTurn({
        input: trimmed,
        currentPath: pathname,
        history: messages.map(m => ({ role: m.role, text: m.text })),
      });
      setMemoryCount(result.memoryCount);
      setProfileFactCount(result.profileFactCount);
      setKnowledgeCount(result.knowledgeCount);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', text: result.text, webSources: result.webSources },
      ]);

      const hasClearPending = result.operations.some((op) => op.type === 'CLEAR_PENDING');
      if (hasClearPending) {
        setPendingOperations([]);
      }

      const immediate = result.operations.filter((operation) => !operation.requiresConfirmation);
      const needsConfirmation = result.operations.filter((operation) => operation.requiresConfirmation);

      if (immediate.length > 0) await runImmediateOperations(immediate);
      if (needsConfirmation.length > 0) {
        setPendingOperations((prev) => {
          const uniqueNew = needsConfirmation.filter(
            (newOp) => !prev.some((existing) => isSimilarOperation(newOp, existing))
          );
          if (uniqueNew.length === 0) return prev;
          return [...uniqueNew, ...prev].slice(0, 8);
        });
        showNotice(`${needsConfirmation.length} Aktion${needsConfirmation.length === 1 ? '' : 'en'} wartet auf Bestätigung`);
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerWithQuery = async (query: string) => {
    setOpen(true);
    await sendMessage(query);
  };

  const confirmOperation = async (operation: AgentOperation) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await executeAgentOperation(operation, router);
      invalidateQueryKeysForOperation(operation.type);
      setPendingOperations((prev) => prev.filter((item) => item.id !== operation.id && !isSimilarOperation(operation, item)));
      showNotice(result);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', text: `${operation.summary} wurde ausgeführt.` },
      ]);
    } catch (error) {
      console.warn('Confirmed agent operation failed', error);
      showNotice('Aktion konnte nicht ausgeführt werden.');
    }
  };

  const rejectOperation = async (operation: AgentOperation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (operation.type === 'CONFIRM_SESSION' && operation.payload?.followup_id) {
      await sessionFollowups.snooze(operation.payload.followup_id, 15);
      showNotice('Ich frage später noch einmal nach.');
    }
    setPendingOperations((prev) => prev.filter((item) => item.id !== operation.id));
  };

  const handleInsightAction = async (insight: AgentProactiveInsight) => {
    const immediate = insight.suggestedOperations.filter((operation) => !operation.requiresConfirmation);
    const needsConfirmation = insight.suggestedOperations.filter((operation) => operation.requiresConfirmation);
    if (immediate.length > 0) await runImmediateOperations(immediate);
    if (needsConfirmation.length > 0) {
      setPendingOperations((prev) => {
        const uniqueNew = needsConfirmation.filter(
          (newOp) => !prev.some((existing) => isSimilarOperation(newOp, existing))
        );
        if (uniqueNew.length === 0) return prev;
        return [...uniqueNew, ...prev].slice(0, 8);
      });
      setOpen(true);
    }
  };

  const dismissInsight = async (insight: AgentProactiveInsight) => {
    await agentService.dismissProactiveInsight(insight.id);
    setProactiveInsights((prev) => prev.filter((item) => item.id !== insight.id));
  };

  const startRecording = async () => {
    if (recordingState !== 'idle') return;
    setRecordingState('starting');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showNotice('Mikrofon-Berechtigung verweigert.');
        setRecordingState('idle');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setRecordingState('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
      showNotice('Aufnahme konnte nicht gestartet werden.');
      setRecordingState('idle');
    }
  };

  const stopRecording = async () => {
    if (recordingState !== 'recording' || !recording) return;
    setRecordingState('stopping');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setLoading(false);
        showNotice('Keine Audio-Datei erzeugt.');
        setRecordingState('idle');
        return;
      }

      setRecordingState('transcribing');

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const transcribedText = await geminiService.transcribeAudio(base64, 'audio/mp4');
      setLoading(false);
      setRecordingState('idle');

      if (transcribedText && transcribedText.trim()) {
        setInput('');
        sendMessage(transcribedText, true);
      } else {
        showNotice('Sprache konnte nicht erkannt werden.');
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setLoading(false);
      setRecording(null);
      setRecordingState('idle');
      showNotice('Transkription fehlgeschlagen.');
    }
  };

  const handleMicPress = () => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle') {
      startRecording();
    }
  };

  return (
    <AgentContext.Provider
      value={{
        open,
        setOpen,
        input,
        setInput,
        messages,
        loading,
        pendingOperations,
        setPendingOperations,
        proactiveInsights,
        setProactiveInsights,
        memoryCount,
        profileFactCount,
        knowledgeCount,
        notice,
        showNotice,
        sendMessage,
        triggerWithQuery,
        confirmOperation,
        rejectOperation,
        handleInsightAction,
        dismissInsight,
        recordingState,
        isRecording,
        handleMicPress,
        refreshInsights: loadInsights,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
