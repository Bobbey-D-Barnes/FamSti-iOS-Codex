// Prüfungsvorbereitung – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const CHECKLIST = ['Sehtest vorhanden', 'Erste-Hilfe-Nachweis', 'Passbild abgegeben', 'Antrag genehmigt', 'Theorie bestanden', 'Alle Sonderfahrten absolviert'];

export default function PruefungSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [minPractice, setMinPractice] = useState(String(r.min_practice_hours_before_exam || 20));
  const [minTheory, setMinTheory] = useState(String(r.min_theory_lessons_before_exam || 14));

  useEffect(() => { if (rulesData) { setMinPractice(String(rulesData.min_practice_hours_before_exam || 20)); setMinTheory(String(rulesData.min_theory_lessons_before_exam || 14)); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, min_practice_hours_before_exam: Number(minPractice) || 20, min_theory_lessons_before_exam: Number(minTheory) || 14 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Prüfungseinstellungen übernommen.'); },
  });

  return (
    <SettingsLayout title="Prüfungsvorbereitung" subtitle="Mindestanforderungen vor der Prüfung" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Mindestanforderungen">
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Min. Übungsstunden vor Prüfung</Text><Input value={minPractice} onChangeText={setMinPractice} keyboardType="numeric" /></View>
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Min. Theoriestunden vor Prüfung</Text><Input value={minTheory} onChangeText={setMinTheory} keyboardType="numeric" /></View>
        </Card>
      </SettingsSection>
      <SettingsSection title="Prüfungs-Checkliste">
        <Card style={{ gap: 10 }}>
          <Text style={{ color: '#6E6A85', fontSize: 12, marginBottom: 4 }}>Folgende Punkte müssen vor der Prüfungszulassung erfüllt sein:</Text>
          {CHECKLIST.map(item => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#EAFCEF', justifyContent: 'center', alignItems: 'center' }}>
                <Check size={14} color="#10B981" />
              </View>
              <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '600', flex: 1 }}>{item}</Text>
            </View>
          ))}
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
