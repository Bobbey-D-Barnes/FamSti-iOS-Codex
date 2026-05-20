// Dashboard Screen – FamSti iOS
// Ported from DashboardPage.tsx (PWA)

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Clock,
  Trophy,
  Calendar,
  Play,
  ChevronRight,
  Bell,
  Gift,
  FileWarning,
  Hourglass,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Car,
  CalendarRange,
  BookOpen,
  UserPlus,
  Settings,
  BarChart3,
  Wand2,
  Map,
  Euro,
  Search,
  FileText,
} from 'lucide-react-native';

import { db } from '../../src/lib/storage';
import { DEFAULT_RULES } from '../../src/constants';
import { Card, Badge, Button, LoadingSpinner, ZoneBadge } from '../../src/components/ui';
import { formatDate, getMonday, getGreeting, getPipelineProgress, toISODate } from '../../src/lib/utils';
import { geminiService } from '../../src/services/geminiService';
import { AgentInsightBanner } from '../../src/components/AgentInsightBanner';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const SHORTCUT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; bgLight: string; bgDark: string; path: string }
> = {
  new_student: { icon: <UserPlus size={24} color="#4F8AE6" />, label: 'Neu', bgLight: '#EFF6FF', bgDark: 'rgba(79,138,230,0.1)', path: '/schueler/neu' },
  plan: { icon: <Calendar size={24} color="#8B5CF6" />, label: 'Planer', bgLight: '#F5F3FF', bgDark: 'rgba(139,92,246,0.1)', path: '/planer' },
  schedule: { icon: <Car size={24} color="#10B981" />, label: 'Termine', bgLight: '#ECFDF5', bgDark: 'rgba(16,185,129,0.1)', path: '/termine' },
  students: { icon: <Users size={24} color="#4F8AE6" />, label: 'Schüler', bgLight: '#EFF6FF', bgDark: 'rgba(79,138,230,0.1)', path: '/schueler' },
  exams: { icon: <GraduationCap size={24} color="#F59E0B" />, label: 'Prüfung', bgLight: '#FFF7ED', bgDark: 'rgba(245,158,11,0.1)', path: '/pruefungen' },
  reminders: { icon: <Bell size={24} color="#F97316" />, label: 'Alerts', bgLight: '#FFF7ED', bgDark: 'rgba(249,115,22,0.1)', path: '/erinnerungen' },
  search: { icon: <Search size={24} color="#6C5CE7" />, label: 'Suche', bgLight: '#F5F3FF', bgDark: 'rgba(108,92,231,0.1)', path: '/suche' },
  stats: { icon: <BarChart3 size={24} color="#EC4899" />, label: 'Stats', bgLight: '#FDF2F8', bgDark: 'rgba(236,72,153,0.1)', path: '/pruefungen' },
  scan: { icon: <Search size={24} color="#F97316" />, label: 'Scan', bgLight: '#FFF7ED', bgDark: 'rgba(249,115,22,0.1)', path: '/schueler' },
  map: { icon: <Map size={24} color="#14B8A6" />, label: 'Karte', bgLight: '#ECFEFF', bgDark: 'rgba(20,184,166,0.1)', path: '/planer' },
  billing: { icon: <Euro size={24} color="#0D9488" />, label: 'Finanzen', bgLight: '#F0FDFA', bgDark: 'rgba(13,148,136,0.1)', path: '/schueler' },
  settings: { icon: <Settings size={24} color="#6B7280" />, label: 'Setup', bgLight: '#F3F4F6', bgDark: 'rgba(107,114,128,0.1)', path: '/einstellungen' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [insights, setInsights] = React.useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);

  const { data: students, isLoading: stLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const { data: reminders } = useQuery({ queryKey: ['reminders'], queryFn: db.getReminders });
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const { data: shortcuts } = useQuery({ queryKey: ['dashboardShortcuts'], queryFn: db.getDashboardShortcuts });

  const rules = rulesData || DEFAULT_RULES;
  const config = rules.dashboard_config || DEFAULT_RULES.dashboard_config;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  if (stLoading || sLoading) return <LoadingSpinner />;

  const loadInsights = async () => {
    setInsightsLoading(true);
    const result = await geminiService.getDashboardInsights(activeStudents);
    setInsights(result || 'Keine KI-Einblicke verfügbar. Prüfe den API-Key oder versuche es später erneut.');
    setInsightsLoading(false);
  };

  // --- Calculations (identical to PWA) ---
  const activeStudents = students?.filter((s) => !s.practical_exam_at) || [];
  const activeStudentsCount = activeStudents.length;
  const now = new Date();
  const todayStr = toISODate(now);

  const uncompletedReminders = reminders?.filter((r) => !r.is_completed) || [];

  // Weekly Hours
  const startOfWeek = getMonday(now);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const currentWeekSessions =
    sessions?.filter((s) => {
      const d = new Date(s.date);
      return d >= startOfWeek && d <= endOfWeek;
    }) || [];

  const weeklyMinutes = currentWeekSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

  // Exam Ready
  const examReadyCount = students?.filter((s) => s.next_stage_day >= 17 && !s.practical_exam_at).length || 0;

  // Next Session
  const sortedSessions =
    sessions?.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`);
      const dateB = new Date(`${b.date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    }) || [];

  const nextSession = sortedSessions.find((s) => {
    const sessionDate = new Date(`${s.date}T${s.end_time}`);
    return sessionDate > now;
  });

  const nextSessionStudent = nextSession ? students?.find((s) => s.id === nextSession.student_id) : null;

  // Today's Sessions
  const todaySessions =
    sessions
      ?.filter((s) => {
        if (s.cancellation_reason) return false;
        return s.date === todayStr;
      })
      .sort((a, b) => {
        const timeA = a.start_time.split(':').map(Number);
        const timeB = b.start_time.split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      }) || [];

  // Sleepers
  const sleepers = activeStudents.filter((s) => {
    const hasFutureSession = sortedSessions.some(
      (sess) => sess.student_id === s.id && sess.date >= todayStr
    );
    return !hasFutureSession;
  });

  // Missing Documents
  const missingDocsStudents = activeStudents.filter(
    (s) => !s.has_application_submitted || !s.has_first_aid || !s.has_picture || !s.has_vision_test
  );

  const upcomingExams = activeStudents.filter((s) => s.planned_theory_exam_at || s.planned_practical_exam_at).slice(0, 5);

  const upcomingBirthdays = activeStudents
    .filter((s) => s.birth_date)
    .map((s) => {
      const bDate = new Date(s.birth_date);
      const nextBirthday = new Date(now.getFullYear(), bDate.getMonth(), bDate.getDate());
      if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
      const days = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { student: s, days, date: nextBirthday };
    })
    .filter((item) => item.days <= 7)
    .sort((a, b) => a.days - b.days);

  const expiringApps = activeStudents
    .filter((s) => s.application_date)
    .map((s) => {
      const expiryDate = new Date(s.application_date);
      expiryDate.setDate(expiryDate.getDate() + (rules.application_expiration_days || 365));
      const days = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { student: s, days, expiryDate };
    })
    .filter((item) => item.days >= 0 && item.days <= (rules.application_warning_days || 90))
    .sort((a, b) => a.days - b.days);

  const expiringTheory = activeStudents
    .filter((s) => s.theory_passed_at && !s.practical_exam_at)
    .map((s) => {
      const expiryDate = new Date(s.theory_passed_at!);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const days = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { student: s, days, expiryDate };
    })
    .filter((item) => item.days >= 0 && item.days <= 60)
    .sort((a, b) => a.days - b.days);

  const newStudents = activeStudents
    .filter((s) => s.next_stage_day <= 3)
    .sort((a, b) => a.next_stage_day - b.next_stage_day)
    .slice(0, 5);

  const progressStudents = activeStudents
    .map((s) => ({ student: s, progress: getPipelineProgress(rules.pipeline, s.next_stage_day) }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const currentDateString = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
      >
        {/* Header / Greeting */}
        {config.show_greeting && (
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#6E6A85', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {currentDateString}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1, fontSize: 32, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>
                {getGreeting()}.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/suche' as any)}
                style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }}
              >
                <Search size={21} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <AgentInsightBanner />

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {activeStudents.length > 0 && (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(108,92,231,0.18)' : '#F0EDFF', justifyContent: 'center', alignItems: 'center' }}>
                  <Wand2 size={18} color="#6C5CE7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>KI-Einblicke</Text>
                  <Text style={{ fontSize: 12, color: '#6E6A85' }}>Action Items aus deiner Schülerliste</Text>
                </View>
                <Button size="sm" variant="outline" onPress={loadInsights} disabled={insightsLoading}>
                  {insightsLoading ? 'Lädt...' : insights ? 'Neu' : 'Start'}
                </Button>
              </View>
              {insights ? <Text style={{ fontSize: 13, lineHeight: 19, color: isDark ? '#D8D4E8' : '#3B354A' }}>{insights}</Text> : null}
            </Card>
          )}

          {/* ─── Next Session Hero Card ─── */}
          {config.show_next_session && nextSession && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/session/live');
              }}
            >
              <LinearGradient
                colors={['#6C5CE7', '#5B4BD4', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 20, overflow: 'hidden' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View>
                    <Badge style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 8 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Nächste Fahrt • Jetzt starten</Text>
                    </Badge>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF' }}>{nextSession.start_time}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Calendar size={13} color="rgba(255,255,255,0.7)" />
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {formatDate(nextSession.date)} • {nextSession.duration_minutes} min
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#FFFFFF',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }}
                  >
                    <Play size={24} color="#6C5CE7" fill="#6C5CE7" style={{ marginLeft: 3 }} />
                  </View>
                </View>

                {/* Student Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    borderRadius: 16,
                    padding: 12,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {nextSession.student_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{nextSession.student_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <ZoneBadge zone={nextSession.zone} />
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Tag {nextSession.stage_day}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ─── Stats Grid ─── */}
          {config.show_stats && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Card style={{ flex: 1, backgroundColor: isDark ? 'rgba(79, 138, 230, 0.1)' : '#EFF6FF', borderColor: isDark ? 'rgba(79, 138, 230, 0.2)' : '#DBEAFE' }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(79, 138, 230, 0.2)' : '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                  <Users size={16} color="#4F8AE6" />
                </View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#93C5FD' : '#1E3A5F' }}>{activeStudentsCount}</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#6E6A85', marginTop: 2 }}>Aktive Schüler</Text>
              </Card>

              <View style={{ flex: 1, gap: 12 }}>
                <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFF7ED', borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFEDD5' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFEDD5', justifyContent: 'center', alignItems: 'center' }}>
                    <Clock size={16} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FCD34D' : '#1A1625' }}>{weeklyHours}h</Text>
                    <Text style={{ fontSize: 10, color: '#6E6A85' }}>Wochenstunden</Text>
                  </View>
                </Card>

                <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' }}>
                    <Trophy size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#6EE7B7' : '#1A1625' }}>{examReadyCount}</Text>
                    <Text style={{ fontSize: 10, color: '#6E6A85' }}>Prüfungsreif</Text>
                  </View>
                </Card>
              </View>
            </View>
          )}

          {/* ─── Today's Sessions ─── */}
          {config.show_today_sessions && todaySessions.length > 0 && (
            <View>
              <SectionHeader icon={<CalendarRange size={16} color="#4F8AE6" />} title="Fahrten Heute" onMore={() => router.push('/planer')} />
              {todaySessions.slice(0, 3).map((session) => {
                const sStudent = students?.find((s) => s.id === session.student_id);
                if (!sStudent) return null;
                return (
                  <ListItem
                    key={session.id}
                    iconBg={isDark ? 'rgba(79, 138, 230, 0.2)' : '#DBEAFE'}
                    icon={<Clock size={18} color="#4F8AE6" />}
                    title={`${sStudent.first_name} ${sStudent.last_name}`}
                    subtitle={`${session.start_time} - ${session.end_time}`}
                    onPress={() => router.push('/planer')}
                    isDark={isDark}
                  />
                );
              })}
            </View>
          )}

          {/* ─── Open Tasks ─── */}
          {config.show_tasks !== false && uncompletedReminders.length > 0 && (
            <View>
              <SectionHeader icon={<Bell size={16} color="#F97316" />} title="Offene Aufgaben" onMore={() => router.push('/erinnerungen')} />
              {uncompletedReminders.slice(0, 3).map((r) => (
                <ListItem
                  key={r.id}
                  iconBg={isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFF7ED'}
                  icon={<Bell size={18} color="#F97316" />}
                  title={r.title}
                  subtitle={new Date(r.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  badge={new Date(r.due_date) < now ? 'Überfällig' : undefined}
                  onPress={() => router.push('/erinnerungen')}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {/* ─── Missing Documents ─── */}
          {config.show_missing_docs && missingDocsStudents.length > 0 && (
            <View>
              <SectionHeader icon={<FileWarning size={16} color="#F59E0B" />} title="Fehlende Unterlagen" />
              {missingDocsStudents.slice(0, 3).map((s) => (
                <ListItem
                  key={s.id}
                  iconBg={isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFF7ED'}
                  icon={<FileWarning size={18} color="#F59E0B" />}
                  title={`${s.first_name} ${s.last_name}`}
                  subtitle={[
                    !s.has_application_submitted && 'Antrag',
                    !s.has_first_aid && 'Erste Hilfe',
                    !s.has_picture && 'Passbild',
                    !s.has_vision_test && 'Sehtest',
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                  onPress={() => router.push(`/schueler/${s.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {config.show_upcoming_exams && upcomingExams.length > 0 && (
            <View>
              <SectionHeader icon={<GraduationCap size={16} color="#10B981" />} title="Anstehende Prüfungen" onMore={() => router.push('/pruefungen')} />
              {upcomingExams.slice(0, 3).map((s) => (
                <ListItem
                  key={s.id}
                  iconBg={isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5'}
                  icon={<GraduationCap size={18} color="#10B981" />}
                  title={`${s.first_name} ${s.last_name}`}
                  subtitle={`${s.planned_theory_exam_at ? `Theorie ${formatDate(s.planned_theory_exam_at)}` : ''}${s.planned_practical_exam_at ? ` Praxis ${formatDate(s.planned_practical_exam_at)}` : ''}`}
                  onPress={() => router.push(`/schueler/${s.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {config.show_birthdays && upcomingBirthdays.length > 0 && (
            <View>
              <SectionHeader icon={<Gift size={16} color="#8B5CF6" />} title="Anstehende Geburtstage" />
              {upcomingBirthdays.slice(0, 3).map(({ student, days }) => (
                <ListItem
                  key={student.id}
                  iconBg={isDark ? 'rgba(139,92,246,0.2)' : '#F5F3FF'}
                  icon={<Gift size={18} color="#8B5CF6" />}
                  title={`${student.first_name} ${student.last_name}`}
                  subtitle={days === 0 ? 'Heute Geburtstag' : `In ${days} Tagen`}
                  onPress={() => router.push(`/schueler/${student.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {config.show_expiring_apps && expiringApps.length > 0 && (
            <View>
              <SectionHeader icon={<FileWarning size={16} color="#EF4444" />} title="Ablaufende Anträge" />
              {expiringApps.slice(0, 3).map(({ student, days }) => (
                <ListItem
                  key={student.id}
                  iconBg={isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2'}
                  icon={<FileWarning size={18} color="#EF4444" />}
                  title={`${student.first_name} ${student.last_name}`}
                  subtitle={`${days} Tage bis Ablauf`}
                  badge={days <= 14 ? 'Dringend' : undefined}
                  onPress={() => router.push(`/schueler/${student.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {config.show_expiring_theory && expiringTheory.length > 0 && (
            <View>
              <SectionHeader icon={<AlertTriangle size={16} color="#EF4444" />} title="Ablaufende Theorie" />
              {expiringTheory.slice(0, 3).map(({ student, days }) => (
                <ListItem
                  key={student.id}
                  iconBg={isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2'}
                  icon={<BookOpen size={18} color="#EF4444" />}
                  title={`${student.first_name} ${student.last_name}`}
                  subtitle={`${days} Tage Theorie gültig`}
                  badge={days <= 14 ? 'Dringend' : undefined}
                  onPress={() => router.push(`/schueler/${student.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {/* ─── Sleepers ─── */}
          {config.show_sleepers && sleepers.length > 0 && (
            <View>
              <SectionHeader icon={<AlertTriangle size={16} color="#F97316" />} title={`Planung notwendig (${sleepers.length})`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12, paddingRight: 16 }}>
                  {sleepers.slice(0, 8).map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      activeOpacity={0.85}
                      onPress={() => router.push('/planer')}
                      style={{
                        width: 140,
                        padding: 14,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                        borderWidth: 0.5,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFF7ED',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#F97316' }}>
                            {student.first_name.charAt(0)}
                            {student.last_name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', fontSize: 12, color: isDark ? '#F0EEF6' : '#1A1625' }} numberOfLines={1}>
                            {student.first_name}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#6E6A85' }} numberOfLines={1}>
                            {student.last_name}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="#F97316" />
                        <Text style={{ fontSize: 10, color: '#F97316', fontWeight: '500' }}>Keine Termine</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ─── Quick Actions ─── */}
          {config.show_shortcuts && (
            <View>
              <SectionHeader title="Schnellzugriff" onMore={() => router.push('/einstellungen')} moreLabel="Konfigurieren" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-start' }}>
                {(shortcuts || ['new_student', 'plan', 'schedule', 'settings']).map((key) => {
                  const item = SHORTCUT_CONFIG[key];
                  if (!item) return null;
                  return (
                    <QuickAction
                      key={key}
                      icon={item.icon}
                      label={item.label}
                      bg={isDark ? item.bgDark : item.bgLight}
                      onPress={() => router.push(item.path as any)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {config.show_new_students && newStudents.length > 0 && (
            <View>
              <SectionHeader icon={<Sparkles size={16} color="#4F8AE6" />} title="Neue Schüler" onMore={() => router.push('/schueler')} />
              {newStudents.map((s) => (
                <ListItem
                  key={s.id}
                  iconBg={isDark ? 'rgba(79,138,230,0.2)' : '#EFF6FF'}
                  icon={<Users size={18} color="#4F8AE6" />}
                  title={`${s.first_name} ${s.last_name}`}
                  subtitle={`Tag ${s.next_stage_day} • ${s.zone}`}
                  onPress={() => router.push(`/schueler/${s.id}` as any)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {config.show_progress && progressStudents.length > 0 && (
            <View>
              <SectionHeader icon={<FileText size={16} color="#6C5CE7" />} title="Ausbildungsfortschritt" />
              {progressStudents.map(({ student, progress }) => (
                <Card key={student.id} onPress={() => router.push(`/schueler/${student.id}` as any)} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>{student.first_name} {student.last_name}</Text>
                    <Text style={{ fontWeight: '800', color: '#6C5CE7' }}>{progress}%</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(108,92,231,0.16)' : '#E9E5FF' }}>
                    <View style={{ width: `${progress}%` as any, height: 8, borderRadius: 4, backgroundColor: '#6C5CE7' }} />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helper Components ────────────────────────────────────

const SectionHeader = ({
  icon,
  title,
  onMore,
  moreLabel = 'Alle anzeigen',
}: {
  icon?: React.ReactNode;
  title: string;
  onMore?: () => void;
  moreLabel?: string;
}) => {
  const { isDark } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4, paddingHorizontal: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>{title}</Text>
      </View>
      {onMore && (
        <TouchableOpacity onPress={onMore} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6C5CE7' }}>{moreLabel}</Text>
          <ChevronRight size={14} color="#6C5CE7" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const ListItem = ({
  icon,
  iconBg,
  title,
  subtitle,
  badge,
  onPress,
  isDark,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
  isDark: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      marginBottom: 8,
      gap: 12,
    }}
  >
    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center' }}>
      {icon}
    </View>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '600', fontSize: 14, color: isDark ? '#F0EEF6' : '#1A1625' }} numberOfLines={1}>
          {title}
        </Text>
        {badge && (
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#1A1625', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: isDark ? '#F0EEF6' : '#FFFFFF', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <Clock size={12} color="#6E6A85" />
        <Text style={{ fontSize: 12, color: '#6E6A85' }}>{subtitle}</Text>
      </View>
    </View>
    <ChevronRight size={16} color="#C4C1D4" />
  </TouchableOpacity>
);

const QuickAction = ({
  icon,
  label,
  bg,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    style={{ alignItems: 'center', gap: 6, width: 72 }}
  >
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      }}
    >
      {icon}
    </View>
    <Text style={{ fontSize: 11, fontWeight: '500', color: '#6E6A85' }}>{label}</Text>
  </TouchableOpacity>
);
