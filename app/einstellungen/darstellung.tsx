// Darstellung & Theme – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Palette, Sun, Moon, Type } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const THEMES = [
  { key: 'system', label: 'System', icon: '⚙️' },
  { key: 'light', label: 'Hell', icon: '☀️' },
  { key: 'dark', label: 'Dunkel', icon: '🌙' },
];
const FONT_SIZES = [
  { key: 'small', label: 'Klein' },
  { key: 'medium', label: 'Mittel' },
  { key: 'large', label: 'Groß' },
];

export default function DarstellungSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;
  const [theme, setTheme] = useState(rules.appearance_mode || 'system');
  const [fontSize, setFontSize] = useState(rules.font_size || 'medium');
  const [compact, setCompact] = useState(Boolean(rules.compact_mode));

  useEffect(() => { if (rulesData) { setTheme(rulesData.appearance_mode || 'system'); setFontSize(rulesData.font_size || 'medium'); setCompact(Boolean(rulesData.compact_mode)); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...rules, appearance_mode: theme as any, font_size: fontSize as any, compact_mode: compact }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Darstellung übernommen.'); },
  });

  const previewSize = fontSize === 'small' ? 13 : fontSize === 'large' ? 17 : 15;

  return (
    <SettingsLayout title="Darstellung" subtitle="Theme, Schriftgröße & Layout" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Theme-Modus">
        <Card style={{ gap: 8 }}>
          {THEMES.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTheme(t.key as 'system' | 'light' | 'dark')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: theme === t.key ? (isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF') : 'transparent' }}>
              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
              <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625', flex: 1 }}>{t.label}</Text>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme === t.key ? '#6C5CE7' : '#C4C1D4', backgroundColor: theme === t.key ? '#6C5CE7' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {theme === t.key && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />}
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      </SettingsSection>

      <SettingsSection title="Schriftgröße">
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FONT_SIZES.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFontSize(f.key as 'small' | 'medium' | 'large')} style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: fontSize === f.key ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', color: fontSize === f.key ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFE', marginTop: 4 }}>
            <Text style={{ color: '#6E6A85', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>VORSCHAU</Text>
            <Text style={{ fontSize: previewSize, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>Max Müller – Klasse B</Text>
            <Text style={{ fontSize: previewSize - 2, color: '#6E6A85', marginTop: 2 }}>Nächste Fahrt: Morgen, 14:00 Uhr</Text>
          </View>
        </Card>
      </SettingsSection>

      <SettingsSection title="Layout">
        <Card style={{ gap: 12 }}>
          <SettingsToggle label="Kompakter Modus" description="Weniger Abstände für mehr Inhalt" value={compact} onValueChange={setCompact} isDark={isDark} />
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
