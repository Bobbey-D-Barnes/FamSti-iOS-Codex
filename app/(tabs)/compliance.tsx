// Compliance Screen – FamSti iOS
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, ChevronLeft, Clock, FileCheck, GraduationCap, Scale, ShieldCheck, AlertTriangle, ListFilter, Trash2 } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { Badge, Card, COLORS, LoadingSpinner } from '../../src/components/ui';
import { toISODate } from '../../src/lib/utils';
import { Session, Rules, ComplianceEvent } from '../../src/types';

interface WorkViolation {
  type: 'driving_time' | 'working_time' | 'pause' | 'rest_period';
  date: string;
  description: string;
}

const getViolations = (sessions: Session[]): WorkViolation[] => {
  const violations: WorkViolation[] = [];
  
  // Group sessions by date
  const sessionsByDate: Record<string, Session[]> = {};
  sessions.forEach(s => {
    if (s.cancellation_reason) return;
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  });
  
  const sortedDates = Object.keys(sessionsByDate).sort();
  
  sortedDates.forEach((date, index) => {
    const daySessions = [...sessionsByDate[date]].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    // 1. Tägliche Lenkzeit (driving sessions only)
    const drivingMinutes = daySessions
      .filter(s => s.type === 'driving' || !s.type)
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    
    if (drivingMinutes > 495) {
      violations.push({
        type: 'driving_time',
        date,
        description: `Tägliche Lenkzeit überschritten: ${drivingMinutes} Min. (${(drivingMinutes/45).toFixed(1)} Fahrstunden). Gesetzliches Limit: 495 Min. (§ 12 FahrlG)`
      });
    }
    
    // 2. Tägliche Arbeitszeit (all sessions)
    const totalWorkingMinutes = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    if (totalWorkingMinutes > 600) {
      violations.push({
        type: 'working_time',
        date,
        description: `Gesamtarbeitszeit überschritten: ${(totalWorkingMinutes / 60).toFixed(1)} Std. Gesetzliches Limit: 10 Std. (§ 3 ArbZG)`
      });
    }
    
    // 3. Pflichtpausen (continuous work > 6h without >= 30 min break)
    if (daySessions.length > 1) {
      let blockStartTime = daySessions[0].start_time;
      let blockEndTime = daySessions[0].end_time;
      let blockDuration = daySessions[0].duration_minutes;
      
      for (let i = 1; i < daySessions.length; i++) {
        const prevSession = daySessions[i - 1];
        const currSession = daySessions[i];
        
        const [prevH, prevM] = prevSession.end_time.split(':').map(Number);
        const [currH, currM] = currSession.start_time.split(':').map(Number);
        const gapMinutes = (currH * 60 + currM) - (prevH * 60 + prevM);
        
        if (gapMinutes < 30) {
          blockEndTime = currSession.end_time;
          blockDuration += gapMinutes + currSession.duration_minutes;
        } else {
          if (blockDuration > 360) {
            violations.push({
              type: 'pause',
              date,
              description: `Pausenpflicht verletzt: ${blockDuration} Min. Arbeit am Stück (${blockStartTime}-${blockEndTime}) ohne 30-minütige Pause (§ 4 ArbZG)`
            });
          }
          blockStartTime = currSession.start_time;
          blockEndTime = currSession.end_time;
          blockDuration = currSession.duration_minutes;
        }
      }
      if (blockDuration > 360) {
        violations.push({
          type: 'pause',
          date,
          description: `Pausenpflicht verletzt: ${blockDuration} Min. Arbeit am Stück (${blockStartTime}-${blockEndTime}) ohne 30-minütige Pause (§ 4 ArbZG)`
        });
      }
    }
    
    // 4. Ruhezeiten (11 hours between consecutive work days)
    if (index > 0) {
      const prevDate = sortedDates[index - 1];
      const prevDaySessions = [...sessionsByDate[prevDate]].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const lastSessionPrevDay = prevDaySessions[prevDaySessions.length - 1];
      const firstSessionCurrDay = daySessions[0];
      
      const prevEnd = lastSessionPrevDay.end_time;
      const currStart = firstSessionCurrDay.start_time;
      
      const prevDateObj = new Date(`${prevDate}T${prevEnd}:00`);
      const currDateObj = new Date(`${date}T${currStart}:00`);
      
      const diffMs = currDateObj.getTime() - prevDateObj.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 11) {
        violations.push({
          type: 'rest_period',
          date,
          description: `Ruhezeit verletzt: Nur ${diffHours.toFixed(1)} Std. Ruhe zwischen ${prevDate} ${prevEnd} und ${date} ${currStart}. Gesetzliche Ruhezeit: 11 Std. (§ 5 ArbZG)`
        });
      }
    }
  });
  
  return violations;
};

