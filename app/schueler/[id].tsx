// Student Detail/Edit Screen – native parity with the web workflow
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import {
  BookOpen,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  Clock,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  Scale
} from 'lucide-react-native';

import { Card, Input, Button, Switch, Modal, Badge, LoadingSpinner, ZoneBadge, COLORS } from '../../src/components/ui';
import { CURRICULUM, DEFAULT_RULES, getPipelineForStudent } from '../../src/constants';
import { db } from '../../src/lib/storage';
import { formatDate, getPipelineProgress, toISODate } from '../../src/lib/utils';
import { geminiService } from '../../src/services/geminiService';
import { useAgent } from '../../src/agent/AgentProvider';
import { Availability, ChannelType, Student, TheoryStatus, ZoneType, Session } from '../../src/types';

const emptyTheory: TheoryStatus = {
  standard_lessons_attended: Array(12).fill(false),
  specific_lessons_dates: [null, null],
  learning_progress: 0,
  simulations_passed: 0,
};

const defaultStudent = (): Partial<Student> => ({
  first_name: '',
  last_name: '',
  zone: 'Rosenheim',
  pickup_address: '',
  phone: '',
  email: '',
  birth_date: '2007-01-01',
  license_class: 'B',
  previous_class: 'Keine',
  needs_vision_aid: false,
  preferred_channel: 'whatsapp',
  next_stage_day: 1,
  max_sessions_per_week: 2,
  application_date: toISODate(new Date()),
  application_approval_date: null,
  theory_passed_at: null,
  practical_exam_at: null,
  planned_theory_exam_at: null,
  planned_practical_exam_at: null,
  notes: '',
  has_picture: false,
  has_vision_test: false,
  has_first_aid: false,
  has_application_submitted: false,
  availabilities: [],
  training_progress: {},
  theory_status: emptyTheory,
});

