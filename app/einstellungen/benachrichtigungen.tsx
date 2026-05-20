// Benachrichtigungen – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import * as Haptics from 'expo-haptics';

export default function BenachrichtigungenSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [enabled, setEnabled] = useState(r.notifications_enabled !== false);
  const [lead, setLead] = useState(String(r.notification_lead_hours || 2));
  const [silentStart, setSilentStart] = useState(r.silent_hours_start || '22:00');
  const [silentEnd, setSilentEnd] = useState(r.silent_hours_end || '07:00');
  const [examCheck, setExamCheck] = useState(Boolean(r.proactive_exam_check_enabled));
  const [whatsapp, setWhatsapp] = useState(Boolean(r.proactive_whatsapp_drafts_enabled));

  useEffect(() => { if (rulesData) { setEnabled(rulesData.notifications_enabled !== false); setLead(String(rulesData.notification_lead_hours || 2)); setSilentStart(rulesData.silent_hours_start || '22:00'); setSilentEnd(rulesData.silent_hours_end || '07:00'); setExamCheck(Boolean(rulesData.proactive_exam_check_enabled)); setWhatsapp(Boolean(rulesData.proactive_whatsapp_drafts_enabled)); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, notifications_enabled: enabled, notification_lead_hours: Number(lead) || 2, silent_hours_start: silentStart, silent_hours_end: silentEnd, proactive_exam_check_enabled: examCheck, proactive_whatsapp_drafts_enabled: whatsapp }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Benachrichtigungen übernommen.'); },
  });

  return (
    <SettingsLayout title="Benachrichtigungen" subtitle="Push, Erinnerungen & Stille Stunden" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Allgemein">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Push-Benachrichtigungen" value={enabled} onValueChange={setEnabled} isDark={isDark} description="Erinnerungen an Termine & Prüfungen" />
          <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Vorlaufzeit (Stunden)</Text><Input value={lead} onChangeText={setLead} keyboardType="numeric" /></View>
        </Card>
      </SettingsSection>
      <SettingsSection title="Stille Stunden">
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 11 }}>Von</Text><Input value={silentStart} onChangeText={setSilentStart} placeholder="22:00" /></View>
            <View style={{ flex: 1, gap: 4 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 11 }}>Bis</Text><Input value={silentEnd} onChangeText={setSilentEnd} placeholder="07:00" /></View>
          </View>
          <Text style={{ color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Keine Push-Benachrichtigungen während der stillen Stunden.</Text>
        </Card>
      </SettingsSection>
      <SettingsSection title="Automatische Hinweise">
        <Card style={{ gap: 14 }}>
          <SettingsToggle label="Prüfungserinnerungen" value={examCheck} onValueChange={setExamCheck} isDark={isDark} />
          <SettingsToggle label="WhatsApp-Vorschläge" value={whatsapp} onValueChange={setWhatsapp} isDark={isDark} />
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