export default function ComplianceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDark = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');

  const { data: sessions, isLoading: sessionsLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const { data: rules, isLoading: rulesLoading } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const { data: complianceLogs, isLoading: logsLoading } = useQuery({ queryKey: ['complianceLogs'], queryFn: db.getComplianceLogs });

  if (sessionsLoading || rulesLoading || logsLoading) return <LoadingSpinner />;

  const violations = sessions ? getViolations(sessions) : [];
  const compliant = violations.length === 0;

  const today = toISODate(new Date());
  const todaySessions = (sessions || []).filter((s) => s.date === today && !s.cancellation_reason);
  const dailyDrivingMinutes = todaySessions.filter(s => s.type === 'driving' || !s.type).reduce((sum, s) => sum + s.duration_minutes, 0);
  const dailyDrivingHours = Math.round((dailyDrivingMinutes / 60) * 10) / 10;
  const dailyWorkMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const dailyWorkHours = Math.round((dailyWorkMinutes / 60) * 10) / 10;

  const fortbildungDays = rules?.instructor_fortbildung_days ?? 1;
  const fortbildungDeadline = rules?.instructor_fortbildung_deadline ?? '31.12.2027';

  const clearLogs = async () => {
    await db.clearComplianceLogs();
    queryClient.invalidateQueries({ queryKey: ['complianceLogs'] });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <Header title="Compliance" subtitle="Rechtliche Vorgaben" onBack={() => router.back()} />
      
      {/* Tab Switcher */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB', borderRadius: 14, padding: 4 }}>
          <TouchableOpacity onPress={() => setActiveTab('overview')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: activeTab === 'overview' ? (isDark ? COLORS.card.dark : '#FFF') : 'transparent' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: activeTab === 'overview' ? (isDark ? '#FFF' : '#000') : COLORS.text.sub }}>Gesetzliche Übersicht</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('audit')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: activeTab === 'audit' ? (isDark ? COLORS.card.dark : '#FFF') : 'transparent' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: activeTab === 'audit' ? (isDark ? '#FFF' : '#000') : COLORS.text.sub }}>Änderungsprotokoll</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }}>
        {activeTab === 'overview' ? (
          <>
            <View style={{ backgroundColor: compliant ? COLORS.accent : COLORS.danger, borderRadius: 28, padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
                <View>
                  <Badge variant="glass">Gesetzlicher Status</Badge>
                  <Text style={{ fontSize: 40, fontWeight: '900', color: '#FFF', marginTop: 8 }}>
                    {compliant ? 'Konform' : 'Prüfen'}
                  </Text>
                </View>
                <ShieldCheck size={36} color="#FFF" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.86)', fontWeight: '700' }}>
                {compliant 
                  ? 'Keine gesetzlichen Verstöße (ArbZG / FahrlG) in Ihren geplanten Fahrstunden erkannt.' 
                  : `Achtung: Es wurden ${violations.length} gesetzliche Richtlinienverletzung(en) festgestellt.`}
              </Text>
            </View>

            {/* List of active violations */}
            {violations.length > 0 && (
              <Card style={{ gap: 12, borderLeftWidth: 4, borderLeftColor: COLORS.danger }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <AlertTriangle size={20} color={COLORS.danger} />
                  <Text style={{ fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Aktive Richtlinienverstöße</Text>
                </View>
                {violations.map((v, i) => (
                  <View key={i} style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,75,75,0.06)' : 'rgba(239,68,68,0.05)', gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.danger }}>{v.date}</Text>
                      <Badge variant="outline" style={{ borderColor: COLORS.danger }}><Text style={{ color: COLORS.danger, fontSize: 10 }}>{v.type}</Text></Badge>
                    </View>
                    <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 18 }}>{v.description}</Text>
                  </View>
                ))}
              </Card>
            )}

            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Scale size={22} color={COLORS.primaryLight} />
                  <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900' }}>§ 33a FahrlG Fortbildung</Text>
                </View>
                <Badge variant="outline">{fortbildungDays} / 3 Tage</Badge>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[1, 2, 3].map((day) => (
                  <View key={day} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: day <= fortbildungDays ? COLORS.primaryLight : isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <GraduationCap size={18} color={COLORS.primaryLight} />
                <Text style={{ color: COLORS.text.sub, flex: 1 }}>Frist für aktuellen 4-Jahres-Turnus: {fortbildungDeadline}</Text>
              </View>
            </Card>

            <Card style={{ gap: 22 }}>
              <Progress 
                icon={<Briefcase size={20} color={dailyDrivingHours > 8.25 ? COLORS.danger : COLORS.primary} />} 
                label="Tägliche Fahrzeit (Limit 495 Min)" 
                value={`${dailyDrivingMinutes} Min / 495 Min`} 
                ratio={dailyDrivingMinutes / 495} 
                color={dailyDrivingMinutes > 495 ? COLORS.danger : COLORS.primary} 
              />
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }} />
              <Progress 
                icon={<FileCheck size={20} color={dailyWorkHours > 10 ? COLORS.warning : COLORS.accent} />} 
                label="Tägliche Gesamtarbeitszeit" 
                value={`${(dailyWorkMinutes / 60).toFixed(1)}h / 10h`} 
                ratio={dailyWorkMinutes / 600} 
                color={dailyWorkMinutes > 600 ? COLORS.danger : COLORS.accent} 
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color={COLORS.text.sub} />
                <Text style={{ color: COLORS.text.sub, flex: 1 }}>Arbeitszeiten werden automatisch aus den Kalendereinträgen berechnet.</Text>
              </View>
            </Card>
          </>
        ) : (
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ListFilter size={20} color={COLORS.primary} />
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Revisionssichere Akten</Text>
              </View>
              {complianceLogs && complianceLogs.length > 0 && (
                <TouchableOpacity onPress={clearLogs} style={{ flexDirection: 'row', gap: 4, alignItems: 'center', padding: 6 }}>
                  <Trash2 size={16} color={COLORS.danger} />
                  <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '700' }}>Löschen</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ fontSize: 13, color: COLORS.text.sub, lineHeight: 18 }}>
              Gemäß § 31 Abs. 4 FahrlG müssen alle Änderungen an Ausbildungsnachweisen revisionssicher protokolliert werden.
            </Text>

            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }} />

            {!complianceLogs || complianceLogs.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: COLORS.text.sub, fontWeight: '700' }}>Keine Protokoll-Einträge vorhanden.</Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {complianceLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const formattedTime = logDate.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  let badgeColor = COLORS.primary;
                  if (log.action.includes('Lösch') || log.action.includes('storniert')) badgeColor = COLORS.danger;
                  if (log.action.includes('bestätigt') || log.action.includes('signiert')) badgeColor = COLORS.accent;
                  if (log.action.includes('Override')) badgeColor = COLORS.warning;

                  return (
                    <View key={log.id} style={{ borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', paddingBottom: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: COLORS.text.sub, fontWeight: '600' }}>{formattedTime}</Text>
                        <Badge style={{ backgroundColor: badgeColor }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{log.action}</Text></Badge>
                      </View>
                      <Text style={{ fontSize: 14, color: isDark ? COLORS.text.mainDark : COLORS.text.main, lineHeight: 20 }}>{log.details}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.text.sub, fontStyle: 'italic' }}>Durchgeführt von: {log.instructorName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const isDark = useColorScheme() === 'dark';
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}><TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity><View><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{title}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{subtitle}</Text></View></View>;
}

function Progress({ icon, label, value, ratio, color }: { icon: React.ReactNode; label: string; value: string; ratio: number; color: string }) {
  const isDark = useColorScheme() === 'dark';
  return <View>{<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{icon}<Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900' }}>{label}</Text></View><Text style={{ color, fontWeight: '900' }}>{value}</Text></View>}<View style={{ height: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: color }} /></View></View>;
}
