// Prüfungen Screen – FamSti iOS
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, BookOpen, Car, ChevronRight, Check, Calendar } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { Card, Badge, ZoneBadge, LoadingSpinner } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function PruefungenScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: students, isLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const onRefresh = async () => { setRefreshing(true); await queryClient.invalidateQueries({ queryKey: ['students'] }); setRefreshing(false); };

  if (isLoading) return <LoadingSpinner />;

  const now = new Date();
  const examReady = students?.filter((s) => s.next_stage_day >= 17 && !s.practical_exam_at) || [];
  const upcoming = students?.filter((s) => (s.planned_theory_exam_at && new Date(s.planned_theory_exam_at) >= now) || (s.planned_practical_exam_at && new Date(s.planned_practical_exam_at) >= now)) || [];
  const passed = students?.filter((s) => s.practical_exam_at) || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Prüfungen</Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 }}>
          <Card style={{ flex: 1, alignItems: 'center', backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFF7ED' }}>
            <GraduationCap size={24} color="#F59E0B" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#FCD34D' : '#1A1625', marginTop: 8 }}>{examReady.length}</Text>
            <Text style={{ fontSize: 11, color: '#6E6A85', marginTop: 2 }}>Prüfungsreif</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }}>
            <Check size={24} color="#10B981" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#6EE7B7' : '#1A1625', marginTop: 8 }}>{passed.length}</Text>
            <Text style={{ fontSize: 11, color: '#6E6A85', marginTop: 2 }}>Bestanden</Text>
          </Card>
        </View>

        {/* Exam Ready List */}
        {examReady.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625', marginBottom: 10, paddingHorizontal: 4 }}>Prüfungsreife Schüler</Text>
            {examReady.map((s) => (
              <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => router.push(`/schueler/${s.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FFF7ED', justifyContent: 'center', alignItems: 'center' }}>
                  <GraduationCap size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625' }}>{s.first_name} {s.last_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}><ZoneBadge zone={s.zone} /><Text style={{ fontSize: 12, color: '#6E6A85' }}>Tag {s.next_stage_day}</Text></View>
                </View>
                <ChevronRight size={16} color="#C4C1D4" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Exams */}
        {upcoming.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625', marginBottom: 10, paddingHorizontal: 4 }}>Anstehende Termine</Text>
            {upcoming.map((s) => {
              const isTheory = s.planned_theory_exam_at && new Date(s.planned_theory_exam_at) >= now;
              const dateStr = isTheory ? s.planned_theory_exam_at! : s.planned_practical_exam_at!;
              return (
                <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => router.push(`/schueler/${s.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', justifyContent: 'center', alignItems: 'center' }}>
                    {isTheory ? <BookOpen size={18} color="#10B981" /> : <Car size={18} color="#10B981" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625' }}>{s.first_name} {s.last_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><Calendar size={12} color="#6E6A85" /><Text style={{ fontSize: 12, color: '#6E6A85' }}>{new Date(dateStr).toLocaleDateString('de-DE')} • {isTheory ? 'Theorie' : 'Praxis'}</Text></View>
                  </View>
                  <ChevronRight size={16} color="#C4C1D4" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Passed */}
        {passed.length > 0 && (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625', marginBottom: 10, paddingHorizontal: 4 }}>Bestanden ✓</Text>
            {passed.map((s) => (
              <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => router.push(`/schueler/${s.id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 20, backgroundColor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.05)', borderWidth: 0.5, borderColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.15)', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}><Check size={18} color="#10B981" strokeWidth={2.5} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625' }}>{s.first_name} {s.last_name}</Text>
                  <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>Bestanden am {s.practical_exam_at ? new Date(s.practical_exam_at).toLocaleDateString('de-DE') : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
