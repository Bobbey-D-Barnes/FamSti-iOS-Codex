// Planungsregeln – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import * as Haptics from 'expo-haptics';

export default function RegelnSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [gap, setGap] = useState(String(r.gap_minutes));
  const [night, setNight] = useState(r.night_earliest_start);
  const [jokerMin, setJokerMin] = useState(String(r.day11_overtime_minutes));
  const [appExp, setAppExp] = useState(String(r.application_expiration_days));
  const [appWarn, setAppWarn] = useState(String(r.application_warning_days));
  const [useJoker, setUseJoker] = useState(r.use_day11_joker_if_needed);
  const [satExtend, setSatExtend] = useState(r.saturday_extend_allowed);

  useEffect(() => { if (rulesData) { setGap(String(rulesData.gap_minutes)); setNight(rulesData.night_earliest_start); setJokerMin(String(rulesData.day11_overtime_minutes)); setAppExp(String(rulesData.application_expiration_days)); setAppWarn(String(rulesData.application_warning_days)); setUseJoker(rulesData.use_day11_joker_if_needed); setSatExtend(rulesData.saturday_extend_allowed); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, gap_minutes: Number(gap) || 0, night_earliest_start: night, day11_overtime_minutes: Number(jokerMin) || 0, application_expiration_days: Number(appExp) || 365, application_warning_days: Number(appWarn) || 90, use_day11_joker_if_needed: useJoker, saturday_extend_allowed: satExtend }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Regeln übernommen.'); },
  });

  const LI = ({ label, value, onChange, kb }: { label: string; value: string; onChange: (v: string) => void; kb?: 'numeric' }) => (
    <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>{label}</Text><Input value={value} onChangeText={onChange} keyboardType={kb} /></View>
  );

  return (
    <SettingsLayout title="Planungsregeln" subtitle="Pausen, Fristen & Sonderregeln" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Zeitregeln">
        <Card style={{ gap: 14 }}>
          <LI label="Pausenzeit zwischen Fahrten (Min.)" value={gap} onChange={setGap} kb="numeric" />
          <LI label="Nachtfahrt frühestens" value={night} onChange={setNight} />
        </Card>
      </SettingsSection>
      <SettingsSection title="Tag 11 Joker">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Tag 11 Joker erlauben" value={useJoker} onValueChange={setUseJoker} isDark={isDark} description="Ermöglicht eine verlängerte Sitzung an Tag 11" />
          <LI label="Joker Überschreitungs-Minuten" value={jokerMin} onChange={setJokerMin} kb="numeric" />
        </Card>
      </SettingsSection>
      <SettingsSection title="Antragsfristen">
        <Card style={{ gap: 14 }}>
          <LI label="Antrag gültig (Tage)" value={appExp} onChange={setAppExp} kb="numeric" />
          <LI label="Antrag Warnung ab (Tage vor Ablauf)" value={appWarn} onChange={setAppWarn} kb="numeric" />
        </Card>
      </SettingsSection>
      <SettingsSection title="Sonstiges">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Samstag verlängern" value={satExtend} onValueChange={setSatExtend} isDark={isDark} description="Erlaubt erweiterte Arbeitszeiten am Samstag" />
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
