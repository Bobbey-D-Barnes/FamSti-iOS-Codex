// Arbeitszeiten – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES, DEFAULT_WORK_WINDOW } from '../../src/constants';
import { WorkWindow } from '../../src/types';
import { Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function ArbeitszeitenSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;
  const [windows, setWindows] = useState<Record<number, WorkWindow>>({ ...rules.work_windows });

  useEffect(() => { if (rulesData) setWindows({ ...rulesData.work_windows }); }, [rulesData]);

  const update = (day: number, patch: Partial<WorkWindow>) => {
    setWindows(prev => ({ ...prev, [day]: { ...(prev[day] || DEFAULT_WORK_WINDOW), ...patch } }));
  };

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...rules, work_windows: windows }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Arbeitszeiten übernommen.'); },
  });

  return (
    <SettingsLayout title="Arbeitszeiten" subtitle="Zeitfenster Mo–Sa definieren" onSave={() => save.mutate()} saving={save.isPending}>
      {DAYS.map((day, i) => {
        const d = i + 1;
        const w = windows[d] || DEFAULT_WORK_WINDOW;
        return (
          <SettingsSection key={day} title={day}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 11 }}>Start</Text>
                  <Input value={w.startTime} onChangeText={v => update(d, { startTime: v })} placeholder="08:00" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 11 }}>Ende</Text>
                  <Input value={w.endTime} onChangeText={v => update(d, { endTime: v })} placeholder="18:00" />
                </View>
                <View style={{ width: 90, gap: 4 }}>
                  <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 11 }}>Max Min.</Text>
                  <Input value={String(w.maxMinutes)} onChangeText={v => update(d, { maxMinutes: Number(v) || 0 })} keyboardType="numeric" />
                </View>
              </View>
            </Card>
          </SettingsSection>
        );
      })}
    </SettingsLayout>
  );
}
