// Fahrzeug Screen – FamSti iOS
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Car, ChevronLeft, Fuel, Wrench, AlertTriangle, PenTool, Calendar, Gauge } from 'lucide-react-native';
import { Badge, Button, Card, COLORS, Input, Modal } from '../../src/components/ui';

export default function FahrzeugScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [mileage, setMileage] = useState('42500');
  const [fuelLevel, setFuelLevel] = useState(75);
  const [showDamage, setShowDamage] = useState(false);
  const [damageDesc, setDamageDesc] = useState('');

  const saveDamage = () => {
    if (!damageDesc.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Gespeichert', 'Der Schaden wurde dokumentiert.');
    setDamageDesc('');
    setShowDamage(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <Header title="Fahrzeug" subtitle="Zustand & Wartung" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, gap: 18 }}>
          <View style={{ backgroundColor: COLORS.warning, borderRadius: 28, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }}>
              <View>
                <Badge variant="glass">Hauptfahrzeug</Badge>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 10 }}>VW Golf 8 GTI</Text>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 16, fontWeight: '700' }}>M-FS 2024</Text>
              </View>
              <Car size={36} color="#FFF" />
            </View>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 20, padding: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Metric label="KM" value={`${Number(mileage || 0).toLocaleString('de-DE')} km`} />
                <Metric label="Tank" value={`${fuelLevel}%`} alignRight />
              </View>
              <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ width: `${fuelLevel}%`, height: '100%', backgroundColor: fuelLevel > 20 ? '#FFF' : COLORS.danger, borderRadius: 5 }} />
              </View>
            </View>
          </View>

          <Card style={{ gap: 14 }}>
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontSize: 18, fontWeight: '900' }}>Live-Werte</Text>
            <Input value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholder="Kilometerstand" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[25, 50, 75, 100].map((value) => (
                <TouchableOpacity key={value} onPress={() => setFuelLevel(value)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: fuelLevel === value ? COLORS.warning : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8' }}>
                  <Text style={{ color: fuelLevel === value ? '#FFF' : isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800' }}>{value}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Status icon={<Wrench size={22} color={COLORS.accent} />} title="Service" value="in 2.500 km" />
            <Status icon={<Calendar size={22} color={COLORS.primary} />} title="TÜV" value="07/2027" />
          </View>

          <Button variant="destructive" onPress={() => setShowDamage(true)}>
            <PenTool size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '800' }}>Schaden dokumentieren</Text>
          </Button>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }}>
            <Gauge size={20} color={COLORS.accent} />
            <Text style={{ flex: 1, color: COLORS.accent, fontWeight: '800' }}>Fahrzeug einsatzbereit</Text>
          </Card>
        </View>
      </ScrollView>

      <Modal visible={showDamage} onClose={() => setShowDamage(false)} title="Schaden dokumentieren">
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><AlertTriangle size={20} color={COLORS.warning} /><Text style={{ color: COLORS.text.sub, flex: 1 }}>Beschreibung wird lokal als Zustandsnotiz erfasst.</Text></View>
          <Input value={damageDesc} onChangeText={setDamageDesc} placeholder="Beschreibung..." multiline numberOfLines={4} />
          <Button onPress={saveDamage}>Speichern</Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const isDark = useColorScheme() === 'dark';
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}><TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity><View><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>{title}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{subtitle}</Text></View></View>;
}

function Metric({ label, value, alignRight }: { label: string; value: string; alignRight?: boolean }) {
  return <View style={{ alignItems: alignRight ? 'flex-end' : 'flex-start' }}><Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '800' }}>{label}</Text><Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 4 }}>{value}</Text></View>;
}

function Status({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  const isDark = useColorScheme() === 'dark';
  return <Card style={{ flex: 1, alignItems: 'center' }}>{icon}<Text style={{ color: COLORS.text.sub, marginTop: 8, fontWeight: '800' }}>{title}</Text><Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, marginTop: 4, fontWeight: '900' }}>{value}</Text></Card>;
}
