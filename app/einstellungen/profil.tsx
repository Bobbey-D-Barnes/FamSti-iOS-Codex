// Fahrschulprofil – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { Building2, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ProfilSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const r = rulesData || DEFAULT_RULES;
  const [name, setName] = useState(r.school_name || '');
  const [address, setAddress] = useState(r.school_address || '');
  const [phone, setPhone] = useState(r.school_phone || '');
  const [email, setEmail] = useState(r.school_email || '');
  const [logo, setLogo] = useState(r.school_logo_text || '');

  useEffect(() => { if (rulesData) { setName(rulesData.school_name || ''); setAddress(rulesData.school_address || ''); setPhone(rulesData.school_phone || ''); setEmail(rulesData.school_email || ''); setLogo(rulesData.school_logo_text || ''); } }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...r, school_name: name, school_address: address, school_phone: phone, school_email: email, school_logo_text: logo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Fahrschulprofil übernommen.'); },
  });

  const LI = ({ label, value, onChange, ph, kb }: { label: string; value: string; onChange: (v: string) => void; ph?: string; kb?: 'email-address' | 'phone-pad' }) => (
    <View style={{ gap: 6 }}><Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>{label}</Text><Input value={value} onChangeText={onChange} placeholder={ph} keyboardType={kb} /></View>
  );

  return (
    <SettingsLayout title="Fahrschulprofil" subtitle="Name, Anschrift & Kontakt" onSave={() => save.mutate()} saving={save.isPending}>
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: isDark ? 'rgba(108,92,231,0.08)' : '#F0EDFF', marginBottom: 16 }}>
        <Info size={18} color="#6C5CE7" />
        <Text style={{ flex: 1, color: '#6E6A85', fontSize: 12, lineHeight: 18 }}>Diese Daten werden für den Preisaushang (§ 32 FahrlG) und offizielle Dokumente verwendet.</Text>
      </View>
      <SettingsSection title="Kontaktdaten">
        <Card style={{ gap: 14 }}>
          <LI label="Fahrschulname" value={name} onChange={setName} ph="Fahrschule Müller" />
          <LI label="Anschrift" value={address} onChange={setAddress} ph="Musterstr. 1, 83022 Rosenheim" />
          <LI label="Telefon" value={phone} onChange={setPhone} ph="+49 170 1234567" kb="phone-pad" />
          <LI label="E-Mail" value={email} onChange={setEmail} ph="info@fahrschule.de" kb="email-address" />
        </Card>
      </SettingsSection>
      <SettingsSection title="Branding">
        <Card style={{ gap: 14 }}>
          <LI label="Logo-Text / Kürzel" value={logo} onChange={setLogo} ph="FM" />
          {logo ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{logo.substring(0, 3)}</Text>
              </View>
              <Text style={{ color: '#6E6A85', fontSize: 11, marginTop: 8 }}>Vorschau</Text>
            </View>
          ) : null}
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}
