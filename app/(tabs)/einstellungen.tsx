// Einstellungen Hub Screen – FamSti iOS
// Clean category-based navigation to settings sub-pages

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Brain, Bot, Palette, LayoutDashboard, Zap, Clock,
  Settings, Route, Bell, Building2, Car, GraduationCap,
  Shield, Award, AlertTriangle, Globe, HardDrive, Calendar,
  Info, ChevronRight
} from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { SystemError } from '../../src/types';

interface SettingsItem {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: number;
  route: string;
}

export default function EinstellungenScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { data: systemErrors = [] } = useQuery<SystemError[]>({ queryKey: ['systemErrors'], queryFn: db.syncSystemErrors });

  const unfixedErrors = systemErrors.filter((e: any) => !e.fixed).length;

  const CATEGORIES: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'KI & AUTOMATION',
      items: [
        {
          key: 'provider',
          title: 'KI-Provider & Modell',
          subtitle: 'Gemini, OpenRouter, OpenAI, Ollama',
          icon: <Brain size={20} color="#6C5CE7" />,
          route: '/einstellungen/provider',
        },
        {
          key: 'agent',
          title: 'Agent-Verhalten',
          subtitle: 'Persönlichkeit, Ausführungsmodus',
          icon: <Bot size={20} color="#6C5CE7" />,
          route: '/einstellungen/agent',
        },
      ],
    },
    {
      title: 'DARSTELLUNG',
      items: [
        {
          key: 'darstellung',
          title: 'Theme & Darstellung',
          subtitle: 'Erscheinungsbild, Schriftgröße',
          icon: <Palette size={20} color="#F59E0B" />,
          route: '/einstellungen/darstellung',
        },
        {
          key: 'widgets',
          title: 'Dashboard-Widgets',
          subtitle: '13 Widgets konfigurieren',
          icon: <LayoutDashboard size={20} color="#F59E0B" />,
          route: '/einstellungen/widgets',
        },
        {
          key: 'schnellzugriff',
          title: 'Schnellzugriff',
          subtitle: 'Shortcuts anpassen',
          icon: <Zap size={20} color="#F59E0B" />,
          route: '/einstellungen/schnellzugriff',
        },
      ],
    },
    {
      title: 'PLANUNG & AUSBILDUNG',
      items: [
        {
          key: 'arbeitszeiten',
          title: 'Arbeitszeiten',
          subtitle: 'Zeitfenster Mo–Sa',
          icon: <Clock size={20} color="#10B981" />,
          route: '/einstellungen/arbeitszeiten',
        },
        {
          key: 'regeln',
          title: 'Planungsregeln',
          subtitle: 'Pausen, Joker, Antragsfristen',
          icon: <Settings size={20} color="#10B981" />,
          route: '/einstellungen/regeln',
        },
        {
          key: 'pipeline',
          title: 'Ausbildungs-Pipeline',
          subtitle: `Praxisstufen bearbeiten`,
          icon: <Route size={20} color="#10B981" />,
          route: '/einstellungen/pipeline',
        },
        {
          key: 'klassen',
          title: 'Führerscheinklassen',
          subtitle: 'Aktivierte Klassen & Standard',
          icon: <Car size={20} color="#10B981" />,
          route: '/einstellungen/klassen',
        },
        {
          key: 'pruefung',
          title: 'Prüfungsvorbereitung',
          subtitle: 'Mindestanforderungen',
          icon: <GraduationCap size={20} color="#10B981" />,
          route: '/einstellungen/pruefung',
        },
      ],
    },
    {
      title: 'FAHRSCHULE',
      items: [
        {
          key: 'profil',
          title: 'Fahrschulprofil',
          subtitle: 'Name, Anschrift, Kontakt',
          icon: <Building2 size={20} color="#3B82F6" />,
          route: '/einstellungen/profil',
        },
        {
          key: 'fortbildung',
          title: 'Fortbildung (§ 33a)',
          subtitle: 'Fortbildungstage & Fristen',
          icon: <Award size={20} color="#3B82F6" />,
          route: '/einstellungen/fortbildung',
        },
        {
          key: 'fahrzeug',
          title: 'Fahrzeugverwaltung',
          subtitle: 'Fahrzeug, Kennzeichen, TÜV',
          icon: <Car size={20} color="#3B82F6" />,
          route: '/einstellungen/fahrzeug',
        },
      ],
    },
    {
      title: 'BENACHRICHTIGUNGEN & KALENDER',
      items: [
        {
          key: 'benachrichtigungen',
          title: 'Benachrichtigungen',
          subtitle: 'Push, Stille Stunden',
          icon: <Bell size={20} color="#EC4899" />,
          route: '/einstellungen/benachrichtigungen',
        },
        {
          key: 'kalender',
          title: 'Kalender & Sync',
          subtitle: 'ICS-Export, Feiertage',
          icon: <Calendar size={20} color="#EC4899" />,
          route: '/einstellungen/kalender',
        },
      ],
    },
    {
      title: 'DATENSCHUTZ & SYSTEM',
      items: [
        {
          key: 'datenschutz',
          title: 'Datenschutz & Sicherheit',
          subtitle: 'App-Sperre, DSGVO, Export',
          icon: <Shield size={20} color="#EF4444" />,
          route: '/einstellungen/datenschutz',
        },
        {
          key: 'sprache',
          title: 'Sprache & Region',
          subtitle: 'Sprache, Datum, Währung',
          icon: <Globe size={20} color="#EF4444" />,
          route: '/einstellungen/sprache',
        },
        {
          key: 'daten',
          title: 'Daten & Speicher',
          subtitle: 'Cache, Export, Zurücksetzen',
          icon: <HardDrive size={20} color="#EF4444" />,
          route: '/einstellungen/daten',
        },
        {
          key: 'diagnose',
          title: 'Systemfehler & Diagnose',
          subtitle: 'Fehlerprotokoll',
          icon: <AlertTriangle size={20} color="#EF4444" />,
          badge: unfixedErrors > 0 ? unfixedErrors : undefined,
          route: '/einstellungen/diagnose',
        },
        {
          key: 'ueber',
          title: 'Über die App',
          subtitle: 'Version, Lizenzen, Kontakt',
          icon: <Info size={20} color="#6E6A85" />,
          route: '/einstellungen/ueber',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Einstellungen</Text>
          <Text style={{ fontSize: 13, color: '#6E6A85', fontWeight: '600', marginTop: 4 }}>FamSti · 20 Kategorien</Text>
        </View>

        {CATEGORIES.map((category) => (
          <View key={category.title} style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E6A85', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 4 }}>
              {category.title}
            </Text>
            <View style={{
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              overflow: 'hidden',
              ...(isDark ? {} : { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }),
            }}>
              {category.items.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as any);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    gap: 14,
                    borderBottomWidth: index < category.items.length - 1 ? 0.5 : 0,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F3FF',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {item.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6E6A85', fontWeight: '500', marginTop: 1 }}>
                      {item.subtitle}
                    </Text>
                  </View>
                  {item.badge && (
                    <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginRight: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{item.badge}</Text>
                    </View>
                  )}
                  <ChevronRight size={18} color="#6E6A85" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
