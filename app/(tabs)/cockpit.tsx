// Cockpit Dashboard – FamSti iOS
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Banknote, Car, LineChart, ShieldAlert, Target, Briefcase, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { Card, Badge, LoadingSpinner, COLORS } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useBusinessStats } from '../../src/hooks/useBusinessStats';

const modules = [
  { route: '/finanzen', title: 'Finanzen', subtitle: 'Umsatz & Forderungen', color: COLORS.accent, icon: Banknote },
  { route: '/fahrzeug', title: 'Fahrzeug', subtitle: 'Zustand & Wartung', color: COLORS.warning, icon: Car },
  { route: '/analytik', title: 'Analytik', subtitle: 'Score & Trends', color: COLORS.primaryLight, icon: LineChart },
  { route: '/behoerden', title: 'Behörden', subtitle: 'Unterlagen & Fristen', color: COLORS.danger, icon: ShieldAlert },
  { route: '/marketing', title: 'Marketing', subtitle: 'Leads & Warteliste', color: '#EC4899', icon: Target },
  { route: '/compliance', title: 'Compliance', subtitle: 'Arbeitszeit & FahrlG', color: '#7C3AED', icon: Briefcase },
];

export default function CockpitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { stats, isLoading } = useBusinessStats();

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  const navigateTo = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Cockpit</Text>
          <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.text.sub, marginTop: 4 }}>Management & Control-Center</Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigateTo('/finanzen')}>
            <View style={{ backgroundColor: COLORS.accent, borderRadius: 20, padding: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    <Banknote size={24} color="#FFF" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>Finanzen</Text>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '600' }}>Umsatz-Übersicht</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFF' }}>{stats.revenue.toLocaleString('de-DE')} €</Text>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {modules.slice(1).map((mod) => {
              const Icon = mod.icon;
              const value =
                mod.title === 'Behörden'
                  ? stats.missingDocs
                  : mod.title === 'Compliance'
                    ? `${stats.drivingHoursToday}h`
                    : mod.title === 'Fahrzeug'
                      ? `${Math.round(stats.vehicleHealth)}%`
                      : mod.title === 'Analytik'
                        ? stats.analyticsScore
                        : stats.marketingLeads > 0
                          ? stats.marketingLeads
                          : 'keine';
              return (
                <TouchableOpacity key={mod.route} activeOpacity={0.9} onPress={() => navigateTo(mod.route)} style={{ width: '47%' }}>
                  <Card style={{ minHeight: 154, justifyContent: 'space-between' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${mod.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                      <Icon size={20} color={mod.color} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{mod.title}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.text.sub, marginTop: 3, fontWeight: '600' }}>{mod.subtitle}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: mod.color }}>{value}</Text>
                      <ChevronRight size={16} color={COLORS.text.sub} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={20} color={COLORS.accent} />
            <Text style={{ flex: 1, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '700' }}>Operativer Status stabil</Text>
            <Badge variant={stats.missingDocs > 0 ? 'warning' : 'success'}>{stats.missingDocs > 0 ? `${stats.missingDocs} offene Akten` : 'Konform'}</Badge>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
