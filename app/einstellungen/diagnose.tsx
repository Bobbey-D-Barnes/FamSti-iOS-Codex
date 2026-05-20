// Systemfehler & Diagnose – Settings Sub-Page
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { SystemError } from '../../src/types';
import { AlertTriangle, ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function DiagnoseSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: systemErrors = [] } = useQuery<SystemError[]>({ queryKey: ['systemErrors'], queryFn: db.syncSystemErrors });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unfixed = systemErrors.filter((e: any) => !e.fixed).length;

  const handleCopy = () => { if (systemErrors.length === 0) return; Clipboard.setString(JSON.stringify(systemErrors, null, 2)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Kopiert', 'Alle Systemfehler als JSON kopiert.'); };

  const handleClearAll = () => {
    Alert.alert('Protokoll löschen', 'Gesamtes Fehlerprotokoll löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await db.clearSystemErrors(); qc.invalidateQueries({ queryKey: ['systemErrors'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  return (
    <SettingsLayout title="Diagnose" subtitle={unfixed > 0 ? `${unfixed} offene Fehler` : 'Keine Fehler'}>
      <SettingsSection title="Fehlerprotokoll">
        <Card style={{ gap: 12 }}>
          {systemErrors.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(52,199,89,0.1)' : '#EAFCEF', justifyContent: 'center', alignItems: 'center' }}><Check size={22} color="#34C759" /></View>
              <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>Keine Systemfehler</Text>
              <Text style={{ color: '#6E6A85', fontSize: 12, textAlign: 'center' }}>Aktuell sind keine Fehler protokolliert.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {systemErrors.map((error: any) => {
                const expanded = expandedId === error.id;
                const dateStr = new Date(error.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <View key={error.id} style={{ borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', paddingBottom: 10 }}>
                    <TouchableOpacity onPress={() => setExpandedId(expanded ? null : error.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: '#6E6A85', fontSize: 11, fontWeight: '700' }}>{dateStr}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', fontSize: 13, flex: 1 }} numberOfLines={expanded ? undefined : 2}>{error.description}</Text>
                          {error.fixed && <View style={{ backgroundColor: isDark ? 'rgba(52,199,89,0.2)' : '#EAFCEF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Text style={{ color: '#34C759', fontSize: 10, fontWeight: '800' }}>BEHOBEN</Text></View>}
                        </View>
                      </View>
                      {expanded ? <ChevronUp size={16} color="#6E6A85" /> : <ChevronDown size={16} color="#6E6A85" />}
                    </TouchableOpacity>
                    {expanded && (
                      <View style={{ marginTop: 10, gap: 8, padding: 10, borderRadius: 10, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                        {error.userQueryText && <View style={{ gap: 2 }}><Text style={{ color: '#6E6A85', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Nutzer-Eingabe:</Text><Text style={{ color: isDark ? '#E2DFEC' : '#333', fontSize: 12 }}>{error.userQueryText}</Text></View>}
                        {error.agentResponseText && <View style={{ gap: 2 }}><Text style={{ color: '#6E6A85', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>KI-Antwort:</Text><Text style={{ color: isDark ? '#E2DFEC' : '#333', fontSize: 12 }}>{error.agentResponseText}</Text></View>}
                        <TouchableOpacity onPress={async () => { await db.deleteSystemError(error.id); qc.invalidateQueries({ queryKey: ['systemErrors'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2', marginTop: 4 }}>
                          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Fehler löschen</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity onPress={handleCopy} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#6C5CE7' }}><Copy size={15} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Kopieren</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleClearAll} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }}><Trash2 size={15} color="#EF4444" /><Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>Alle löschen</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
