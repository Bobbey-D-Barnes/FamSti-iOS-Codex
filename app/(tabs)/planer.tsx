// Planer Screen – FamSti iOS
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Calendar, ChevronLeft, ChevronRight, Wand2, Check, Clock, Trash2, Plus, Pencil, XCircle, Sparkles } from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/lib/storage';
import { planWeek, projectMasterPlan } from '../../src/lib/scheduler';
import { DEFAULT_RULES } from '../../src/constants';
import { Card, Badge, ZoneBadge, LoadingSpinner, Modal, Input, Button } from '../../src/components/ui';
import { getMonday, toISODate, getWeekDays, timeToMinutes, minutesToTime } from '../../src/lib/utils';
import { Session, SessionType, Student } from '../../src/types';
import { geminiService } from '../../src/services/geminiService';
import { useAgent } from '../../src/agent/AgentProvider';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'driving', label: 'Fahrt' },
  { key: 'theory', label: 'Theorie' },
  { key: 'practice', label: 'Praxisprüfung' },
];

const emptyManual = (date: string) => ({
  studentId: '',
  type: 'driving' as SessionType,
  date,
  start: '09:00',
  duration: '60',
  stage: '1',
  notes: '',
});

export default function PlanerScreen() {
  const queryClient = useQueryClient();
  const { triggerWithQuery } = useAgent();
  const { isDark } = useAppTheme();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() === 0 ? 1 : Math.min(new Date().getDay(), 6));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [manual, setManual] = useState(() => emptyManual(toISODate(new Date())));
  const [aiLoading, setAiLoading] = useState(false);

  const { data: students, isLoading: stLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;
  const weekDays = getWeekDays(currentWeekStart);

  const activeStudents = useMemo(() => (students || []).filter((s) => !s.practical_exam_at), [students]);
  const selectedDate = weekDays[selectedDay - 1];
  const selectedDateStr = selectedDate ? toISODate(selectedDate) : toISODate(new Date());
  const todayStr = toISODate(new Date());

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sessions'] });

  const saveSessionMutation = useMutation({
    mutationFn: (s: Session) => db.saveSession(s),
    onSuccess: () => {
      invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowManual(false);
      setEditingSession(null);
    },
  });
  const deleteSession = useMutation({ mutationFn: (id: string) => db.deleteSession(id), onSuccess: invalidate });
  const confirmSession = useMutation({
    mutationFn: (s: Session) => db.confirmSession(s),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const autoPlanMutation = useMutation({
    mutationFn: async (master: boolean) => {
      if (!students || !sessions) return 0;
      const active = students.filter((s) => !s.practical_exam_at);
      const newSessions = master ? projectMasterPlan(active, sessions, rules, currentWeekStart) : planWeek(active, sessions, rules, currentWeekStart);
      for (const s of newSessions) await db.saveSession(s);
      return newSessions.length;
    },
    onSuccess: (count) => {
      invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Planung fertig', `${count || 0} neue Termine geplant.`);
    },
  });

  const navigateWeek = (dir: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeekStart(getMonday(d));
  };

  const openManual = (date = selectedDateStr, session?: Session) => {
    if (session) {
      setEditingSession(session);
      setManual({
        studentId: session.student_id,
        type: session.type || 'driving',
        date: session.date,
        start: session.start_time,
        duration: String(session.duration_minutes || Math.max(30, timeToMinutes(session.end_time) - timeToMinutes(session.start_time))),
        stage: String(session.stage_day || 1),
        notes: session.notes || '',
      });
    } else {
      setEditingSession(null);
      setManual(emptyManual(date));
    }
    setShowManual(true);
  };

  const handleManualSave = () => {
    const student = students?.find((s) => s.id === manual.studentId);
    if (!student) {
      Alert.alert('Schüler fehlt', 'Bitte wähle einen Schüler aus.');
      return;
    }
    const startMin = timeToMinutes(manual.start);
    const duration = Math.max(15, Number(manual.duration) || 60);
    if (!Number.isFinite(startMin)) {
      Alert.alert('Uhrzeit prüfen', 'Bitte nutze HH:MM, z. B. 09:30.');
      return;
    }
    const session: Session = {
      id: editingSession?.id || uuidv4(),
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      zone: student.zone,
      stage_day: manual.type === 'driving' ? Math.max(1, Number(manual.stage) || student.next_stage_day) : 0,
      date: manual.date,
      start_time: manual.start,
      end_time: minutesToTime(startMin + duration),
      duration_minutes: duration,
      used_joker: editingSession?.used_joker || false,
      is_manual: true,
      confirmed: editingSession?.confirmed || false,
      type: manual.type,
      cancellation_reason: null,
      notes: manual.notes,
      interventions: editingSession?.interventions || 0,
    };
    saveSessionMutation.mutate(session);
  };

  const handleAiSuggestion = async () => {
    const student = students?.find((s) => s.id === manual.studentId) || activeStudents[0];
    if (!student || !sessions) {
      Alert.alert('KI-Vorschlag', 'Bitte wähle zuerst einen aktiven Schüler.');
      return;
    }
    setAiLoading(true);
    const proposal = await geminiService.suggestSessionSlot(student, activeStudents, sessions, rules, manual.date);
    setAiLoading(false);
    if (!proposal) {
      Alert.alert('KI-Vorschlag', geminiService.hasApiKey() ? 'Heute wurde kein kollisionsfreier Vorschlag gefunden.' : 'Gemini ist nicht eingerichtet. Die manuelle Planung bleibt verfügbar.');
      return;
    }
    setManual((prev) => ({
      ...prev,
      studentId: student.id,
      start: proposal.start_time,
      duration: String(proposal.duration_minutes),
      stage: String(student.next_stage_day),
      notes: proposal.reason,
    }));
  };

  if (stLoading || sLoading) return <LoadingSpinner />;

  const allSessions = sessions || [];
  const weekLabel = `${weekDays[0]?.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} - ${weekDays[5]?.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const daySessions = allSessions.filter((s) => s.date === selectedDateStr && !s.cancellation_reason).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const monthDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const renderSession = (session: Session) => (
    <Card key={session.id} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: session.confirmed ? '#10B981' : session.type === 'practice' ? '#EF4444' : session.type === 'theory' ? '#F59E0B' : '#6C5CE7' }}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => openManual(session.date, session)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: isDark ? '#F0EEF6' : '#1A1625' }}>{session.student_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <ZoneBadge zone={session.zone} />
              <Text style={{ fontSize: 12, color: '#6E6A85' }}>{session.type === 'theory' ? 'Theorie' : session.type === 'practice' ? 'Praxisprüfung' : `Tag ${session.stage_day}`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Clock size={14} color="#6E6A85" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F0EEF6' : '#1A1625' }}>{session.start_time} - {session.end_time}</Text>
            </View>
            {session.notes ? <Text style={{ fontSize: 12, color: '#6E6A85', marginTop: 6 }} numberOfLines={2}>{session.notes}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {!session.confirmed && (
              <TouchableOpacity onPress={() => confirmSession.mutate(session)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}>
                <Check size={18} color="#10B981" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => openManual(session.date, session)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(108,92,231,0.14)' : '#F0EDFF', justifyContent: 'center', alignItems: 'center' }}>
              <Pencil size={16} color="#6C5CE7" />
            </TouchableOpacity>
          </View>
        </View>
        {session.confirmed && <Badge variant="success" style={{ marginTop: 8 }}>Bestätigt</Badge>}
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Planer</Text>
          <TouchableOpacity accessibilityLabel="Termin anlegen" onPress={() => openManual()} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }}>
            <Plus size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 14 }}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={{ padding: 8 }}><ChevronLeft size={24} color="#6C5CE7" /></TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#F0EEF6' : '#1A1625' }}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={{ padding: 8 }}><ChevronRight size={24} color="#6C5CE7" /></TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
          {(['day', 'week', 'month'] as const).map((mode) => (
            <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: viewMode === mode ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.06)' : '#FFF' }}>
              <Text style={{ color: viewMode === mode ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 16 }}>
          {weekDays.map((day, i) => {
            const dayStr = toISODate(day);
            const isToday = dayStr === todayStr;
            const isSelected = selectedDay === i + 1;
            const count = allSessions.filter((s) => s.date === dayStr && !s.cancellation_reason).length;
            return (
              <TouchableOpacity key={dayStr} onPress={() => { setSelectedDay(i + 1); setViewMode('day'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: isSelected ? '#6C5CE7' : isToday ? (isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF') : 'transparent' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#FFF' : '#6E6A85', marginBottom: 4 }}>{WEEKDAYS[i]}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isSelected ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{day.getDate()}</Text>
                {count > 0 && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? '#FFF' : '#6C5CE7', marginTop: 4 }} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => triggerWithQuery('Plane mir diese Woche mit Fahrstunden und bereite die Termine gesammelt zur Bestätigung vor.')} disabled={autoPlanMutation.isPending}>
            <LinearGradient colors={['#6C5CE7', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: autoPlanMutation.isPending ? 0.7 : 1 }}>
              <Wand2 size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>{autoPlanMutation.isPending ? 'Wird geplant...' : 'Auto-Planen (Woche)'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => triggerWithQuery('Plane mir die kommenden Wochen. Bereite erst einen Vorschlag vor und buche nichts ohne meine Bestätigung.')} style={{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF' }}>
            <Calendar size={18} color="#6C5CE7" />
            <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', fontSize: 15 }}>Masterplanung 12 Wochen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => triggerWithQuery('Prüfe meine aktuelle Wochenplanung auf Lücken, Überschneidungen oder Schläfer.')}
            style={{
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF',
              borderWidth: 1,
              borderColor: '#6C5CE7',
            }}
          >
            <Sparkles size={18} color="#6C5CE7" />
            <Text style={{ color: '#6C5CE7', fontWeight: '700', fontSize: 15 }}>Planung prüfen (Agent)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {viewMode === 'day' && (
            <>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625', marginBottom: 12 }}>
                {selectedDate?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              {daySessions.length === 0 ? (
                <Card style={{ alignItems: 'center', paddingVertical: 32 }}><Calendar size={32} color="#C4C1D4" /><Text style={{ color: '#6E6A85', marginTop: 12, fontWeight: '500' }}>Keine Termine geplant</Text></Card>
              ) : daySessions.map(renderSession)}
            </>
          )}

          {viewMode === 'week' && weekDays.map((day) => {
            const dayStr = toISODate(day);
            const items = allSessions.filter((s) => s.date === dayStr && !s.cancellation_reason).sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <View key={dayStr} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#6E6A85', marginBottom: 8 }}>{day.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}</Text>
                {items.length ? items.map(renderSession) : <Card style={{ paddingVertical: 14 }}><Text style={{ color: '#6E6A85' }}>Frei</Text></Card>}
              </View>
            );
          })}

          {viewMode === 'month' && (
            <View style={{ gap: 8 }}>
              {monthDays.map((day) => {
                const dayStr = toISODate(day);
                const items = allSessions.filter((s) => s.date === dayStr && !s.cancellation_reason);
                return (
                  <TouchableOpacity key={dayStr} onPress={() => { setCurrentWeekStart(getMonday(day)); setSelectedDay(day.getDay() === 0 ? 1 : Math.min(day.getDay(), 6)); setViewMode('day'); }}>
                    <Card style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{day.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>
                      <Text style={{ color: items.length ? '#6C5CE7' : '#6E6A85', fontWeight: '700' }}>{items.length} Termine</Text>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showManual} onClose={() => { setShowManual(false); setEditingSession(null); }} title={editingSession ? 'Termin bearbeiten' : 'Termin anlegen'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#6E6A85', textTransform: 'uppercase' }}>Schüler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {activeStudents.map((s: Student) => (
              <TouchableOpacity key={s.id} onPress={() => setManual((prev) => ({ ...prev, studentId: s.id, stage: String(s.next_stage_day), duration: String(rules.pipeline.find((p) => p.day === s.next_stage_day)?.duration || Number(prev.duration) || 60) }))} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: manual.studentId === s.id ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
                <Text style={{ color: manual.studentId === s.id ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{s.first_name} {s.last_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SESSION_TYPES.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setManual((prev) => ({ ...prev, type: t.key }))} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: manual.type === t.key ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
                <Text style={{ color: manual.type === t.key ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', fontSize: 12 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={manual.date} onChangeText={(date) => setManual((prev) => ({ ...prev, date }))} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <Input value={manual.start} onChangeText={(start) => setManual((prev) => ({ ...prev, start }))} placeholder="HH:MM" style={{ width: 98 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={manual.duration} onChangeText={(duration) => setManual((prev) => ({ ...prev, duration }))} keyboardType="numeric" placeholder="Minuten" style={{ flex: 1 }} />
            <Input value={manual.stage} onChangeText={(stage) => setManual((prev) => ({ ...prev, stage }))} keyboardType="numeric" placeholder="Tag" editable={manual.type === 'driving'} style={{ width: 92, opacity: manual.type === 'driving' ? 1 : 0.5 }} />
          </View>
          <Input value={manual.notes} onChangeText={(notes) => setManual((prev) => ({ ...prev, notes }))} placeholder="Notiz oder Storno-Grund..." multiline numberOfLines={3} />

          <Button variant="outline" onPress={handleAiSuggestion} disabled={aiLoading}>
            <Sparkles size={16} color="#6C5CE7" />
            <Text style={{ color: '#6C5CE7', fontWeight: '700' }}>{aiLoading ? 'KI sucht...' : 'KI-Terminvorschlag'}</Text>
          </Button>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editingSession && (
              <Button variant="destructive" onPress={() => Alert.alert('Termin stornieren', 'Termin wirklich stornieren?', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Stornieren', style: 'destructive', onPress: () => saveSessionMutation.mutate({ ...editingSession, cancellation_reason: manual.notes || 'Storniert' }) }])} style={{ flex: 1 }}>
                <XCircle size={16} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '700' }}>Storno</Text>
              </Button>
            )}
            {editingSession && (
              <Button variant="outline" onPress={() => Alert.alert('Löschen', 'Termin endgültig löschen?', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Löschen', style: 'destructive', onPress: () => { deleteSession.mutate(editingSession.id); setShowManual(false); setEditingSession(null); } }])} style={{ flex: 1 }}>
                <Trash2 size={16} color="#EF4444" /><Text style={{ color: '#EF4444', fontWeight: '700' }}>Löschen</Text>
              </Button>
            )}
          </View>
          <Button onPress={handleManualSave}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>{editingSession ? 'Änderungen speichern' : 'Termin speichern'}</Text>
          </Button>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
