// Über die App – Settings Sub-Page
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SettingsLayout, SettingsSection, SettingsInfo } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { ChevronRight } from 'lucide-react-native';

const INFO_ROWS = [
  { label: 'App', value: 'FamSti' },
  { label: 'Version', value: '1.0.0' },
  { label: 'Build', value: '2026.05.20' },
  { label: 'Plattform', value: 'React Native / Expo' },
  { label: 'Entwickler', value: 'FamSti Team' },
];

const LEGAL_ROWS = ['Datenschutzerklärung', 'Nutzungsbedingungen', 'Lizenzen', 'Impressum'];

export default function UeberSettings() {
  const { isDark } = useAppTheme();

  return (
    <SettingsLayout title="Über die App" subtitle="Version, Lizenzen & Kontakt">
      <SettingsSection title="App-Informationen">
        <Card style={{ gap: 14 }}>
          {INFO_ROWS.map(r => (
            <SettingsInfo key={r.label} label={r.label} value={r.value} isDark={isDark} />
          ))}
        </Card>
      </SettingsSection>
      <SettingsSection title="Rechtliches">
        <Card style={{ gap: 0 }}>
          {LEGAL_ROWS.map((item, i) => (
            <TouchableOpacity key={item} onPress={() => Alert.alert(item, 'Wird in einem zukünftigen Update verfügbar.')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: i < LEGAL_ROWS.length - 1 ? 0.5 : 0, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{item}</Text>
              <ChevronRight size={16} color="#6E6A85" />
            </TouchableOpacity>
          ))}
        </Card>
      </SettingsSection>
      <View style={{ alignItems: 'center', paddingVertical: 30 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>FS</Text>
        </View>
        <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800', fontSize: 18 }}>FamSti</Text>
        <Text style={{ color: '#6E6A85', fontSize: 12, marginTop: 2 }}>© 2026 FamSti Team</Text>
      </View>
    </SettingsLayout>
  );
}
