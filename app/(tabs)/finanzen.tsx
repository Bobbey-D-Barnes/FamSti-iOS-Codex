// Finanzen Screen – FamSti iOS
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Banknote, ChevronLeft, Clock, Settings2, TrendingDown, Wallet, Sparkles, Scale, AlertCircle } from 'lucide-react-native';
import { db } from '../../src/lib/storage';
import { Badge, Card, COLORS, Input, LoadingSpinner, Modal, Button } from '../../src/components/ui';
import { useAgent } from '../../src/agent/AgentProvider';
import { DEFAULT_PRICING, calculateSessionCost as getSessionCost } from '../../src/lib/businessStats';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function FinanzenScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { triggerWithQuery } = useAgent();
  const { isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form states for pricing settings
  const [baseAmount, setBaseAmount] = useState('350');
  const [normalLesson, setNormalLesson] = useState('65');
  const [specialLesson, setSpecialLesson] = useState('75');
  const [theoryExam, setTheoryExam] = useState('50');
  const [practicalExam, setPracticalExam] = useState('150');

  const { data: students, isLoading: stLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const { data: pricing, isLoading: prLoading } = useQuery({ queryKey: ['pricing'], queryFn: db.getPricing });

  const savePricingMutation = useMutation({
    mutationFn: db.savePricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      setShowSettings(false);
    },
  });

  useEffect(() => {
    if (pricing) {
      setBaseAmount(pricing.base_amount.toString());
      setNormalLesson(pricing.normal_lesson_45m.toString());
      setSpecialLesson(pricing.special_lesson_45m.toString());
      setTheoryExam(pricing.theory_exam_fee.toString());
      setPracticalExam(pricing.practical_exam_fee.toString());
    }
  }, [pricing]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  if (stLoading || sLoading || prLoading) return <LoadingSpinner />;

  const activePricing = pricing || DEFAULT_PRICING;

  const calculateSessionCost = (session: Parameters<typeof getSessionCost>[0]): number =>
    getSessionCost(session, students || [], activePricing);

  // Calculations
  const confirmed = sessions?.filter((s) => s.confirmed) || [];
  const canceled = sessions?.filter((s) => s.cancellation_reason) || [];
  
  const revenue = confirmed.reduce((sum, s) => sum + calculateSessionCost(s), 0);
  const lost = canceled.reduce((sum, s) => sum + calculateSessionCost(s), 0);

  // Accrued balances for active students
  const openInvoices = (students || [])
    .filter((s) => !s.practical_exam_at && s.first_name !== 'Anonymisiert')
    .map((s) => {
      let openAmount = activePricing.base_amount;
      
      // Add confirmed sessions cost
      const studentConfirmed = confirmed.filter(session => session.student_id === s.id);
      openAmount += studentConfirmed.reduce((sum, s) => sum + calculateSessionCost(s), 0);
      
      // Add exam fees if registered or passed
      if (s.theory_passed_at || s.planned_theory_exam_at) {
        openAmount += activePricing.theory_exam_fee;
      }
      if (s.practical_exam_at || s.planned_practical_exam_at) {
        openAmount += activePricing.practical_exam_fee;
      }

      return { ...s, openAmount };
    })
    .filter(s => s.openAmount > 0)
    .sort((a, b) => b.openAmount - a.openAmount);

  const openTotal = openInvoices.reduce((sum, s) => sum + s.openAmount, 0);

  const handleSaveSettings = () => {
    savePricingMutation.mutate({
      base_amount: Number(baseAmount) || 350,
      normal_lesson_45m: Number(normalLesson) || 65,
      special_lesson_45m: Number(specialLesson) || 75,
      theory_exam_fee: Number(theoryExam) || 50,
      practical_exam_fee: Number(practicalExam) || 150,
    });
  };

  const handleAnonymize = () => {
    Alert.alert(
      'DSGVO-Bereinigung',
      'Möchten Sie alle Schülerakten, die älter als 5 Jahre sind, jetzt unwiderruflich anonymisieren? Rechnungsdaten bleiben für das Finanzamt (§ 147 AO) erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Anonymisieren',
          style: 'destructive',
          onPress: async () => {
            const count = await db.anonymizeOldStudentRecords();
            queryClient.invalidateQueries();
            Alert.alert('Bereinigung abgeschlossen', `${count} Schülerakten wurden erfolgreich anonymisiert.`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <Header 
        title="Finanzen" 
        subtitle="Umsatz- & Forderungsmanagement" 
        onBack={() => router.back()} 
        action={<TouchableOpacity onPress={() => setShowSettings(true)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><Settings2 size={22} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity>} 
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>
        
        {/* Preisaushang Info Panel */}
        <Card style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderLeftWidth: 4, borderLeftColor: COLORS.primary, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Scale size={18} color={COLORS.primary} />
            <Text style={{ fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Preisaushang nach § 32 FahrlG</Text>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.text.sub, lineHeight: 18 }}>
            Grundbetrag: {activePricing.base_amount} € · Übungsstunde (45m): {activePricing.normal_lesson_45m} € · Sonderfahrt (45m): {activePricing.special_lesson_45m} € · Vorstellung Prüfungen (Theorie/Praxis): {activePricing.theory_exam_fee} € / {activePricing.practical_exam_fee} €
          </Text>
        </Card>

        <View style={{ backgroundColor: COLORS.accent, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <View>
              <Badge variant="glass">Umsatz geleistet</Badge>
              <Text style={{ fontSize: 42, fontWeight: '900', color: '#FFF', marginTop: 8 }}>{revenue.toLocaleString('de-DE')} €</Text>
            </View>
            <Wallet size={34} color="#FFF" />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>
            {Math.round(confirmed.reduce((sum, s) => sum + s.duration_minutes, 0) / 60)}h bestätigte Fahrzeit gesamt
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <MiniStat title="Stornoverlust" value={`${lost.toLocaleString('de-DE')} €`} icon={<TrendingDown size={22} color={COLORS.danger} />} color={COLORS.danger} />
          <MiniStat title="Offene Posten" value={`${openTotal.toLocaleString('de-DE')} €`} icon={<Banknote size={22} color={COLORS.warning} />} color={COLORS.warning} />
        </View>

        <TouchableOpacity
          onPress={() => triggerWithQuery('Analysiere meine Finanzen, erstelle eine Ausgabenkalkulation und gib mir passende Steuertipps für meine Selbstständigkeit.')}
          style={{
            borderRadius: 16,
            padding: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: isDark ? 'rgba(108,92,231,0.15)' : '#F0EDFF',
            borderWidth: 1,
            borderColor: '#6C5CE7',
          }}
        >
          <Sparkles size={18} color="#6C5CE7" />
          <Text style={{ color: '#6C5CE7', fontWeight: '700', fontSize: 15 }}>Steuer & Ausgaben (Agent)</Text>
        </TouchableOpacity>

        {/* GDPR vs TAX ANONYMIZATION CARD */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={20} color={COLORS.primary} />
            <Text style={{ fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Gesetzliche Datenbereinigung</Text>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.text.sub, lineHeight: 18 }}>
            Nach § 31 Abs. 5 FahrlG müssen Schülerakten nach 5 Jahren gelöscht werden. Steuerbelege müssen jedoch 10 Jahre lang aufbewahrt werden (§ 147 AO). Unser System bereinigt Namen und Adressen, behält aber Belege.
          </Text>
          <Button onPress={handleAnonymize} style={{ backgroundColor: COLORS.primaryLight }}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Alte Schülerdaten anonymisieren</Text>
          </Button>
        </Card>

        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Forderungsliste (Laufende Ausbildungen)</Text>
        {openInvoices.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 34 }}><Text style={{ color: COLORS.text.sub, fontWeight: '700' }}>Alle Posten beglichen</Text></Card>
        ) : (
          openInvoices.map((s) => (
            <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${COLORS.warning}20`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: COLORS.warning, fontWeight: '900' }}>{s.first_name[0] || '?'}{s.last_name[0] || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800' }}>{s.first_name} {s.last_name}</Text>
                <Text style={{ color: COLORS.text.sub, marginTop: 3 }}>Klasse {s.license_class} · Stufe {s.next_stage_day}</Text>
              </View>
              <Text style={{ color: COLORS.warning, fontSize: 18, fontWeight: '900' }}>{s.openAmount} €</Text>
            </Card>
          ))
        )}
      </ScrollView>

      {/* SETUP / PREISAUSHANG MODAL */}
      <Modal visible={showSettings} onClose={() => setShowSettings(false)} title="Preisaushang (§ 32 FahrlG)">
        <ScrollView style={{ gap: 14, maxHeight: 400 }}>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800', fontSize: 14 }}>Grundbetrag (Anmeldung & Theorie)</Text>
            <Input value={baseAmount} onChangeText={setBaseAmount} keyboardType="numeric" placeholder="350" />
          </View>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800', fontSize: 14 }}>Übungsstunde (Normalfahrstunde 45m)</Text>
            <Input value={normalLesson} onChangeText={setNormalLesson} keyboardType="numeric" placeholder="65" />
          </View>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800', fontSize: 14 }}>Sonderfahrt (ÜL / AB / Nacht 45m)</Text>
            <Input value={specialLesson} onChangeText={setSpecialLesson} keyboardType="numeric" placeholder="75" />
          </View>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800', fontSize: 14 }}>Vorstellung zur Theorieprüfung</Text>
            <Input value={theoryExam} onChangeText={setTheoryExam} keyboardType="numeric" placeholder="50" />
          </View>
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800', fontSize: 14 }}>Vorstellung zur praktischen Prüfung</Text>
            <Input value={practicalExam} onChangeText={setPracticalExam} keyboardType="numeric" placeholder="150" />
          </View>
          <Button onPress={handleSaveSettings} disabled={savePricingMutation.isPending}>
            {savePricingMutation.isPending ? 'Speichern...' : 'Preise speichern & aushängen'}
          </Button>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack, action }: { title: string; subtitle: string; onBack: () => void; action?: React.ReactNode }) {
  const { isDark } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}>
      <TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{title}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{subtitle}</Text></View>
      {action}
    </View>
  );
}

function MiniStat({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', backgroundColor: `${color}10` }}>
      {icon}
      <Text style={{ fontSize: 20, fontWeight: '900', color, marginTop: 10 }}>{value}</Text>
      <Text style={{ color, fontWeight: '800', fontSize: 11, marginTop: 4 }}>{title}</Text>
    </Card>
  );
}
