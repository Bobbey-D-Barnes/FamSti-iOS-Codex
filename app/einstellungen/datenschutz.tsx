// Datenschutz & Sicherheit – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input, Button } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Shield, Lock, Download, Upload, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function DatenschutzSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [lockEnabled, setLockEnabled] = useState(Boolean(r.app_lock_enabled));
  const [autoLogout, setAutoLogout] = useState(String(r.auto_logout_minutes || 30));

  useEffect(() => { if (rulesData) { setLockEnabled(Boolean(rulesData.app_lock_enabled)); setAutoLogout(String(rulesData.auto_logout_minutes || 30)); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, app_lock_enabled: lockEnabled, auto_logout_minutes: Number(autoLogout) || 30 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Datenschutzeinstellungen übernommen.'); },
  });

  return (
    <SettingsLayout title="Datenschutz" subtitle="Sicherheit, DSGVO & Export" onSave={() => save.mutate()} saving={save.isPending}>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#EAFCEF', marginBottom: 16 }}>
        <Shield size={18} color="#10B981" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Alle personenbezogenen Daten werden gemäß DSGVO ausschließlich lokal auf diesem Gerät gespeichert. Es findet keine Cloud-Synchronisierung statt.</Text>
      </View>
      <SettingsSection title="App-Schutz">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="App-Sperre (PIN/Biometrie)" value={lockEnabled} onValueChange={setLockEnabled} isDark={isDark} description="Erfordert Authentifizierung beim Öffnen" />
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Auto-Logout nach (Minuten)</Text><Input value={autoLogout} onChangeText={setAutoLogout} keyboardType="numeric" /></View>
        </Card>
      </SettingsSection>
      <SettingsSection title="Daten-Export">
        <Card style={{ gap: 10 }}>
          <Button variant="outline" onPress={() => Alert.alert('Daten-Export', 'Diese Funktion wird in einem zukünftigen Update verfügbar.')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Download size={16} color="#6C5CE7" /><Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Alle Daten als JSON exportieren</Text></View></Button>
          <Button variant="outline" onPress={() => Alert.alert('Daten-Import', 'Diese Funktion wird in einem zukünftigen Update verfügbar.')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Upload size={16} color="#6C5CE7" /><Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Daten importieren</Text></View></Button>
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
