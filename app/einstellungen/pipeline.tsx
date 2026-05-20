// Ausbildungs-Pipeline – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection, SettingsToggle } from '../../src/components/SettingsLayout';
import { Card, Input, Button, Modal } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { PipelineStage } from '../../src/types';
import { Route, ArrowUp, ArrowDown, Pencil, Trash2, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function PipelineSettings() {
  const qc = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;
  const [pipeline, setPipeline] = useState<PipelineStage[]>([...rules.pipeline]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState({ day: '1', duration: '60', description: '', isNight: false, isHighway: false });

  useEffect(() => { if (rulesData) setPipeline([...rulesData.pipeline]); }, [rulesData]);

  const save = useMutation({
    mutationFn: () => db.saveRules({ ...rules, pipeline }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Pipeline übernommen.'); },
  });

  const openEdit = (i: number | null) => {
    if (i === null) { const nextDay = Math.max(0, ...pipeline.map(p => p.day)) + 1; setDraft({ day: String(nextDay), duration: '60', description: '', isNight: false, isHighway: false }); }
    else { const s = pipeline[i]; setDraft({ day: String(s.day), duration: String(s.duration), description: s.description, isNight: Boolean(s.isNight), isHighway: Boolean(s.isHighway) }); }
    setEditIdx(i); setModalOpen(true);
  };

  const saveDraft = () => {
    const stage: PipelineStage = { day: Math.max(1, Number(draft.day) || 1), duration: Math.max(15, Number(draft.duration) || 60), description: draft.description.trim() || 'Neue Stufe', isNight: draft.isNight, isHighway: draft.isHighway };
    setPipeline(prev => { const n = [...prev]; if (editIdx === null) n.push(stage); else n[editIdx] = stage; return n.sort((a, b) => a.day - b.day); });
    setModalOpen(false);
  };

  const moveStage = (i: number, dir: -1 | 1) => {
    setPipeline(prev => { const n = [...prev]; const t = i + dir; if (t < 0 || t >= n.length) return prev; [n[i], n[t]] = [n[t], n[i]]; return n.map((p, idx) => ({ ...p, day: idx + 1 })); });
  };

  const IB = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(108,92,231,0.09)', justifyContent: 'center', alignItems: 'center' }}>{children}</TouchableOpacity>
  );

  return (
    <SettingsLayout title="Pipeline" subtitle={`${pipeline.length} Ausbildungsstufen`} onSave={() => save.mutate()} saving={save.isPending}>
      <SettingsSection title="Stufen">
        <Card style={{ gap: 10 }}>
          {pipeline.map((stage, i) => (
            <View key={`${stage.day}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Route size={16} color="#6C5CE7" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800' }}>Tag {stage.day}: {stage.description}</Text>
                <Text style={{ color: '#6E6A85', fontSize: 12 }}>{stage.duration} Min.{stage.isNight ? ' · Nacht' : ''}{stage.isHighway ? ' · Autobahn' : ''}</Text>
              </View>
              <IB onPress={() => moveStage(i, -1)}><ArrowUp size={15} color="#6C5CE7" /></IB>
              <IB onPress={() => moveStage(i, 1)}><ArrowDown size={15} color="#6C5CE7" /></IB>
              <IB onPress={() => openEdit(i)}><Pencil size={15} color="#6C5CE7" /></IB>
              <IB onPress={() => setPipeline(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, day: idx + 1 })))}><Trash2 size={15} color="#EF4444" /></IB>
            </View>
          ))}
          <Button variant="outline" onPress={() => openEdit(null)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Plus size={16} color="#6C5CE7" /><Text style={{ color: '#6C5CE7', fontWeight: '700' }}>Stufe hinzufügen</Text></View>
          </Button>
        </Card>
      </SettingsSection>

      <Modal visible={modalOpen} onClose={() => setModalOpen(false)} title={editIdx === null ? 'Stufe hinzufügen' : 'Stufe bearbeiten'}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={draft.day} onChangeText={v => setDraft(p => ({ ...p, day: v }))} keyboardType="numeric" placeholder="Tag" style={{ width: 82 }} />
            <Input value={draft.duration} onChangeText={v => setDraft(p => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="Min." style={{ flex: 1 }} />
          </View>
          <Input value={draft.description} onChangeText={v => setDraft(p => ({ ...p, description: v }))} placeholder="Beschreibung" />
          <SettingsToggle label="Nachtfahrt" value={draft.isNight} onValueChange={v => setDraft(p => ({ ...p, isNight: v }))} isDark={isDark} />
          <SettingsToggle label="Autobahn/Überland" value={draft.isHighway} onValueChange={v => setDraft(p => ({ ...p, isHighway: v }))} isDark={isDark} />
          <Button onPress={saveDraft}><Text style={{ color: '#FFF', fontWeight: '700' }}>Übernehmen</Text></Button>
        </View>
      </Modal>
    </SettingsLayout>
  );
}
