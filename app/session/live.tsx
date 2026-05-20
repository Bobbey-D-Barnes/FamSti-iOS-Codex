// Live Session Screen – FamSti iOS
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check, Clock, Phone, Play, Pause, Hand, Navigation, MessageSquare, Wand2, RotateCcw, ListTodo, Mic, Square, SlidersHorizontal } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { CURRICULUM, PIPELINE } from '../../src/constants';
import { Card, Badge, Button, Modal, Input, ZoneBadge, LoadingSpinner } from '../../src/components/ui';
import { formatTimer } from '../../src/lib/utils';
import { Session, Student } from '../../src/types';
import { geminiService } from '../../src/services/geminiService';

export default function SessionLiveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isFinishingModal, setIsFinishingModal] = useState(false);
  const [isNotesModal, setIsNotesModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [interventions, setInterventions] = useState(0);
  const [cancellationReason, setCancellationReason] = useState('');
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [isAdkModal, setIsAdkModal] = useState(false);

  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const { data: students, isLoading: stLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const { data: rules } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const pipeline = rules?.pipeline || PIPELINE;

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTimerRunning) interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning]);

  // Find active session
  const now = new Date();
  const sorted = sessions?.sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime()) || [];
  const activeSession = sorted.find((s) => {
    const start = new Date(`${s.date}T${s.start_time}`);
    const end = new Date(`${s.date}T${s.end_time}`);
    return now >= new Date(start.getTime() - 30 * 60000) && now <= new Date(end.getTime() + 15 * 60000) && !s.confirmed && !s.cancellation_reason;
  });
  const student = students?.find((s) => s.id === activeSession?.student_id);
  const stageInfo = student ? pipeline.find((p: any) => p.day === student.next_stage_day) : null;

  useEffect(() => {
    if (activeSession) { setSessionNotes(activeSession.notes || ''); setInterventions(activeSession.interventions || 0); }
  }, [activeSession?.id]);

  useEffect(() => {
    if (activeSession && student && !coachingTip && !tipLoading) getTip();
  }, [activeSession?.id, student?.id]);

  const getTip = async () => {
    if (!student) return;
    setTipLoading(true);
    const tip = await geminiService.getLiveCoachingTip(student, stageInfo as any);
    setCoachingTip(tip ?? null);
    setTipLoading(false);
  };

  const updateSession = async (updates: Partial<Session>) => {
    if (!activeSession) return;
    await db.saveSession({ ...activeSession, ...updates });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const handleIntervention = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const c = interventions + 1;
    setInterventions(c);
    updateSession({ interventions: c });
  };

  const updateTrainingLevel = async (itemId: string, level: number) => {
    if (!student) return;
    const tp = { ...student.training_progress, [itemId]: level };
    await db.saveStudent({ ...student, training_progress: tp });
    queryClient.invalidateQueries({ queryKey: ['students'] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleRecording = () => {
    const next = !isRecording;
    setIsRecording(next);
    setRecordingStartedAt(next ? new Date().toISOString() : null);
    updateSession({
      notes: `${sessionNotes}${sessionNotes ? '\n' : ''}${next ? 'Aufnahme gestartet' : 'Aufnahme beendet'} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  const confirmMutation = useMutation({
    mutationFn: async (status: 'confirm' | 'cancel') => {
      if (!activeSession) return;
      if (status === 'confirm') {
        await db.saveSession({ ...activeSession, notes: sessionNotes, interventions });
        await db.confirmSession({ ...activeSession, notes: sessionNotes, interventions });
      }
      else await db.saveSession({ ...activeSession, cancellation_reason: cancellationReason || 'Sonstige', notes: sessionNotes, interventions });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); queryClient.invalidateQueries({ queryKey: ['students'] }); router.back(); },
  });

  if (sLoading || stLoading) return <LoadingSpinner />;

  if (!activeSession || !student) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Clock size={36} color="#6E6A85" />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>Keine aktive Fahrt</Text>
        <Text style={{ fontSize: 14, color: '#6E6A85', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>Es wurde keine aktuelle oder anstehende Fahrstunde gefunden.</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 24 }}><Text style={{ color: '#FFF', fontWeight: '600' }}>Zurück</Text></Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }}>
      {/* Header */}
      <LinearGradient colors={['#6C5CE7', '#5B4BD4']} style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><ChevronLeft size={28} color="#FFF" /></TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] }}>{formatTimer(elapsedTime)}</Text>
            <TouchableOpacity onPress={() => setIsTimerRunning(!isTimerRunning)} style={{ padding: 4, marginTop: 4 }}>
              {isTimerRunning ? <Pause size={18} color="rgba(255,255,255,0.7)" /> : <Play size={18} color="rgba(255,255,255,0.7)" />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>{student.first_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>{student.first_name} {student.last_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Badge style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Tag {activeSession.stage_day}</Text></Badge>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{activeSession.start_time} – {activeSession.end_time}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${student.phone}`)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
            <Phone size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(student.pickup_address || 'Fahrschule')}`)} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0EEF6', gap: 6 }}>
            <Navigation size={20} color="#4F8AE6" /><Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F0EEF6' : '#1A1625' }}>Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsNotesModal(true)} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0EEF6', gap: 6 }}>
            <MessageSquare size={20} color="#8B5CF6" /><Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F0EEF6' : '#1A1625' }}>Notizen</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleIntervention} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: interventions > 0 ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.05)' : '#F0EEF6'), gap: 6 }}>
            <Hand size={20} color={interventions > 0 ? '#EF4444' : '#6E6A85'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: interventions > 0 ? '#EF4444' : isDark ? '#F0EEF6' : '#1A1625' }}>Eingriff {interventions > 0 ? `(${interventions})` : ''}</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Session-Aufnahme</Text>
              <Text style={{ fontSize: 12, color: '#6E6A85', marginTop: 3 }}>
                {isRecording ? `Läuft seit ${recordingStartedAt ? new Date(recordingStartedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'gerade eben'}` : 'Bereit für Beobachtungen und Nachbesprechung'}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleRecording} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: isRecording ? '#EF4444' : '#10B981', justifyContent: 'center', alignItems: 'center' }}>
              {isRecording ? <Square size={18} color="#FFF" fill="#FFF" /> : <Mic size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setIsAdkModal(true)} style={{ height: 46, borderRadius: 14, backgroundColor: isDark ? 'rgba(108,92,231,0.14)' : '#F0EDFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <SlidersHorizontal size={18} color="#6C5CE7" />
            <Text style={{ color: '#6C5CE7', fontWeight: '800' }}>ADK / Kompetenzen bewerten</Text>
          </TouchableOpacity>
        </Card>

        {/* Stage Info */}
        <Card style={{ borderLeftWidth: 4, borderLeftColor: '#6C5CE7' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#6C5CE7' }}>{stageInfo?.description || 'Fahrstunde'}</Text>
              <Text style={{ fontSize: 13, color: '#6E6A85', marginTop: 4 }}>Dauer: {activeSession.duration_minutes} Minuten</Text>
            </View>
            <ZoneBadge zone={activeSession.zone} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {stageInfo?.isNight && <Badge><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Nachtfahrt</Text></Badge>}
            {stageInfo?.isHighway && <Badge style={{ backgroundColor: '#4F8AE6' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Autobahn</Text></Badge>}
          </View>
        </Card>

        {/* AI Coaching Tip */}
        <Card style={{ backgroundColor: isDark ? 'rgba(108,92,231,0.08)' : '#F8F6FF' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Wand2 size={14} color="#6C5CE7" /><Text style={{ fontSize: 11, fontWeight: '800', color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: 1 }}>KI-Coaching Tipp</Text>
            </View>
            <TouchableOpacity onPress={getTip} disabled={tipLoading}><RotateCcw size={14} color="#6E6A85" /></TouchableOpacity>
          </View>
          {coachingTip ? (
            <Text style={{ fontSize: 13, color: isDark ? '#C4B5FD' : '#4C3D99', fontStyle: 'italic', lineHeight: 20 }}>"{coachingTip}"</Text>
          ) : (
            <Text style={{ fontSize: 13, color: '#6E6A85' }}>Tipp wird geladen...</Text>
          )}
        </Card>

        {/* Curriculum */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ListTodo size={18} color="#6C5CE7" /><Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>Kompetenzen</Text>
          </View>
          {CURRICULUM.map((cat) => {
            const colorMap: Record<string, string> = { orange: '#F97316', amber: '#F59E0B', blue: '#4F8AE6', red: '#EF4444' };
            return (
              <View key={cat.id} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colorMap[cat.color] || '#6E6A85', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat.title}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {cat.items.map((item) => {
                    const checked = (student.training_progress?.[item.id] || 0) > 0;
                    return (
                      <TouchableOpacity key={item.id} onPress={() => updateTrainingLevel(item.id, checked ? 0 : 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: checked ? 'rgba(108,92,231,0.3)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: checked ? 'rgba(108,92,231,0.1)' : 'transparent' }}>
                        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: checked ? '#6C5CE7' : '#C4C1D4', backgroundColor: checked ? '#6C5CE7' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {checked && <Check size={11} color="#FFF" strokeWidth={3} />}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: checked ? '#6C5CE7' : isDark ? '#F0EEF6' : '#1A1625' }}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 40, backgroundColor: isDark ? 'rgba(15,13,26,0.95)' : 'rgba(248,247,252,0.95)' }}>
        <Button onPress={() => setIsFinishingModal(true)} style={{ height: 52, borderRadius: 16 }}>
          <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Fahrt abschließen</Text>
        </Button>
      </View>

      {/* Finish Modal */}
      <Modal visible={isFinishingModal} onClose={() => setIsFinishingModal(false)} title="Fahrt abschließen">
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 14, color: '#6E6A85' }}>Fahrstunde buchen oder stornieren?</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => confirmMutation.mutate('confirm')} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
              <Check size={18} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Buchen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCancellationReason('Krankheit')} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Stornieren</Text>
            </TouchableOpacity>
          </View>
          {cancellationReason !== '' && (
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F2F8', gap: 10, marginTop: 4 }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: isDark ? '#F0EEF6' : '#1A1625' }}>Grund wählen:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Krankheit', 'Privat', 'Geschäftlich', 'Sonstige'].map((r) => (
                  <TouchableOpacity key={r} onPress={() => setCancellationReason(r)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: cancellationReason === r ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#FFF', borderWidth: 0.5, borderColor: cancellationReason === r ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ fontWeight: '600', color: cancellationReason === r ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => confirmMutation.mutate('cancel')} style={{ height: 44, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Jetzt stornieren</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={isNotesModal} onClose={() => setIsNotesModal(false)} title="Notizen">
        <View style={{ gap: 12 }}>
          <Input value={sessionNotes} onChangeText={setSessionNotes} placeholder="Notizen zur Fahrstunde..." multiline numberOfLines={5} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="outline" onPress={() => setIsNotesModal(false)} style={{ flex: 1 }}><Text style={{ color: '#6C5CE7', fontWeight: '600' }}>Abbrechen</Text></Button>
            <Button onPress={() => { updateSession({ notes: sessionNotes }); setIsNotesModal(false); }} style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text></Button>
          </View>
        </View>
      </Modal>

      <Modal visible={isAdkModal} onClose={() => setIsAdkModal(false)} title="ADK bewerten">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          {CURRICULUM.map((cat) => (
            <View key={cat.id} style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: 1 }}>{cat.title}</Text>
              {cat.items.map((item) => {
                const value = student.training_progress?.[item.id] || 0;
                return (
                  <View key={item.id} style={{ padding: 12, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F2F8', gap: 10 }}>
                    <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{item.label}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[0, 1, 2, 3].map((level) => (
                        <TouchableOpacity key={level} onPress={() => updateTrainingLevel(item.id, level)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: value === level ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#FFF' }}>
                          <Text style={{ color: value === level ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800' }}>{level}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}
