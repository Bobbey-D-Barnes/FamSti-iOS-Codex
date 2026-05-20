// Erinnerungen Screen – FamSti iOS
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Bell, Plus, Check, Trash2, Clock, Calendar, AlertCircle } from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/lib/storage';
import { Card, Button, Input, Modal, LoadingSpinner, Badge } from '../../src/components/ui';
import { Reminder, ReminderType } from '../../src/types';
import { NotificationService } from '../../src/lib/notifications';
import { toISODate } from '../../src/lib/utils';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const REMINDER_TYPES: { key: ReminderType; label: string }[] = [
  { key: 'driving_lesson', label: 'Fahrstunde' },
  { key: 'theory_exam', label: 'Theorie' },
  { key: 'practical_exam', label: 'Praxis' },
  { key: 'custom', label: 'Sonstiges' },
];

export default function ErinnerungenScreen() {
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(toISODate(new Date()));
  const [newTime, setNewTime] = useState('09:00');
  const [newType, setNewType] = useState<ReminderType>('custom');
  const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [refreshing, setRefreshing] = useState(false);

  const { data: reminders, isLoading } = useQuery({ queryKey: ['reminders'], queryFn: db.getReminders });

  useEffect(() => {
    NotificationService.requestPermission().then((granted) => setNotificationStatus(granted ? 'granted' : 'denied'));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
    setRefreshing(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (r: Reminder) => {
      await db.saveReminder(r);
      const scheduled = await NotificationService.scheduleReminder(r);
      return scheduled;
    },
    onSuccess: (scheduled) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!scheduled) setNotificationStatus('denied');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewDate(toISODate(new Date()));
    setNewTime('09:00');
    setNewType('custom');
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const due = new Date(`${newDate}T${newTime}:00`);
    if (Number.isNaN(due.getTime())) {
      Alert.alert('Datum prüfen', 'Bitte nutze Datum YYYY-MM-DD und Uhrzeit HH:MM.');
      return;
    }
    saveMutation.mutate({
      id: uuidv4(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      due_date: due.toISOString(),
      type: newType,
      is_completed: false,
      is_dismissed: false,
    });
    resetForm();
    setShowAdd(false);
  };

  const toggleComplete = (r: Reminder) => {
    db.saveReminder({ ...r, is_completed: !r.is_completed }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const sorted = [...(reminders || [])].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
  const now = new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Erinnerungen</Text>
          <TouchableOpacity accessibilityLabel="Neue Erinnerung" onPress={() => { setShowAdd(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }}>
            <Plus size={20} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: notificationStatus === 'granted' ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5') : (isDark ? 'rgba(245,158,11,0.1)' : '#FFF7ED') }}>
            {notificationStatus === 'granted' ? <Bell size={18} color="#10B981" /> : <AlertCircle size={18} color="#F59E0B" />}
            <Text style={{ flex: 1, color: notificationStatus === 'granted' ? '#10B981' : isDark ? '#F59E0B' : '#B45309', fontWeight: '700' }}>
              {notificationStatus === 'granted' ? 'Benachrichtigungen sind aktiv' : 'Benachrichtigungen sind nicht freigegeben'}
            </Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {sorted.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Bell size={36} color="#C4C1D4" /><Text style={{ color: '#6E6A85', marginTop: 12, fontWeight: '500' }}>Keine Erinnerungen</Text>
            </Card>
          ) : sorted.map((r) => {
            const isOverdue = !r.is_completed && new Date(r.due_date) < now;
            const dueDate = new Date(r.due_date);
            return (
              <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: r.is_completed ? 0.5 : 1 }}>
                <TouchableOpacity onPress={() => toggleComplete(r)} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: r.is_completed ? '#10B981' : '#6C5CE7', backgroundColor: r.is_completed ? '#10B981' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  {r.is_completed && <Check size={16} color="#FFF" strokeWidth={3} />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625', textDecorationLine: r.is_completed ? 'line-through' : 'none' }}>{r.title}</Text>
                    <Badge variant={r.type === 'custom' ? 'secondary' : r.type === 'practical_exam' ? 'destructive' : 'warning'}>
                      {REMINDER_TYPES.find((t) => t.key === r.type)?.label || r.type}
                    </Badge>
                  </View>
                  {r.description ? <Text style={{ fontSize: 12, color: '#6E6A85', marginTop: 2 }} numberOfLines={2}>{r.description}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} color={isOverdue ? '#EF4444' : '#6E6A85'} />
                      <Text style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#6E6A85', fontWeight: isOverdue ? '700' : '500' }}>
                        {dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color={isOverdue ? '#EF4444' : '#6E6A85'} />
                      <Text style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#6E6A85', fontWeight: isOverdue ? '700' : '500' }}>
                        {dueDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}{isOverdue ? ' · überfällig' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Löschen?', '', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteMutation.mutate(r.id) }])} style={{ padding: 8 }}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={showAdd} onClose={() => setShowAdd(false)} title="Neue Erinnerung">
        <View style={{ gap: 12 }}>
          <Input value={newTitle} onChangeText={setNewTitle} placeholder="Titel..." />
          <Input value={newDesc} onChangeText={setNewDesc} placeholder="Beschreibung (optional)..." multiline numberOfLines={3} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <Input value={newTime} onChangeText={setNewTime} placeholder="HH:MM" style={{ width: 104 }} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REMINDER_TYPES.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setNewType(t.key)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: newType === t.key ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
                <Text style={{ color: newType === t.key ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button onPress={handleAdd}><Text style={{ color: '#FFF', fontWeight: '700' }}>Speichern & planen</Text></Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
