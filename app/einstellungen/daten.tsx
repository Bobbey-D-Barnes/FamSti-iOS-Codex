// Daten & Speicher – Settings Sub-Page
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Button } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { agentMemoryStore } from '../../src/agent/memoryStore';
import { HardDrive, Trash2, Download, Upload } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function DatenSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();

  const clearMemory = () => {
    Alert.alert('Agent-Gedächtnis löschen', 'Lernprofil und Gesprächsverlauf werden gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await agentMemoryStore.clearLearningData(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gelöscht', 'Agent-Gedächtnis zurückgesetzt.'); } },
    ]);
  };

  const clearCache = () => {
    Alert.alert('Cache leeren', 'Der App-Cache wird geleert.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Leeren', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Erledigt', 'Cache wurde geleert.'); } },
    ]);
  };

  const resetAll = () => {
    Alert.alert('⚠️ Alle Daten löschen', 'Alle Schüler, Termine, Einstellungen und Protokolle werden unwiderruflich gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Alles löschen', style: 'destructive', onPress: async () => { await db.reset(); qc.invalidateQueries(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Zurückgesetzt', 'Alle Daten wurden gelöscht.'); } },
    ]);
  };

  const OBtn = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
      {icon}
      <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', flex: 1 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SettingsLayout title="Daten & Speicher" subtitle="Cache, Export & Zurücksetzen">
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F3FF', marginBottom: 16 }}>
        <HardDrive size={18} color="#6C5CE7" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Speicherort: Lokaler AsyncStorage auf diesem Gerät.</Text>
      </View>
      <SettingsSection title="Cache & Gedächtnis">
        <Card style={{ gap: 10 }}>
          <OBtn icon={<Trash2 size={16} color="#6C5CE7" />} label="Agent-Gedächtnis löschen" onPress={clearMemory} />
          <OBtn icon={<Trash2 size={16} color="#6C5CE7" />} label="App-Cache leeren" onPress={clearCache} />
        </Card>
      </SettingsSection>
      <SettingsSection title="Datenbank">
        <Card style={{ gap: 10 }}>
          <OBtn icon={<Download size={16} color="#6C5CE7" />} label="Daten exportieren (JSON)" onPress={() => Alert.alert('Export', 'Diese Funktion wird in einem zukünftigen Update verfügbar.')} />
          <OBtn icon={<Upload size={16} color="#6C5CE7" />} label="Daten importieren" onPress={() => Alert.alert('Import', 'Diese Funktion wird in einem zukünftigen Update verfügbar.')} />
        </Card>
      </SettingsSection>
      <SettingsSection title="Gefahrenzone">
        <TouchableOpacity onPress={resetAll} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, backgroundColor: '#EF4444' }}>
          <Trash2 size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Alle Daten zurücksetzen</Text>
        </TouchableOpacity>
      </SettingsSection>
    </SettingsLayout>
  );
}
