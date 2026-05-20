// Führerscheinklassen – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import * as Haptics from 'expo-haptics';

const ALL_CLASSES = ['B', 'BE', 'A', 'A1', 'A2', 'AM', 'Mofa'];

export default function KlassenSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [classes, setClasses] = useState<string[]>(r.enabled_classes || ['B']);
  const [defaultCls, setDefaultCls] = useState(r.default_class || 'B');

  useEffect(() => { if (rulesData) { setClasses(rulesData.enabled_classes || ['B']); setDefaultCls(rulesData.default_class || 'B'); } }, [rulesData]);

  const toggle = (cls: string) => setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, enabled_classes: classes, default_class: defaultCls }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Klassen übernommen.'); },
  });

  return (
    <SettingsLayout title="Führerscheinklassen" subtitle="Verfügbare Klassen verwalten" onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Aktivierte Klassen">
        <Card style={{ gap: 14 }}>
          {ALL_CLASSES.map(cls => (
            <SettingsToggle key={cls} label={`Klasse ${cls}`} value={classes.includes(cls)} onValueChange={() => toggle(cls)} isDark={isDark} />
          ))}
        </Card>
      </SettingsSection>
      <SettingsSection title="Standardklasse">
        <Card style={{ gap: 8 }}>
          <Text style={{ color: '#6E6A85', fontSize: 12, marginBottom: 4 }}>Wird bei Neuanmeldungen vorausgewählt</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {classes.map(cls => (
              <TouchableOpacity key={cls} onPress={() => setDefaultCls(cls)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: defaultCls === cls ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
                <Text style={{ fontWeight: '800', color: defaultCls === cls ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625' }}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
