// Schnellzugriff – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { ArrowUp, ArrowDown, Trash2, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SHORTCUTS = [
  { key: 'new_student', label: 'Neuer Schüler' }, { key: 'plan', label: 'Planer' }, { key: 'schedule', label: 'Termine' },
  { key: 'students', label: 'Schüler' }, { key: 'exams', label: 'Prüfungen' }, { key: 'reminders', label: 'Erinnerungen' },
  { key: 'stats', label: 'Statistik' }, { key: 'scan', label: 'Scan' }, { key: 'map', label: 'Karte' },
  { key: 'billing', label: 'Abrechnung' }, { key: 'settings', label: 'Einstellungen' },
];

export default function SchnellzugriffSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: shortcutData } = useQuery({ queryKey: ['dashboardShortcuts'], queryFn: db.getDashboardShortcuts });
  const [shortcuts, setShortcuts] = useState<string[]>(['new_student', 'plan', 'schedule', 'settings']);

  useEffect(() => { if (shortcutData) setShortcuts(shortcutData); }, [shortcutData]);

  const move = (i: number, dir: -1 | 1) => { const n = [...shortcuts]; const t = i + dir; if (t < 0 || t >= n.length) return; [n[i], n[t]] = [n[t], n[i]]; setShortcuts(n); };

  const save = useMutation({
    mutationFn: () => db.saveDashboardShortcuts(shortcuts),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboardShortcuts'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Schnellzugriff übernommen.'); },
  });

  const IB = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(108,92,231,0.09)', justifyContent: 'center', alignItems: 'center' }}>{children}</TouchableOpacity>
  );

  return (
    <SettingsLayout title="Schnellzugriff" subtitle="Dashboard-Shortcuts anpassen" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Aktive Shortcuts">
        <Card style={{ gap: 10 }}>
          {shortcuts.map((key, i) => (
            <View key={`${key}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#6C5CE7" />
              <Text style={{ flex: 1, color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{SHORTCUTS.find(s => s.key === key)?.label || key}</Text>
              <IB onPress={() => move(i, -1)}><ArrowUp size={15} color="#6C5CE7" /></IB>
              <IB onPress={() => move(i, 1)}><ArrowDown size={15} color="#6C5CE7" /></IB>
              <IB onPress={() => setShortcuts(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={15} color="#EF4444" /></IB>
            </View>
          ))}
        </Card>
      </SettingsSection>
      <SettingsSection title="Verfügbar">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SHORTCUTS.filter(s => !shortcuts.includes(s.key)).map(s => (
            <TouchableOpacity key={s.key} onPress={() => setShortcuts(prev => [...prev, s.key])} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
              <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>+ {s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SettingsSection>
    </SettingsLayout>
  );
}
