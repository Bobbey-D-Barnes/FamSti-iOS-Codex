// Dashboard-Widgets – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { DashboardConfig } from '../../src/types';
import * as Haptics from 'expo-haptics';

const WIDGETS: { key: keyof DashboardConfig; label: string; desc: string }[] = [
  { key: 'show_greeting', label: 'Begrüßung', desc: 'Persönliche Begrüßung oben' },
  { key: 'show_next_session', label: 'Nächste Fahrt', desc: 'Nächster anstehender Termin' },
  { key: 'show_shortcuts', label: 'Schnellzugriff', desc: 'Shortcut-Leiste' },
  { key: 'show_stats', label: 'Statistiken', desc: 'Tages- und Wochenstatistiken' },
  { key: 'show_today_sessions', label: 'Fahrten heute', desc: 'Heutige Termine' },
  { key: 'show_birthdays', label: 'Geburtstage', desc: 'Anstehende Geburtstage' },
  { key: 'show_upcoming_exams', label: 'Prüfungen', desc: 'Bevorstehende Prüfungen' },
  { key: 'show_missing_docs', label: 'Fehlende Unterlagen', desc: 'Schüler mit fehlenden Dokumenten' },
  { key: 'show_expiring_apps', label: 'Ablaufende Anträge', desc: 'Bald ablaufende Führerscheinanträge' },
  { key: 'show_expiring_theory', label: 'Ablaufende Theorie', desc: 'Theorie-Bestehen verfällt' },
  { key: 'show_new_students', label: 'Neue Schüler', desc: 'Kürzlich angemeldete Schüler' },
  { key: 'show_progress', label: 'Fortschritt', desc: 'Ausbildungsfortschritt-Übersicht' },
  { key: 'show_sleepers', label: 'Schläfer', desc: 'Inaktive Schüler' },
];

export default function WidgetsSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;
  const [config, setConfig] = useState<DashboardConfig>({ ...rules.dashboard_config });

  useEffect(() => { if (rulesData) setConfig({ ...rulesData.dashboard_config }); }, [rulesData]);

  const toggle = (key: keyof DashboardConfig) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...rules, dashboard_config: config }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Widget-Einstellungen übernommen.'); },
  });

  const activeCount = WIDGETS.filter(w => Boolean(config[w.key])).length;

  return (
    <SettingsLayout title="Dashboard-Widgets" subtitle={`${activeCount} von ${WIDGETS.length} aktiv`} onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Widgets ein-/ausschalten">
        <Card style={{ gap: 14 }}>
          {WIDGETS.map(w => (
            <SettingsToggle key={w.key} label={w.label} description={w.desc} value={Boolean(config[w.key])} onValueChange={() => toggle(w.key)} isDark={isDark} />
          ))}
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
