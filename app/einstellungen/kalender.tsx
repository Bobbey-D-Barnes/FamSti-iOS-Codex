// Kalender & Sync – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Calendar, Download, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function KalenderSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [exportEnabled, setExportEnabled] = useState(Boolean(r.calendar_export_enabled));
  const [syncInterval, setSyncInterval] = useState(String(r.calendar_sync_interval_minutes || 30));
  const [holidays, setHolidays] = useState(r.calendar_holidays_enabled !== false);

  useEffect(() => { if (rulesData) { setExportEnabled(Boolean(rulesData.calendar_export_enabled)); setSyncInterval(String(rulesData.calendar_sync_interval_minutes || 30)); setHolidays(rulesData.calendar_holidays_enabled !== false); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, calendar_export_enabled: exportEnabled, calendar_sync_interval_minutes: Number(syncInterval) || 30, calendar_holidays_enabled: holidays }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Kalender-Einstellungen übernommen.'); },
  });

  return (
    <SettingsLayout title="Kalender & Sync" subtitle="ICS-Export, Feiertage & Sync" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Kalender-Export">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Kalender-Export aktivieren" value={exportEnabled} onValueChange={setExportEnabled} isDark={isDark} description="Termine als .ics-Datei bereitstellen" />
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Sync-Intervall (Minuten)</Text><Input value={syncInterval} onChangeText={setSyncInterval} keyboardType="numeric" /></View>
          <TouchableOpacity onPress={() => Alert.alert('ICS Export', 'Diese Funktion wird in einem zukünftigen Update verfügbar.')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <Download size={16} color="#6C5CE7" />
            <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', flex: 1 }}>Termine als .ics exportieren</Text>
          </TouchableOpacity>
        </Card>
      </SettingsSection>
      <SettingsSection title="Feiertage">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Feiertagskalender anzeigen" value={holidays} onValueChange={setHolidays} isDark={isDark} description="Deutsche Feiertage im Kalender markieren" />
        </Card>
      </SettingsSection>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', marginTop: 8 }}>
        <Info size={18} color="#3B82F6" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Der Kalender-Export erstellt eine ICS-Datei, die in Apple Kalender oder Google Kalender importiert werden kann.</Text>
      </View>
    </SettingsLayout>
  );
}