export default function StudentEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { triggerWithQuery } = useAgent();
  const queryClient = useQueryClient();
  const isDark = useColorScheme() === 'dark';
  const isNew = id === 'neu';

  const [activeTab, setActiveTab] = useState<'info' | 'progress'>('info');
  const [form, setForm] = useState<Partial<Student>>(defaultStudent());
  const [showTimeline, setShowTimeline] = useState(false);
  const [showAdk, setShowAdk] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Signatures State
  const [signStudentChecked, setSignStudentChecked] = useState(false);
  const [signInstructorChecked, setSignInstructorChecked] = useState(false);

  const { data: existingStudent, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => db.getStudent(id!),
    enabled: !isNew && !!id,
  });
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  
  const rules = rulesData || DEFAULT_RULES;
  const student = buildStudentObject();
  const pipeline = getPipelineForStudent(student);
  const maxStage = pipeline.length;
  const studentSessions = sessions.filter((s) => s.student_id === id).sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`));

  useEffect(() => {
    if (existingStudent) {
      setForm({
        ...defaultStudent(),
        ...existingStudent,
        theory_status: existingStudent.theory_status || emptyTheory,
        training_progress: existingStudent.training_progress || {},
      });
    }
  }, [existingStudent]);

  // Read-only Lock Flag (§ 31 FahrlG Compliance)
  const isLocked = !!(form.student_signature && form.instructor_signature);

  const progress = getPipelineProgress(pipeline, form.next_stage_day || 1);

  const applicationExpiry = useMemo(() => {
    if (!form.application_date) return null;
    const expiry = new Date(form.application_date);
    expiry.setDate(expiry.getDate() + (rules.application_expiration_days || 365));
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { expiry, days };
  }, [form.application_date, rules.application_expiration_days]);

  // Vision test expiry (valid for 2 years per FeV)
  const visionTestExpiry = useMemo(() => {
    if (!form.vision_test_date) return null;
    const expiry = new Date(form.vision_test_date);
    expiry.setFullYear(expiry.getFullYear() + 2);
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { expiry, days };
  }, [form.vision_test_date]);

  // Application approval expiry (1 year after approval per § 22 FeV)
  const approvalExpiry = useMemo(() => {
    if (!form.application_approval_date) return null;
    const expiry = new Date(form.application_approval_date);
    expiry.setFullYear(expiry.getFullYear() + 1);
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { expiry, days };
  }, [form.application_approval_date]);

  const studentAge = useMemo(() => {
    if (!form.birth_date) return 0;
    const birthDate = new Date(form.birth_date);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return age;
  }, [form.birth_date]);

  // Sonderfahrten goals & progress
  const sonderfahrten = useMemo(() => {
    const license = form.license_class?.toUpperCase() || 'B';
    let targetUel = 5;
    let targetAb = 4;
    let targetNf = 3;

    if (license === 'BE') {
      targetUel = 3;
      targetAb = 1;
      targetNf = 1;
    } else if (form.previous_class && form.previous_class !== 'Keine') {
      targetUel = 0;
      targetAb = 0;
      targetNf = 0;
    }

    let doneUel = 0;
    let doneAb = 0;
    let doneNf = 0;

    const confirmed = studentSessions.filter(s => s.confirmed);
    confirmed.forEach(session => {
      const stage = pipeline.find(p => p.day === session.stage_day);
      if (!stage) return;
      if (stage.isNight) {
        doneNf += 1;
      } else if (stage.isHighway) {
        if (stage.description.toLowerCase().includes('überland')) {
          doneUel += 1;
        } else if (stage.description.toLowerCase().includes('autobahn')) {
          doneAb += 1;
        } else {
          doneUel += 1; // Fallback
        }
      }
    });

    return {
      uel: { done: doneUel, target: targetUel },
      ab: { done: doneAb, target: targetAb },
      nf: { done: doneNf, target: targetNf },
    };
  }, [form.license_class, form.previous_class, studentSessions, pipeline]);

  // Compliance Checks
  const studentViolations = useMemo(() => {
    const list: string[] = [];
    const license = form.license_class?.toUpperCase() || 'B';

    if (license === 'B' && studentAge < 17) {
      list.push('Mindestalter für Klasse B/BF17 (17 Jahre) unterschritten.');
    } else if (license === 'BE' && studentAge < 18) {
      list.push('Mindestalter für Klasse BE (18 Jahre) unterschritten.');
    }

    const nextStage = form.next_stage_day || 1;
    if (nextStage >= 9) {
      const missing: string[] = [];
      if (!form.has_vision_test) missing.push('Sehtest');
      if (!form.has_first_aid) missing.push('Erste Hilfe');
      if (!form.has_picture) missing.push('Passbild');
      if (!form.has_application_submitted) missing.push('Antrag abgegeben');
      
      if (missing.length > 0) {
        list.push(`Sonderfahrten beginnen (Tag ${nextStage}), aber Unterlagen fehlen: ${missing.join(', ')}.`);
      }
    }

    if (applicationExpiry && applicationExpiry.days < 0) {
      list.push('Der Führerscheinantrag ist abgelaufen (Gültigkeit 1 Jahr nach § 22 FeV).');
    }

    if (visionTestExpiry && visionTestExpiry.days < 0) {
      list.push('Der Sehtest ist abgelaufen (Gültigkeit 2 Jahre nach FeV).');
    } else if (visionTestExpiry && visionTestExpiry.days < 60) {
      list.push(`Der Sehtest läuft in ${visionTestExpiry.days} Tagen ab.`);
    }

    if (approvalExpiry && approvalExpiry.days < 0) {
      list.push('Die Antragsgenehmigung ist abgelaufen (Gültigkeit 1 Jahr nach § 22 FeV).');
    } else if (approvalExpiry && approvalExpiry.days < 60) {
      list.push(`Die Antragsgenehmigung läuft in ${approvalExpiry.days} Tagen ab.`);
    }

    return list;
  }, [form.license_class, studentAge, form.next_stage_day, form.has_vision_test, form.has_first_aid, form.has_picture, form.has_application_submitted, applicationExpiry, visionTestExpiry, approvalExpiry]);

  function buildStudentObject(): Student {
    return {
      id: isNew ? uuidv4() : id!,
      first_name: form.first_name || '',
      last_name: form.last_name || '',
      zone: (form.zone || 'Rosenheim') as ZoneType,
      pickup_address: form.pickup_address || '',
      phone: form.phone || '',
      email: form.email || '',
      birth_date: form.birth_date || '2007-01-01',
      gender: form.gender,
      license_class: form.license_class || 'B',
      previous_class: form.previous_class || 'Keine',
      needs_vision_aid: !!form.needs_vision_aid,
      preferred_channel: (form.preferred_channel || 'whatsapp') as ChannelType,
      next_stage_day: Math.min(maxStage + 1, Math.max(1, form.next_stage_day || 1)),
      max_sessions_per_week: Math.min(5, Math.max(1, form.max_sessions_per_week || 2)),
      application_date: form.application_date || toISODate(new Date()),
      application_approval_date: form.application_approval_date || null,
      theory_passed_at: form.theory_passed_at || null,
      practical_exam_at: form.practical_exam_at || null,
      planned_theory_exam_at: form.planned_theory_exam_at || null,
      planned_practical_exam_at: form.planned_practical_exam_at || null,
      notes: form.notes || '',
      has_picture: !!form.has_picture,
      has_vision_test: !!form.has_vision_test,
      vision_test_date: form.vision_test_date || null,
      has_first_aid: !!form.has_first_aid,
      has_application_submitted: !!form.has_application_submitted,
      availabilities: form.availabilities || [],
      training_progress: form.training_progress || {},
      theory_status: form.theory_status || emptyTheory,
      student_signature: form.student_signature || null,
      instructor_signature: form.instructor_signature || null,
      signature_date: form.signature_date || null,
      signed_at: form.signed_at || null,
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => db.saveStudent(buildStudentObject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => db.deleteStudent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      router.back();
    },
  });

  const analyzeProgress = async () => {
    if (isNew) return;
    setAnalyzing(true);
    const result = await geminiService.analyzeStudentProgress(buildStudentObject(), sessions, pipeline);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const updateTheory = (patch: Partial<TheoryStatus>) => {
    if (isLocked) return;
    setForm({ ...form, theory_status: { ...(form.theory_status || emptyTheory), ...patch } });
  };

  const addAvailability = () => {
    if (isLocked) return;
    const next: Availability = { id: uuidv4(), weekday: 1, start_time: '14:00', end_time: '18:00' };
    setForm({ ...form, availabilities: [...(form.availabilities || []), next] });
  };

  const updateAvailability = (availability: Availability) => {
    if (isLocked) return;
    setForm({ ...form, availabilities: (form.availabilities || []).map((a) => (a.id === availability.id ? availability : a)) });
  };

  const removeAvailability = (availabilityId: string) => {
    if (isLocked) return;
    setForm({ ...form, availabilities: (form.availabilities || []).filter((a) => a.id !== availabilityId) });
  };

  const handleSaveWithCompliance = () => {
    if (isLocked) {
      Alert.alert('Gesperrt', 'Ausbildungsnachweis bereits digital unterschrieben. Keine Änderungen erlaubt.');
      return;
    }

    const mode = rules.agent_execution_mode || 'safe';

    if (studentViolations.length > 0) {
      if (mode === 'safe') {
        Alert.alert(
          'Compliance-Sperre (Sicherer Modus)',
          `Speichern blockiert aufgrund von gesetzlichen Abweichungen:\n\n${studentViolations.map(v => `• ${v}`).join('\n')}`,
          [{ text: 'Verstanden' }]
        );
        return;
      } else if (mode === 'moderate') {
        Alert.alert(
          'Compliance-Warnung (Moderater Modus)',
          `Gesetzliche Abweichungen festgestellt:\n\n${studentViolations.map(v => `• ${v}`).join('\n')}\n\nMöchten Sie diese Abweichungen überschreiben? Dies wird revisionssicher protokolliert.`,
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Überschreiben & Speichern',
              onPress: () => {
                db.logComplianceEvent(
                  id || 'new',
                  'OVERRIDE',
                  'STUDENT_SAVE',
                  `Manuell freigegeben trotz: ${studentViolations.join('; ')}`
                ).then(() => saveMutation.mutate());
              }
            }
          ]
        );
        return;
      } else {
        // Risk Mode
        Alert.alert(
          'Risiko-Modus Warnung',
          `Gesetzliche Abweichungen vorhanden:\n\n${studentViolations.map(v => `• ${v}`).join('\n')}\n\nSpeichern fortsetzen?`,
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Fortfahren',
              onPress: () => {
                db.logComplianceEvent(
                  id || 'new',
                  'OVERRIDE',
                  'STUDENT_SAVE',
                  `Risiko-Modus Speicherung trotz: ${studentViolations.join('; ')}`
                ).then(() => saveMutation.mutate());
              }
            }
          ]
        );
        return;
      }
    }

    // No violations
    saveMutation.mutate();
  };

  const handleSignFinalize = () => {
    if (!signStudentChecked || !signInstructorChecked) {
      Alert.alert('Fehler', 'Bitte bestätigen Sie beide Unterschriftserklärungen.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const signatureTime = new Date().toISOString();

    setForm({
      ...form,
      student_signature: `DIGITAL_CONFIRMED:${form.first_name}_${form.last_name}`,
      instructor_signature: `DIGITAL_CONFIRMED:FAHRLEHRER`,
      signed_at: signatureTime,
      signature_date: todayStr,
    });

    db.logComplianceEvent(
      id!,
      'COMPLIANCE_CHECK',
      'SIGNATURE_LOCK',
      `Ausbildungsnachweis digital signiert und gesperrt für ${form.first_name} ${form.last_name}.`
    );

    setShowSignatureModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Signiert', 'Der Ausbildungsnachweis wurde gesetzeskonform signiert und gesperrt.');
  };

  const handleUnlockSignatures = () => {
    Alert.alert(
      'Signatur aufheben?',
      'Das Aufheben der Signatur entsperrt die Bearbeitung. Die bestehenden Signaturen werden gelöscht und dieser Vorgang wird im Compliance-Log protokolliert.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entsperren',
          style: 'destructive',
          onPress: () => {
            db.logComplianceEvent(
              id!,
              'OVERRIDE',
              'SIGNATURE_UNLOCK',
              `Ausbildungsnachweis für ${form.first_name} ${form.last_name} entsperrt (Signaturen gelöscht).`
            ).then(() => {
              setForm({
                ...form,
                student_signature: null,
                instructor_signature: null,
                signature_date: null,
                signed_at: null,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            });
          }
        }
      ]
    );
  };

  if (isLoading && !isNew) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }}>
      
      {/* Header Panel */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={24} color="#6C5CE7" />
          <Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Zurück</Text>
        </TouchableOpacity>
        
        {!isLocked && (
          <Button onPress={handleSaveWithCompliance} disabled={saveMutation.isPending}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Save size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Speichern</Text>
            </View>
          </Button>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
        
        {/* Lock Warning Banner */}
        {isLocked && (
          <Card style={{ backgroundColor: `${COLORS.success}15`, borderColor: COLORS.success, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Lock size={20} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Ausbildungsnachweis signiert</Text>
              <Text style={{ fontSize: 12, color: COLORS.text.sub }}>Bearbeitung nach § 31 FahrlG gesperrt. Signiert am {formatDate(form.signature_date || '')}.</Text>
            </View>
            <TouchableOpacity onPress={handleUnlockSignatures} style={{ padding: 8, backgroundColor: `${COLORS.danger}20`, borderRadius: 10 }}>
              <Unlock size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Violations Warning Banner */}
        {!isLocked && studentViolations.length > 0 && (
          <Card style={{ backgroundColor: `${COLORS.danger}15`, borderColor: COLORS.danger, borderWidth: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color={COLORS.danger} />
              <Text style={{ fontWeight: '900', color: COLORS.danger }}>Gesetzliche Abweichungen</Text>
            </View>
            {studentViolations.map((v, i) => (
              <Text key={i} style={{ fontSize: 12, color: isDark ? COLORS.text.mainDark : COLORS.text.main, lineHeight: 16 }}>• {v}</Text>
            ))}
          </Card>
        )}

        <View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: isDark ? '#F0EEF6' : '#1A1625' }}>
            {isNew ? 'Neuer Schüler' : `${form.first_name} ${form.last_name}`}
          </Text>
          {!isNew && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <ZoneBadge zone={form.zone || 'Rosenheim'} />
              <Badge variant="secondary">Tag {form.next_stage_day}/{maxStage}</Badge>
              {studentAge > 0 && <Badge variant="glass">{studentAge} Jahre</Badge>}
            </View>
          )}
        </View>

        {!isNew && (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Praktischer Fortschritt</Text>
              <Text style={{ fontWeight: '900', color: '#6C5CE7' }}>{progress}%</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(108,92,231,0.16)' : '#E9E5FF' }}>
              <View style={{ width: `${progress}%` as any, height: 8, borderRadius: 4, backgroundColor: '#6C5CE7' }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!!form.phone && <Button variant="outline" size="sm" onPress={() => Linking.openURL(`tel:${form.phone}`)}><Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Anrufen</Text></Button>}
              {!!form.phone && <Button variant="outline" size="sm" onPress={() => Linking.openURL(`whatsapp://send?phone=${form.phone}`)}><Text style={{ color: '#10B981', fontWeight: '700' }}>WhatsApp</Text></Button>}
              {!!form.pickup_address && <Button variant="outline" size="sm" onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(form.pickup_address || '')}`)}><Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Route</Text></Button>}
            </View>
          </Card>
        )}

        <View style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0EEF6' }}>
          {(['info', 'progress'] as const).map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: activeTab === tab ? '#6C5CE7' : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: activeTab === tab ? '#FFF' : '#6E6A85' }}>{tab === 'info' ? 'Info' : 'Fortschritt'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'info' ? (
          <>
            <SectionTitle title="Persönliche Daten" icon={<Phone size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 12 }}>
              <Row label="Vorname" isDark={isDark}><Input value={form.first_name || ''} onChangeText={(v) => setForm({ ...form, first_name: v })} placeholder="Vorname" editable={!isLocked} /></Row>
              <Row label="Nachname" isDark={isDark}><Input value={form.last_name || ''} onChangeText={(v) => setForm({ ...form, last_name: v })} placeholder="Nachname" editable={!isLocked} /></Row>
              <Row label="Telefon" isDark={isDark}><Input value={form.phone || ''} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="+49..." keyboardType="phone-pad" editable={!isLocked} /></Row>
              <Row label="E-Mail" isDark={isDark}><Input value={form.email || ''} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="email@..." keyboardType="email-address" editable={!isLocked} /></Row>
              <Row label="Geburtsdatum" isDark={isDark}><Input value={form.birth_date || ''} onChangeText={(v) => setForm({ ...form, birth_date: v })} placeholder="YYYY-MM-DD" editable={!isLocked} /></Row>
              <Row label="Abholadresse" isDark={isDark}><Input value={form.pickup_address || ''} onChangeText={(v) => setForm({ ...form, pickup_address: v })} placeholder="Straße Nr." editable={!isLocked} /></Row>
            </Card>

            <SectionTitle title="Ausbildung" icon={<Car size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 14 }}>
              <SegmentRow label="Zone" options={['Rosenheim', 'Haidholzen', 'Prutting']} value={form.zone || 'Rosenheim'} onChange={(zone) => setForm({ ...form, zone: zone as ZoneType })} isDark={isDark} />
              <Row label="Führerscheinklasse" isDark={isDark}><Input value={form.license_class || ''} onChangeText={(v) => setForm({ ...form, license_class: v })} placeholder="B" editable={!isLocked} /></Row>
              <Row label="Vorbesitz" isDark={isDark}><Input value={form.previous_class || ''} onChangeText={(v) => setForm({ ...form, previous_class: v })} placeholder="Keine" editable={!isLocked} /></Row>
              <Stepper label="Aktueller Tag" value={form.next_stage_day || 1} min={1} max={maxStage + 1} onChange={(value) => setForm({ ...form, next_stage_day: value })} isDark={isDark} />
              <Stepper label="Max. Termine/Woche" value={form.max_sessions_per_week || 2} min={1} max={5} onChange={(value) => setForm({ ...form, max_sessions_per_week: value })} isDark={isDark} />
            </Card>

            <SectionTitle title="Verfügbarkeiten" icon={<Clock size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 10 }}>
              {(form.availabilities || []).map((a) => (
                <View key={a.id} style={{ gap: 8, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E1F2' }}>
                  <SegmentRow label="Tag" options={['1', '2', '3', '4', '5', '6']} value={String(a.weekday)} onChange={(value) => updateAvailability({ ...a, weekday: Number(value) })} isDark={isDark} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><Input value={a.start_time} onChangeText={(v) => updateAvailability({ ...a, start_time: v })} placeholder="Start" editable={!isLocked} /></View>
                    <View style={{ flex: 1 }}><Input value={a.end_time} onChangeText={(v) => updateAvailability({ ...a, end_time: v })} placeholder="Ende" editable={!isLocked} /></View>
                    {!isLocked && (
                      <TouchableOpacity onPress={() => removeAvailability(a.id)} style={{ width: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                        <X size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              {!isLocked && <Button variant="outline" onPress={addAvailability}><Text style={{ color: '#6C5CE7', fontWeight: '800' }}>Verfügbarkeit hinzufügen</Text></Button>}
            </Card>

            <SectionTitle title="Antrag & Unterlagen (§ 22 FeV)" icon={<FileText size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 12 }}>
              <TouchableOpacity onPress={() => { if (!isLocked) setShowApplication(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Calendar size={18} color="#6C5CE7" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Antrag verwalten</Text>
                  <Text style={{ fontSize: 12, color: applicationExpiry && applicationExpiry.days < 30 ? '#EF4444' : '#6E6A85' }}>
                    {applicationExpiry ? `Ablauf in ${applicationExpiry.days} Tagen` : 'Kein Datum'}
                  </Text>
                </View>
              </TouchableOpacity>
              <DocRow label="Antrag abgegeben" value={!!form.has_application_submitted} onChange={(v) => setForm({ ...form, has_application_submitted: v })} isDark={isDark} />
              <DocRow label="Passbild" value={!!form.has_picture} onChange={(v) => setForm({ ...form, has_picture: v })} isDark={isDark} />
              <DocRow label="Sehtest" value={!!form.has_vision_test} onChange={(v) => setForm({ ...form, has_vision_test: v })} isDark={isDark} />
              {form.has_vision_test && (
                <View style={{ marginLeft: 32, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#D8D4E8' : '#6E6A85', marginBottom: 4 }}>Sehtest-Datum (FeV: 2 Jahre gültig)</Text>
                  <Input value={form.vision_test_date || ''} onChangeText={(v) => setForm({ ...form, vision_test_date: v || null })} placeholder="YYYY-MM-DD" editable={!isLocked} />
                  {visionTestExpiry && (
                    <Text style={{ fontSize: 11, color: visionTestExpiry.days < 60 ? '#EF4444' : '#10B981', marginTop: 4 }}>
                      {visionTestExpiry.days < 0 ? `⚠️ Abgelaufen seit ${Math.abs(visionTestExpiry.days)} Tagen` : `Gültig noch ${visionTestExpiry.days} Tage (bis ${visionTestExpiry.expiry.toLocaleDateString('de-DE')})`}
                    </Text>
                  )}
                </View>
              )}
              <DocRow label="Erste Hilfe" value={!!form.has_first_aid} onChange={(v) => setForm({ ...form, has_first_aid: v })} isDark={isDark} />
              <DocRow label="Braucht Sehhilfe" value={!!form.needs_vision_aid} onChange={(v) => setForm({ ...form, needs_vision_aid: v })} isDark={isDark} />
            </Card>

            <SectionTitle title="Notizen" icon={<BookOpen size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card><Input value={form.notes || ''} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Notizen..." multiline numberOfLines={4} editable={!isLocked} /></Card>
          </>
        ) : (
          <>
            <SectionTitle title="Praxis & ADK (§ 31 FahrlG)" icon={<Car size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 12 }}>
              <Button onPress={analyzeProgress} disabled={analyzing || isNew}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wand2 size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>{analyzing ? 'Analysiere...' : 'KI-Fortschrittsanalyse'}</Text>
                </View>
              </Button>
              <Button
                variant="outline"
                onPress={() => triggerWithQuery(`Analysiere den Fortschritt für Schüler ${form.first_name} ${form.last_name} und gib mir Planungsvorschläge.`)}
                disabled={isNew}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#6C5CE7" />
                  <Text style={{ color: '#6C5CE7', fontWeight: '800' }}>Agenten fragen</Text>
                </View>
              </Button>
              {analysis && <Text style={{ color: isDark ? '#D8D4E8' : '#3B354A', lineHeight: 20 }}>{analysis}</Text>}
              <Button variant="outline" onPress={() => setShowTimeline(true)}><Text style={{ color: '#6C5CE7', fontWeight: '800' }}>Praxis Ablauf anzeigen</Text></Button>
              <Button variant="outline" onPress={() => setShowAdk(true)}><Text style={{ color: '#6C5CE7', fontWeight: '800' }}>ADK anzeigen</Text></Button>
            </Card>

            {/* Sonderfahrten Tracker Section */}
            <SectionTitle title="Gesetzliche Sonderfahrten (§ 5 FahrschAusbO)" icon={<Scale size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Überlandschulung (ÜL)</Text>
                  <Text style={{ fontWeight: '900', color: COLORS.primary }}>{sonderfahrten.uel.done} / {sonderfahrten.uel.target} Fahrstunden</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E9E5FF' }}>
                  <View style={{ width: `${sonderfahrten.uel.target > 0 ? (sonderfahrten.uel.done / sonderfahrten.uel.target) * 100 : 100}%` as any, height: 6, borderRadius: 3, backgroundColor: COLORS.primary }} />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Autobahnschulung (AB)</Text>
                  <Text style={{ fontWeight: '900', color: COLORS.primary }}>{sonderfahrten.ab.done} / {sonderfahrten.ab.target} Fahrstunden</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E9E5FF' }}>
                  <View style={{ width: `${sonderfahrten.ab.target > 0 ? (sonderfahrten.ab.done / sonderfahrten.ab.target) * 100 : 100}%` as any, height: 6, borderRadius: 3, backgroundColor: COLORS.primary }} />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Nachtschulung (NF)</Text>
                  <Text style={{ fontWeight: '900', color: COLORS.primary }}>{sonderfahrten.nf.done} / {sonderfahrten.nf.target} Fahrstunden</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E9E5FF' }}>
                  <View style={{ width: `${sonderfahrten.nf.target > 0 ? (sonderfahrten.nf.done / sonderfahrten.nf.target) * 100 : 100}%` as any, height: 6, borderRadius: 3, backgroundColor: COLORS.primary }} />
                </View>
              </View>
            </Card>

            {/* Digital Signatures Box */}
            <SectionTitle title="Ausbildungsnachweis abschließen (§ 31 FahrlG)" icon={<Lock size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, color: COLORS.text.sub, lineHeight: 18 }}>
                Nach Abschluss der Ausbildung müssen Fahrlehrer und Fahrschüler den Ausbildungsnachweis digital signieren. Dies sperrt die Akte revisionssicher gegen spätere Änderungen.
              </Text>
              {isLocked ? (
                <View style={{ backgroundColor: `${COLORS.success}10`, padding: 12, borderRadius: 12, gap: 4 }}>
                  <Text style={{ color: COLORS.success, fontWeight: '800' }}>Status: Gesetzeskonform signiert & gesperrt</Text>
                  <Text style={{ fontSize: 12, color: COLORS.text.sub }}>Signiert am: {form.signature_date}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.text.sub }}>Prüfsumme: {form.signed_at}</Text>
                </View>
              ) : (
                <Button onPress={() => setShowSignatureModal(true)} style={{ backgroundColor: COLORS.primary }}>
                  Nachweis digital signieren
                </Button>
              )}
            </Card>

            <SectionTitle title="Theorie" icon={<GraduationCap size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 14 }}>
              <Stepper label="Lernfortschritt %" value={form.theory_status?.learning_progress || 0} min={0} max={100} step={5} onChange={(value) => updateTheory({ learning_progress: value })} isDark={isDark} />
              <Stepper label="Simulationen bestanden" value={form.theory_status?.simulations_passed || 0} min={0} max={5} onChange={(value) => updateTheory({ simulations_passed: value })} isDark={isDark} />
              
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6E6A85', marginBottom: -4 }}>Standard-Unterricht Lektionen 1-12 (Grundstoff)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(form.theory_status?.standard_lessons_attended || Array(12).fill(false)).map((done, index) => (
                  <TouchableOpacity 
                    key={index} 
                    disabled={isLocked}
                    onPress={() => {
                      const next = [...(form.theory_status?.standard_lessons_attended || Array(12).fill(false))];
                      next[index] = !next[index];
                      updateTheory({ standard_lessons_attended: next });
                    }} 
                    style={{ width: 40, height: 36, borderRadius: 12, backgroundColor: done ? '#10B981' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '900', color: done ? '#FFF' : '#6E6A85' }}>{index + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6E6A85', marginBottom: -4 }}>Zusatz-Unterricht Lektionen 13-14 (Klassenspezifisch)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[13, 14].map((num, i) => {
                  const done = !!form.theory_status?.specific_lessons_dates?.[i];
                  return (
                    <TouchableOpacity
                      key={num}
                      disabled={isLocked}
                      onPress={() => {
                        const dates = [...(form.theory_status?.specific_lessons_dates || [null, null])];
                        dates[i] = done ? null : new Date().toISOString();
                        updateTheory({ specific_lessons_dates: dates });
                      }}
                      style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: done ? '#10B981' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                    >
                      <Text style={{ fontWeight: '900', color: done ? '#FFF' : '#6E6A85' }}>Lektion {num}</Text>
                      {done && <Check size={16} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <DocRow label="Theorie bestanden" value={!!form.theory_passed_at} onChange={(v) => setForm({ ...form, theory_passed_at: v ? toISODate(new Date()) : null })} isDark={isDark} />
              <Row label="Geplante Theorieprüfung" isDark={isDark}><Input value={form.planned_theory_exam_at || ''} onChangeText={(v) => setForm({ ...form, planned_theory_exam_at: v || null })} placeholder="YYYY-MM-DD" editable={!isLocked} /></Row>
              <Row label="Geplante Praxisprüfung" isDark={isDark}><Input value={form.planned_practical_exam_at || ''} onChangeText={(v) => setForm({ ...form, planned_practical_exam_at: v || null })} placeholder="YYYY-MM-DD" editable={!isLocked} /></Row>
            </Card>

            <SectionTitle title="Terminhistorie" icon={<Calendar size={16} color="#6C5CE7" />} isDark={isDark} />
            <Card style={{ gap: 8 }}>
              {studentSessions.slice(0, 8).length === 0 ? <Text style={{ color: '#6E6A85' }}>Noch keine Termine.</Text> : studentSessions.slice(0, 8).map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ flex: 1, color: isDark ? '#F0EEF6' : '#1A1625' }}>{formatDate(s.date)} {s.start_time}</Text>
                  <Badge variant={s.confirmed ? 'success' : s.cancellation_reason ? 'destructive' : 'secondary'}>
                    {s.confirmed ? 'Bestätigt' : s.cancellation_reason ? 'Storno' : s.type || 'driving'}
                  </Badge>
                </View>
              ))}
            </Card>
          </>
        )}

        {!isNew && !isLocked && (
          <TouchableOpacity onPress={() => Alert.alert('Schüler löschen?', 'Alle Daten und Fahrstunden werden gelöscht.', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteMutation.mutate() }])} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }}>
            <Trash2 size={18} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontWeight: '800' }}>Schüler löschen</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Practical Training Timeline stages modal */}
      <Modal visible={showTimeline} onClose={() => setShowTimeline(false)} title="Ausbildungsplan">
        <ScrollView style={{ maxHeight: 520 }}>
          {pipeline.map((stage) => (
            <TimelineStage key={stage.day} stage={stage} currentDay={form.next_stage_day || 1} isDark={isDark} />
          ))}
        </ScrollView>
      </Modal>

      {/* ADK Modal */}
      <Modal visible={showAdk} onClose={() => setShowAdk(false)} title="Ausbildungsdiagrammkarte">
        <ScrollView style={{ maxHeight: 520 }}>
          {CURRICULUM.map((category) => (
            <Card key={category.id} style={{ marginBottom: 10, gap: 8 }}>
              <Text style={{ fontWeight: '900', color: isDark ? '#F0EEF6' : '#1A1625' }}>{category.title}</Text>
              {category.items.map((item) => {
                const value = form.training_progress?.[item.id] || 0;
                return (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ flex: 1, color: isDark ? '#D8D4E8' : '#3B354A' }}>{item.label}</Text>
                    {[0, 1, 2, 3].map((level) => (
                      <TouchableOpacity 
                        key={level} 
                        disabled={isLocked}
                        onPress={() => setForm({ ...form, training_progress: { ...(form.training_progress || {}), [item.id]: level } })} 
                        style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value >= level && level > 0 ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6' }}>
                        {value === level && level === 0 ? <X size={14} color="#6E6A85" style={{ margin: 5 }} /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </Card>
          ))}
        </ScrollView>
      </Modal>

      {/* Application Date / Approval modal */}
      <Modal visible={showApplication} onClose={() => setShowApplication(false)} title="Antrag verwalten">
        <View style={{ gap: 12 }}>
          <Row label="Antragsdatum" isDark={isDark}><Input value={form.application_date || ''} onChangeText={(v) => setForm({ ...form, application_date: v })} placeholder="YYYY-MM-DD" editable={!isLocked} /></Row>
          <Row label="Genehmigt am" isDark={isDark}><Input value={form.application_approval_date || ''} onChangeText={(v) => setForm({ ...form, application_approval_date: v || null })} placeholder="YYYY-MM-DD" editable={!isLocked} /></Row>
          {applicationExpiry && <Text style={{ color: applicationExpiry.days < 30 ? '#EF4444' : '#6E6A85' }}>Ablauf: {applicationExpiry.expiry.toLocaleDateString('de-DE')} ({applicationExpiry.days} Tage)</Text>}
          <Button onPress={() => setShowApplication(false)}>Fertig</Button>
        </View>
      </Modal>

      {/* DIGITAL SIGNING MODAL (§ 31 FahrlG) */}
      <Modal visible={showSignatureModal} onClose={() => setShowSignatureModal(false)} title="Nachweis signieren">
        <ScrollView style={{ gap: 14, maxHeight: 420 }}>
          <Text style={{ fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Ausbildung Zusammenfassung</Text>
          <Card style={{ gap: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }}>
            <Text style={{ fontSize: 13, color: COLORS.text.sub }}>Schüler: {form.first_name} {form.last_name}</Text>
            <Text style={{ fontSize: 13, color: COLORS.text.sub }}>Klasse: {form.license_class}</Text>
            <Text style={{ fontSize: 13, color: COLORS.text.sub }}>Ausbildungsstufe: Tag {form.next_stage_day} von {maxStage}</Text>
            <Text style={{ fontSize: 13, color: COLORS.text.sub }}>Sonderfahrten: ÜL {sonderfahrten.uel.done}/{sonderfahrten.uel.target} · AB {sonderfahrten.ab.done}/{sonderfahrten.ab.target} · NF {sonderfahrten.nf.done}/{sonderfahrten.nf.target}</Text>
          </Card>

          <View style={{ gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <TouchableOpacity onPress={() => setSignStudentChecked(!signStudentChecked)} style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: signStudentChecked ? '#10B981' : '#C4C1D4', backgroundColor: signStudentChecked ? '#10B981' : 'transparent', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                {signStudentChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Unterschrift Fahrschüler</Text>
                <Text style={{ fontSize: 11, color: COLORS.text.sub, marginTop: 2 }}>Hiermit bestätige ich ({form.first_name} {form.last_name}) die Richtigkeit der aufgezeichneten Ausbildungstage nach § 31 FahrlG.</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <TouchableOpacity onPress={() => setSignInstructorChecked(!signInstructorChecked)} style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: signInstructorChecked ? '#10B981' : '#C4C1D4', backgroundColor: signInstructorChecked ? '#10B981' : 'transparent', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                {signInstructorChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FFF' : '#000' }}>Unterschrift Fahrlehrer</Text>
                <Text style={{ fontSize: 11, color: COLORS.text.sub, marginTop: 2 }}>Hiermit bestätige ich die ordnungsgemäße Durchführung der Ausbildung gemäß FahrschAusbO.</Text>
              </View>
            </View>
          </View>

          <Button onPress={handleSignFinalize} style={{ backgroundColor: COLORS.success, marginTop: 14 }}>
            Signatur abschließen & Akte sperren
          </Button>
        </ScrollView>
      </Modal>

    </SafeAreaView>
  );
}

const SectionTitle = ({ title, icon, isDark }: { title: string; icon: React.ReactNode; isDark: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginTop: 10 }}>
    {icon}
    <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#F0EEF6' : '#1A1625' }}>{title}</Text>
  </View>
);

const Row = ({ label, children, isDark }: { label: string; children: React.ReactNode; isDark: boolean }) => (
  <View>
    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6E6A85', marginBottom: 6 }}>{label}</Text>
    {children}
  </View>
);

const Stepper = ({ label, value, min, max, step = 1, onChange, isDark }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; isDark: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <Text style={{ flex: 1, fontWeight: '800', color: '#6E6A85' }}>{label}</Text>
    <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#F0EEF6' : '#1A1625' }}>−</Text>
    </TouchableOpacity>
    <Text style={{ minWidth: 38, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#6C5CE7' }}>{value}</Text>
    <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#F0EEF6' : '#1A1625' }}>+</Text>
    </TouchableOpacity>
  </View>
);
 
const SegmentRow = ({ label, options, value, onChange, isDark }: { label: string; options: string[]; value: string; onChange: (value: string) => void; isDark: boolean }) => (
  <View>
    <Text style={{ fontSize: 12, fontWeight: '800', color: '#6E6A85', marginBottom: 8 }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <TouchableOpacity key={option} onPress={() => onChange(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: value === option ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6' }}>
          <Text style={{ fontWeight: '800', color: value === option ? '#FFF' : '#6E6A85' }}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);
 
const DocRow = ({ label, value, onChange, isDark }: { label: string; value: boolean; onChange: (value: boolean) => void; isDark: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: value ? '#10B981' : '#C4C1D4', backgroundColor: value ? '#10B981' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        {value && <Check size={14} color="#FFF" strokeWidth={3} />}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F0EEF6' : '#1A1625' }}>{label}</Text>
    </View>
    <Switch value={value} onValueChange={onChange} />
  </View>
);
 
const TimelineStage = ({ stage, currentDay, isDark }: { stage: { day: number; description: string; duration: number; isNight?: boolean; isHighway?: boolean }; currentDay: number; isDark: boolean }) => {
  const done = stage.day < currentDay;
  const active = stage.day === currentDay;
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: done ? '#10B981' : active ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontWeight: '900', color: done || active ? '#FFF' : '#6E6A85' }}>{stage.day}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>{stage.description}</Text>
        <Text style={{ color: '#6E6A85', fontSize: 12 }}>{stage.duration} min{stage.isNight ? ' • Nacht' : ''}{stage.isHighway ? ' • Autobahn' : ''}</Text>
      </View>
    </View>
  );
};
