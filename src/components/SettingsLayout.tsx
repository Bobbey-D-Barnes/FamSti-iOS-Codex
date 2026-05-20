// Shared Settings Layout – FamSti iOS
// Provides a consistent layout for all settings sub-pages

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../hooks/useAppTheme';

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
}

export function SettingsLayout({ title, subtitle, children, onSave, saving }: SettingsLayoutProps) {
  const router = useRouter();
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={isDark ? '#F0EEF6' : '#1A1625'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: '#6E6A85', fontWeight: '600', marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {onSave && (
          <TouchableOpacity
            onPress={() => { if (!saving) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSave(); } }}
            disabled={saving}
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#6E6A85', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

export function SettingsToggle({ label, value, onValueChange, isDark, description }: { label: string; value: boolean; onValueChange: (v: boolean) => void; isDark: boolean; description?: string }) {
  const { Switch } = require('../components/ui');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700' }}>{label}</Text>
        {description && <Text style={{ color: '#6E6A85', fontSize: 11, marginTop: 2 }}>{description}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function SettingsInfo({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '700', flex: 1 }}>{label}</Text>
      <Text style={{ color: '#6E6A85', fontWeight: '600', fontSize: 14 }}>{value}</Text>
    </View>
  );
}
