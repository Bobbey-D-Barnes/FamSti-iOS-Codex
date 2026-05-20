// Agent-Verhalten – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input, Switch } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { agentMemoryStore } from '../../src/agent/memoryStore';
import { Bot, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const PERSONALITIES = [
  { key: 'friendly', label: 'Locker', desc: 'Freundlich & unterstützend' },
  { key: 'professional', label: 'Sachlich', desc: 'Klar & effizient' },
  { key: 'strict', label: 'Direkt', desc: 'Knapp & präzise' },
];
const EXEC_MODES = [
  { key: 'safe', label: 'Sicher', desc: 'Jede Änderung erfordert Bestätigung.' },
  { key: 'moderate', label: 'Moderat', desc: 'Wichtige Aktionen werden nachgefragt.' },
  { key: 'risk', label: 'Riskant', desc: 'Sofort ohne Nachfrage.' },
];

export default function AgentSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;

  const [personality, setPersonality] = useState(rules.agent_personality || 'friendly');
  const [execMode, setExecMode] = useState(rules.agent_execution_mode || 'safe');
  const [proactive, setProactive] = useState(Boolean(rules.proactive_agent_enabled));
  const [examCheck, setExamCheck] = useState(Boolean(rules.proactive_exam_check_enabled));
  const [whatsapp, setWhatsapp] = useState(Boolean(rules.proactive_whatsapp_drafts_enabled));
  const [vehicle, setVehicle] = useState(Boolean(rules.proactive_vehicle_alerts_enabled));
  const [sleeper, setSleeper] = useState(String(rules.proactive_sleeper_interval_days || 14));

  useEffect(() => {
    if (rulesData) {
      setPersonality(rulesData.agent_personality || 'friendly');
      setExecMode(rulesData.agent_execution_mode || 'safe');
      setProactive(Boolean(rulesData.proactive_agent_enabled));
      setExamCheck(Boolean(rulesData.proactive_exam_check_enabled));
      setWhatsapp(Boolean(rulesData.proactive_whatsapp_drafts_enabled));
      setVehicle(Boolean(rulesData.proactive_vehicle_alerts_enabled));
      setSleeper(String(rulesData.proactive_sleeper_interval_days || 14));
    }
  }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...rules, agent_personality: personality as any, agent_execution_mode: execMode as any, proactive_agent_enabled: proactive, proactive_exam_check_enabled: examCheck, proactive_whatsapp_drafts_enabled: whatsapp, proactive_vehicle_alerts_enabled: vehicle, proactive_sleeper_interval_days: Number(sleeper) || 14 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Agent-Einstellungen übernommen.'); },
  });

  const clearMemory = () => {
    Alert.alert('Agent-Lernprofil löschen', 'Gedächtnis und Lernprofil werden gelöscht. App-Daten bleiben erhalten.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await agentMemoryStore.clearLearningData(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gelöscht', 'Agent-Gedächtnis zurückgesetzt.'); } },
    ]);
  };

  return (
    <SettingsLayout title="Agent-Verhalten" subtitle="Persönlichkeit & Automatisierung" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Persönlichkeit">
        <Card style={{ gap: 12 }}>
          {PERSONALITIES.map(p => (
            <TouchableOpacity key={p.key} onPress={() => setPersonality(p.key as 'friendly' | 'professional' | 'strict')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: personality === p.key ? (isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF') : 'transparent' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: personality === p.key ? '#6C5CE7' : '#C4C1D4', backgroundColor: personality === p.key ? '#6C5CE7' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {personality === p.key && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>{p.label}</Text>
                <Text style={{ fontSize: 12, color: '#6E6A85' }}>{p.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      </SettingsSection>

      <SettingsSection title="Ausführungsmodus">
        <Card style={{ gap: 12 }}>
          {EXEC_MODES.map(m => (
            <TouchableOpacity key={m.key} onPress={() => setExecMode(m.key as 'safe' | 'moderate' | 'risk')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: execMode === m.key ? (isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF') : 'transparent' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: execMode === m.key ? '#6C5CE7' : '#C4C1D4', backgroundColor: execMode === m.key ? '#6C5CE7' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {execMode === m.key && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>{m.label}</Text>
                <Text style={{ fontSize: 12, color: '#6E6A85' }}>{m.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      </SettingsSection>

      <SettingsSection title="Proaktive Funktionen">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Proaktiver Copilot" value={proactive} onValueChange={setProactive} isDark={isDark} />
          <SettingsToggle label="Prüfungs-Checks" value={examCheck} onValueChange={setExamCheck} isDark={isDark} />
          <SettingsToggle label="WhatsApp-Entwürfe" value={whatsapp} onValueChange={setWhatsapp} isDark={isDark} />
          <SettingsToggle label="Fahrzeug-Warnungen" value={vehicle} onValueChange={setVehicle} isDark={isDark} />
          <View style={{ gap: 6 }}>
            <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Schläfer-Intervall (Tage)</Text>
            <Input value={sleeper} onChangeText={setSleeper} keyboardType="numeric" />
          </View>
        </Card>
      </SettingsSection>

      <SettingsSection title="Gefahrenzone">
        <TouchableOpacity onPress={clearMemory} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }}>
          <Trash2 size={16} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontWeight: '800' }}>Agent-Gedächtnis löschen</Text>
        </TouchableOpacity>
      </SettingsSection>
    </SettingsLayout>
  );
}
