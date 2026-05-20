// Behörden Screen – FamSti iOS
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileWarning, ShieldAlert, CheckCircle2, Hourglass } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { Badge, Card, COLORS, LoadingSpinner } from '../../src/components/ui';

export default function BehoerdenScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { data: students, isLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });

  if (isLoading) return <LoadingSpinner />;

  const active = students?.filter((s) => !s.practical_exam_at) || [];
  const missing = active.filter((s) => !s.has_application_submitted || !s.has_first_aid || !s.has_picture || !s.has_vision_test);
  const waitingApproval = active.filter((s) => s.has_application_submitted && !s.application_approval_date);
  const expiring = active.filter((s) => {
    const start = new Date(s.application_expiry_date || s.application_approval_date || s.application_date);
    if (Number.isNaN(start.getTime())) return false;
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + 365);
    const days = (expiry.getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 90;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <Header title="Behörden" subtitle="Unterlagen & Fristen" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }}>
        <View style={{ backgroundColor: missing.length ? COLORS.danger : COLORS.accent, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
            <View><Badge variant="glass">Aktenstatus</Badge><Text style={{ color: '#FFF', fontSize: 44, fontWeight: '900', marginTop: 8 }}>{missing.length}</Text></View>
            <ShieldAlert size={36} color="#FFF" />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>{missing.length ? 'Schüler mit fehlenden Unterlagen' : 'Alle aktiven Akten vollständig'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Kpi icon={<Hourglass size={22} color={COLORS.warning} />} label="Genehmigung offen" value={String(waitingApproval.length)} />
          <Kpi icon={<FileWarning size={22} color={COLORS.danger} />} label="Läuft bald ab" value={String(expiring.length)} />
        </View>

        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Offene Unterlagen</Text>
        {missing.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 34 }}><CheckCircle2 size={28} color={COLORS.accent} /><Text style={{ color: COLORS.accent, fontWeight: '800', marginTop: 10 }}>Keine offenen Akten</Text></Card>
        ) : missing.map((s) => (
          <Card key={s.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900' }}>{s.first_name} {s.last_name}</Text>
              <Badge variant="warning">Offen</Badge>
            </View>
            <Text style={{ color: COLORS.text.sub }}>{[
              !s.has_picture && 'Foto',
              !s.has_vision_test && 'Sehtest',
              !s.has_first_aid && 'Erste Hilfe',
              !s.has_application_submitted && 'Antrag',
            ].filter(Boolean).join(' · ')}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const isDark = useColorScheme() === 'dark';
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}><TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity><View><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{title}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{subtitle}</Text></View></View>;
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const isDark = useColorScheme() === 'dark';
  return <Card style={{ flex: 1, alignItems: 'center' }}>{icon}<Text style={{ fontSize: 26, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900', marginTop: 8 }}>{value}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '800', textAlign: 'center' }}>{label}</Text></Card>;
}
