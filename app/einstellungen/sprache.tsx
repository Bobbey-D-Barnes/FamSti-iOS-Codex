// Sprache & Region – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const LANGS = [{ key: 'de', label: 'Deutsch' }, { key: 'en', label: 'Englisch' }];
const DATE_FORMATS = [{ key: 'DD.MM.YYYY', label: 'DD.MM.YYYY' }, { key: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }, { key: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }];
const CURRENCIES = [{ key: 'EUR', label: 'Euro (€)' }, { key: 'CHF', label: 'Franken (CHF)' }];

function Chips({ items, active, onSelect, isDark }: { items: { key: string; label: string }[]; active: string; onSelect: (k: string) => void; isDark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {items.map(item => (
        <TouchableOpacity key={item.key} onPress={() => onSelect(item.key)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: active === item.key ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
          <Text style={{ fontWeight: '800', color: active === item.key ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SpracheSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [locale, setLocale] = useState(r.locale || 'de');
  const [dateFormat, setDateFormat] = useState(r.date_format || 'DD.MM.YYYY');
  const [currency, setCurrency] = useState(r.currency || 'EUR');

  useEffect(() => { if (rulesData) { setLocale(rulesData.locale || 'de'); setDateFormat(rulesData.date_format || 'DD.MM.YYYY'); setCurrency(rulesData.currency || 'EUR'); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, locale, date_format: dateFormat, currency }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Sprache & Region übernommen.'); },
  });

  return (
    <SettingsLayout title="Sprache & Region" subtitle="Sprache, Datum & Währung" onSave={() => save.mutate()} saving={save.isPending}>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', marginBottom: 16 }}>
        <Info size={18} color="#3B82F6" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Die App ist derzeit vollständig in Deutsch verfügbar.</Text>
      </View>
      <SettingsSection title="Sprache">
        <Card style={{ gap: 12 }}><Chips items={LANGS} active={locale} onSelect={setLocale} isDark={isDark} /></Card>
      </SettingsSection>
      <SettingsSection title="Datumsformat">
        <Card style={{ gap: 12 }}><Chips items={DATE_FORMATS} active={dateFormat} onSelect={setDateFormat} isDark={isDark} /></Card>
      </SettingsSection>
      <SettingsSection title="Währung">
        <Card style={{ gap: 12 }}><Chips items={CURRENCIES} active={currency} onSelect={setCurrency} isDark={isDark} /></Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
