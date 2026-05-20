// Fortbildung (§ 33a FahrlG) – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Award, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function FortbildungSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [days, setDays] = useState(String(r.instructor_fortbildung_days || 0));
  const [deadline, setDeadline] = useState(r.instructor_fortbildung_deadline || '2027-12-31');
  const [lastDate, setLastDate] = useState(r.instructor_last_fortbildung || '');

  useEffect(() => { if (rulesData) { setDays(String(rulesData.instructor_fortbildung_days || 0)); setDeadline(rulesData.instructor_fortbildung_deadline || '2027-12-31'); setLastDate(rulesData.instructor_last_fortbildung || ''); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, instructor_fortbildung_days: Number(days) || 0, instructor_fortbildung_deadline: deadline, instructor_last_fortbildung: lastDate }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Fortbildungsdaten übernommen.'); },
  });

  const daysNum = Number(days) || 0;
  const pct = Math.min(100, (daysNum / 3) * 100);
  const barColor = daysNum >= 3 ? '#10B981' : daysNum >= 1 ? '#F59E0B' : '#EF4444';

  return (
    <SettingsLayout title="Fortbildung" subtitle="§ 33a FahrlG – Fortbildungspflicht" onSave={() => save.mutate()} saving={save.isPending}>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', marginBottom: 16 }}>
        <Info size={18} color="#3B82F6" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Fahrlehrer müssen alle 4 Jahre mindestens 3 Tage (je 8 Stunden) Fortbildung nachweisen (§ 33a FahrlG).</Text>
      </View>
      <SettingsSection title="Fortschritt">
        <Card style={{ gap: 14 }}>
          <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800', fontSize: 18 }}>{daysNum} / 3 Tage</Text>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E8E6F0', overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: barColor }} />
          </View>
          <Text style={{ color: barColor, fontWeight: '700', fontSize: 12 }}>{daysNum >= 3 ? '✅ Pflicht erfüllt' : `⚠️ Noch ${3 - daysNum} Tag(e) erforderlich`}</Text>
        </Card>
      </SettingsSection>
      <SettingsSection title="Daten">
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Absolvierte Fortbildungstage</Text><Input value={days} onChangeText={setDays} keyboardType="numeric" /></View>
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Nächste Frist (YYYY-MM-DD)</Text><Input value={deadline} onChangeText={setDeadline} placeholder="2027-12-31" /></View>
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Letzte Fortbildung (YYYY-MM-DD)</Text><Input value={lastDate} onChangeText={setLastDate} placeholder="2024-06-15" /></View>
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
