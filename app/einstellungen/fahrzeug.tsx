// Fahrzeugverwaltung – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Car, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function FahrzeugSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [name, setName] = useState(r.vehicle_name || '');
  const [plate, setPlate] = useState(r.vehicle_plate || '');
  const [tuev, setTuev] = useState(r.vehicle_tuev_date || '');
  const [reminder, setReminder] = useState(r.vehicle_hu_reminder !== false);

  useEffect(() => { if (rulesData) { setName(rulesData.vehicle_name || ''); setPlate(rulesData.vehicle_plate || ''); setTuev(rulesData.vehicle_tuev_date || ''); setReminder(rulesData.vehicle_hu_reminder !== false); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, vehicle_name: name, vehicle_plate: plate, vehicle_tuev_date: tuev, vehicle_hu_reminder: reminder }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Fahrzeugdaten übernommen.'); },
  });

  // TÜV countdown
  let tuevDays: number | null = null;
  let tuevColor = '#10B981';
  if (tuev) {
    const diff = Math.ceil((new Date(tuev).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    tuevDays = diff;
    if (diff <= 30) tuevColor = '#EF4444';
    else if (diff <= 60) tuevColor = '#F59E0B';
  }

  const LI = ({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph?: string }) => (
    <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>{label}</Text><Input value={value} onChangeText={onChange} placeholder={ph} /></View>
  );

  return (
    <SettingsLayout title="Fahrzeug" subtitle="Fahrschulfahrzeug verwalten" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Fahrzeugdaten">
        <Card style={{ gap: 14 }}>
          <LI label="Fahrzeugbezeichnung" value={name} onChange={setName} ph="VW Golf 8 DSG" />
          <LI label="Kennzeichen" value={plate} onChange={setPlate} ph="RO-FS 123" />
        </Card>
      </SettingsSection>
      <SettingsSection title="TÜV / HU">
        <Card style={{ gap: 14 }}>
          <LI label="Nächste HU (YYYY-MM-DD)" value={tuev} onChange={setTuev} ph="2027-06-15" />
          <SettingsToggle label="HU-Erinnerung" description="Benachrichtigung 30 Tage vor Ablauf" value={reminder} onValueChange={setReminder} isDark={isDark} />
          {tuevDays !== null && (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFE' }}>
              <Text style={{ color: tuevColor, fontWeight: '800', fontSize: 16 }}>
                {tuevDays <= 0 ? '🔴 TÜV abgelaufen!' : tuevDays <= 30 ? `⚠️ TÜV in ${tuevDays} Tagen` : `✅ TÜV in ${tuevDays} Tagen`}
              </Text>
            </View>
          )}
        </Card>
      </SettingsSection>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', marginTop: 8 }}>
        <Info size={18} color="#3B82F6" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>TÜV-Erinnerungen werden 30 Tage vor Ablauf als Push-Benachrichtigung gesendet.</Text>
      </View>
    </SettingsLayout>
  );
}
