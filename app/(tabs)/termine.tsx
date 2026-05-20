// Termine Screen – FamSti iOS (from SchedulePage.tsx)
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, SectionList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Calendar, Check, XCircle, Trash2, RotateCcw, Clock } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { Card, Badge, Button, Modal, ZoneBadge, LoadingSpinner } from '../../src/components/ui';
import { formatDate } from '../../src/lib/utils';
import { Session } from '../../src/types';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function TermineScreen() {
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Krankheit');
  const [activeTab, setActiveTab] = useState<'planned' | 'completed' | 'cancelled'>('planned');
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });

  const onRefresh = async () => { setRefreshing(true); await queryClient.invalidateQueries({ queryKey: ['sessions'] }); setRefreshing(false); };

  const confirmMutation = useMutation({
    mutationFn: (s: Session) => db.confirmSession(s),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); queryClient.invalidateQueries({ queryKey: ['students'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  });

  const saveSessionMutation = useMutation({
    mutationFn: (s: Session) => db.saveSession(s),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); queryClient.invalidateQueries({ queryKey: ['students'] }); setActiveSession(null); },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => db.deleteSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); setActiveSession(null); },
  });

  if (isLoading) return <LoadingSpinner />;

  const filtered = sessions?.filter((s) => {
    if (activeTab === 'planned') return !s.confirmed && !s.cancellation_reason;
    if (activeTab === 'completed') return s.confirmed;
    if (activeTab === 'cancelled') return !!s.cancellation_reason;
    return true;
  }) || [];

  const sorted = [...filtered].sort((a, b) => {
    const dA = new Date(a.date).getTime(); const dB = new Date(b.date).getTime();
    return activeTab === 'planned' ? dA - dB : dB - dA;
  });

  // Group by date
  const grouped: Record<string, Session[]> = {};
  sorted.forEach((s) => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s); });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
  const dates = Object.keys(grouped);

  const tabs: { key: typeof activeTab; label: string; count: number }[] = [
    { key: 'planned', label: 'Geplant', count: sessions?.filter((s) => !s.confirmed && !s.cancellation_reason).length || 0 },
    { key: 'completed', label: 'Erledigt', count: sessions?.filter((s) => s.confirmed).length || 0 },
    { key: 'cancelled', label: 'Storniert', count: sessions?.filter((s) => !!s.cancellation_reason).length || 0 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Termine</Text>
        </View>

        {/* Tab Bar */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0EEF6', borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                backgroundColor: activeTab === tab.key ? (isDark ? '#1F1B33' : '#FFFFFF') : 'transparent',
                shadowColor: activeTab === tab.key ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 }, shadowOpacity: activeTab === tab.key ? 0.05 : 0, shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab.key ? '#6C5CE7' : '#6E6A85' }}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sessions */}
        <View style={{ paddingHorizontal: 16 }}>
          {dates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.5 }}>
              <Calendar size={48} color="#6E6A85" />
              <Text style={{ color: '#6E6A85', marginTop: 12, fontWeight: '500' }}>Keine Termine in dieser Kategorie.</Text>
            </View>
          ) : (
            dates.map((date) => (
              <View key={date} style={{ marginBottom: 20 }}>
                {/* Date Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>{formatDate(date)}</Text>
                  <Text style={{ fontSize: 12, color: '#6E6A85' }}>{grouped[date].length} Termine</Text>
                </View>
                {/* Session Items */}
                {grouped[date].map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    activeOpacity={0.85}
                    onPress={() => { setCancellationReason(session.cancellation_reason || 'Krankheit'); setActiveSession(session); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 16,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                      borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      borderLeftWidth: 4,
                      borderLeftColor: session.cancellation_reason ? '#EF4444' : session.confirmed ? '#10B981' : '#6C5CE7',
                      opacity: session.cancellation_reason ? 0.6 : 1,
                      gap: 12,
                    }}
                  >
                    <View style={{ alignItems: 'center', minWidth: 50 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, color: isDark ? '#F0EEF6' : '#1A1625' }}>{session.start_time}</Text>
                      <Text style={{ fontSize: 11, color: '#6E6A85' }}>{session.duration_minutes}m</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625' }}>{session.student_name}</Text>
                        {session.cancellation_reason && <Badge variant="destructive"><Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>Storniert</Text></Badge>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <ZoneBadge zone={session.zone} />
                        <Text style={{ fontSize: 11, color: '#6E6A85' }}>Tag {session.stage_day}</Text>
                      </View>
                    </View>
                    {!session.confirmed && !session.cancellation_reason && (
                      <TouchableOpacity
                        onPress={(e) => { confirmMutation.mutate(session); }}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Check size={18} color="#10B981" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Session Management Modal */}
      <Modal visible={!!activeSession} onClose={() => setActiveSession(null)} title="Termin verwalten">
        {activeSession && (
          <View style={{ gap: 12 }}>
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F2F8' }}>
              <Text style={{ fontWeight: '700', fontSize: 17, color: isDark ? '#F0EEF6' : '#1A1625' }}>{activeSession.student_name}</Text>
              <Text style={{ fontSize: 13, color: '#6E6A85', marginTop: 2 }}>{formatDate(activeSession.date)} • {activeSession.start_time} – {activeSession.end_time}</Text>
              <Text style={{ fontSize: 12, color: '#6E6A85', marginTop: 2 }}>Tag {activeSession.stage_day} ({activeSession.duration_minutes} min)</Text>
            </View>

            {activeSession.cancellation_reason ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }}>
                  <XCircle size={16} color="#EF4444" />
                  <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 13 }}>Storniert: {activeSession.cancellation_reason}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button variant="outline" onPress={() => saveSessionMutation.mutate({ ...activeSession, cancellation_reason: null })} style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><RotateCcw size={14} color="#6C5CE7" /><Text style={{ color: '#6C5CE7', fontWeight: '600', fontSize: 13 }}>Wiederherstellen</Text></View>
                  </Button>
                  <Button variant="destructive" onPress={() => deleteSessionMutation.mutate(activeSession.id)} style={{ flex: 1, backgroundColor: '#EF4444', borderRadius: 12, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Trash2 size={14} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Löschen</Text></View>
                  </Button>
                </View>
              </View>
            ) : activeSession.confirmed ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#D1FAE5' }}>
                  <Check size={16} color="#10B981" />
                  <Text style={{ color: isDark ? '#6EE7B7' : '#065F46', fontSize: 13 }}>Fahrt abgeschlossen</Text>
                </View>
                <Button variant="outline" onPress={() => saveSessionMutation.mutate({ ...activeSession, confirmed: false })}>
                  <Text style={{ color: '#6C5CE7', fontWeight: '600' }}>Buchung aufheben (→ Geplant)</Text>
                </Button>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: isDark ? '#F0EEF6' : '#1A1625' }}>Stornieren (mit Grund)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Krankheit', 'Privat', 'Geschäftlich', 'Sonstige'].map((r) => (
                    <TouchableOpacity key={r} onPress={() => setCancellationReason(r)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: cancellationReason === r ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#FFF', borderWidth: 0.5, borderColor: cancellationReason === r ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                      <Text style={{ fontWeight: '600', color: cancellationReason === r ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => saveSessionMutation.mutate({ ...activeSession, cancellation_reason: cancellationReason })} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Stornieren</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSessionMutation.mutate(activeSession.id)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F2F8', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                    <Trash2 size={14} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '600' }}>Löschen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}
