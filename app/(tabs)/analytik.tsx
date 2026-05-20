// Analytik Screen – FamSti iOS
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, LineChart, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react-native';
import { Card, COLORS, LoadingSpinner } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useBusinessStats } from '../../src/hooks/useBusinessStats';

export default function AnalytikScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { stats, isLoading } = useBusinessStats();

  if (isLoading) return <LoadingSpinner />;

  const avgStage = stats.activeStudents.length
    ? Math.round((stats.activeStudents.reduce((sum, s) => sum + s.next_stage_day, 0) / stats.activeStudents.length) * 10) / 10
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <Header title="Analytik" subtitle="Performance & Trends" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }}>
        <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
            <View><Text style={{ color: 'rgba(255,255,255,0.78)', fontWeight: '800' }}>Fahrschul-Score</Text><Text style={{ color: '#FFF', fontSize: 54, fontWeight: '900' }}>{stats.analyticsScore}</Text></View>
            <LineChart size={36} color="#FFF" />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>Aus Dokumentenlage, Bestätigungen, Prüfungsreife, Tagesauslastung und Stornoquote berechnet</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Kpi icon={<Users size={22} color={COLORS.primary} />} label="Aktiv" value={String(stats.activeStudents.length)} />
          <Kpi icon={<TrendingUp size={22} color={COLORS.accent} />} label="Ø Stufe" value={String(avgStage)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Kpi icon={<Clock size={22} color={COLORS.primaryLight} />} label="Fahrten" value={String(stats.confirmedSessions.length)} />
          <Kpi icon={<AlertTriangle size={22} color={COLORS.warning} />} label="Storno" value={`${stats.cancellationRate}%`} />
        </View>

        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Pipeline</Text>
        {[['Anfänger', stats.activeStudents.filter((s) => s.next_stage_day <= 5).length, COLORS.primary], ['Aufbau', stats.activeStudents.filter((s) => s.next_stage_day > 5 && s.next_stage_day < 17).length, COLORS.warning], ['Prüfungsnah', stats.examReady, COLORS.accent]].map(([label, value, color]) => (
          <Card key={String(label)} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800' }}>{label}</Text><Text style={{ color: String(color), fontWeight: '900' }}>{value}</Text></View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', overflow: 'hidden' }}><View style={{ height: '100%', width: `${stats.activeStudents.length ? (Number(value) / stats.activeStudents.length) * 100 : 0}%`, backgroundColor: String(color) }} /></View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const { isDark } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}><TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity><View><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{title}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{subtitle}</Text></View></View>;
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { isDark } = useAppTheme();
  return <Card style={{ flex: 1, alignItems: 'center' }}>{icon}<Text style={{ fontSize: 28, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900', marginTop: 8 }}>{value}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '800' }}>{label}</Text></Card>;
}
