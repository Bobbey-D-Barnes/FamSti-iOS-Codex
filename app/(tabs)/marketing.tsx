// Marketing Screen – FamSti iOS
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Share2, Sparkles, Target, TrendingUp, Users } from 'lucide-react-native';
import { Badge, Card, COLORS, Input, Modal, Button } from '../../src/components/ui';

export default function MarketingScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [showLead, setShowLead] = React.useState(false);
  const [leadName, setLeadName] = React.useState('');
  const [leadInterest, setLeadInterest] = React.useState('Klasse B');
  const leads = [
    { source: 'Google', value: 42 },
    { source: 'Empfehlung', value: 31 },
    { source: 'Instagram', value: 18 },
    { source: 'Website', value: 9 },
  ];
  const waitlist = [
    { name: 'Jonas Richter', interest: 'Klasse B', date: 'Vor 2 Tagen' },
    { name: 'Mia Weber', interest: 'Klasse B197', date: 'Vor 5 Tagen' },
    { name: 'Lukas Meyer', interest: 'Klasse A2', date: 'Vor 1 Woche' },
  ];
  const conversionRate = 68;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 14 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light, justifyContent: 'center', alignItems: 'center' }}><ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={{ fontSize: 32, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Marketing</Text><Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>Wachstum & Neukunden</Text></View>
        <TouchableOpacity accessibilityLabel="Interessent erfassen" onPress={() => setShowLead(true)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center' }}><Plus size={24} color="#FFF" /></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }}>
        <View style={{ backgroundColor: '#EC4899', borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
            <View><Badge variant="glass">Conversion Rate</Badge><Text style={{ fontSize: 48, fontWeight: '900', color: '#FFF', marginTop: 8 }}>{conversionRate}%</Text></View>
            <Target size={36} color="#FFF" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Sparkles size={16} color="#FFF" /><Text style={{ color: 'rgba(255,255,255,0.86)', fontWeight: '800' }}>Exzellente Akquise</Text></View>
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Mini icon={<Users size={22} color={COLORS.primary} />} value="14" label="Anfragen" />
          <Mini icon={<TrendingUp size={22} color={COLORS.accent} />} value="+12%" label="Wachstum" />
        </View>

        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Lead-Quellen</Text>
        <Card style={{ gap: 18 }}>
          {leads.map((lead) => (
            <View key={lead.source} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Share2 size={16} color="#EC4899" /><Text style={{ flex: 1, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '800' }}>{lead.source}</Text><Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900' }}>{lead.value}%</Text></View>
              <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}><View style={{ height: '100%', width: `${lead.value}%`, backgroundColor: '#EC4899' }} /></View>
            </View>
          ))}
        </Card>

        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Warteliste</Text>
        {waitlist.map((lead) => (
          <Card key={lead.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#EC489920', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#EC4899', fontWeight: '900' }}>{lead.name[0]}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900' }}>{lead.name}</Text><Text style={{ color: COLORS.text.sub, marginTop: 3 }}>{lead.interest}</Text></View>
            <Text style={{ color: COLORS.text.sub, fontWeight: '700' }}>{lead.date}</Text>
          </Card>
        ))}
      </ScrollView>
      <Modal visible={showLead} onClose={() => setShowLead(false)} title="Interessent erfassen">
        <View style={{ gap: 12 }}>
          <Input value={leadName} onChangeText={setLeadName} placeholder="Name" />
          <Input value={leadInterest} onChangeText={setLeadInterest} placeholder="Interesse / Klasse" />
          <Button onPress={() => {
            if (!leadName.trim()) {
              Alert.alert('Name fehlt', 'Bitte gib einen Namen ein.');
              return;
            }
            Alert.alert('Interessent notiert', `${leadName.trim()} wurde für ${leadInterest.trim() || 'eine Beratung'} vorgemerkt.`);
            setLeadName('');
            setLeadInterest('Klasse B');
            setShowLead(false);
          }}>
            Speichern
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const isDark = useColorScheme() === 'dark';
  return <Card style={{ flex: 1, alignItems: 'center' }}>{icon}<Text style={{ fontSize: 26, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900', marginTop: 8 }}>{value}</Text><Text style={{ color: COLORS.text.sub, fontWeight: '800' }}>{label}</Text></Card>;
}
