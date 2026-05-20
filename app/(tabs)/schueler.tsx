// Schüler-Liste Screen – FamSti iOS

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, Linking, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, ChevronRight, Camera, Database, Trash2, Phone, MessageCircle, Glasses, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../src/lib/storage';
import { ZoneBadge, Badge, LoadingSpinner } from '../../src/components/ui';
import { getPipelineProgress, toISODate } from '../../src/lib/utils';
import { DEFAULT_RULES } from '../../src/constants';
import { geminiService } from '../../src/services/geminiService';
import { Student, ZoneType } from '../../src/types';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function SchuelerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const { data: students, isLoading } = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });

  const rules = rulesData || DEFAULT_RULES;
  const pipeline = rules.pipeline;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['students'] });
    setRefreshing(false);
  };

  const filteredStudents = useMemo(() => {
    let list = students || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }
    if (selectedZone) {
      list = list.filter((s) => s.zone === selectedZone);
    }
    return list.sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [students, searchQuery, selectedZone]);

  const activeCount = filteredStudents.filter((s) => !s.practical_exam_at).length;
  const finishedCount = filteredStudents.filter((s) => s.practical_exam_at).length;

  if (isLoading) return <LoadingSpinner />;

  const zones = ['Rosenheim', 'Haidholzen', 'Prutting'];

  const invalidateStudents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const loadDemo = async () => {
    await db.loadExtraDemoStudents();
    await invalidateStudents();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeDemo = async () => {
    await db.removeExtraDemoStudents();
    await invalidateStudents();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const pickAndScan = async (source: 'camera' | 'library') => {
    try {
      setIsScanning(true);
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Berechtigung fehlt', source === 'camera' ? 'Kamera-Zugriff wurde nicht erlaubt.' : 'Foto-Zugriff wurde nicht erlaubt.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.72, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.72, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) return;
      const extracted = await geminiService.extractStudentFromImage(base64, asset.mimeType || 'image/jpeg');
      const id = uuidv4();
      const scannedStudent: Student = {
        id,
        first_name: extracted.first_name,
        last_name: extracted.last_name,
        zone: extracted.zone as ZoneType,
        pickup_address: extracted.pickup_address,
        phone: extracted.phone,
        email: extracted.email,
        birth_date: '2007-01-01',
        license_class: 'B',
        previous_class: 'Keine',
        needs_vision_aid: false,
        preferred_channel: 'whatsapp',
        next_stage_day: extracted.next_stage_day,
        max_sessions_per_week: 2,
        application_date: toISODate(new Date()),
        application_approval_date: null,
        theory_passed_at: null,
        practical_exam_at: null,
        notes: extracted.notes,
        has_picture: false,
        has_vision_test: false,
        has_first_aid: false,
        has_application_submitted: false,
        availabilities: extracted.availabilities.map((a) => ({ ...a, id: uuidv4() })),
        training_progress: {},
      };
      await db.saveStudent(scannedStudent);
      await invalidateStudents();
      router.push(`/schueler/${id}` as any);
    } catch (error) {
      Alert.alert('Scan fehlgeschlagen', error instanceof Error ? error.message : 'Das Dokument konnte nicht gelesen werden.');
    } finally {
      setIsScanning(false);
    }
  };

  const openScanMenu = () => {
    Alert.alert('Dokument scannen', 'Quelle auswählen', [
      { text: 'Kamera', onPress: () => pickAndScan('camera') },
      { text: 'Galerie', onPress: () => pickAndScan('library') },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const renderStudent = ({ item }: { item: Student }) => {
    const progress = getPipelineProgress(pipeline, item.next_stage_day);
    const isFinished = !!item.practical_exam_at;
    const missingDocs = [!item.has_application_submitted && 'Antrag', !item.has_picture && 'Bild', !item.has_vision_test && 'Sehtest', !item.has_first_aid && 'Erste Hilfe'].filter(Boolean);

    // Calculate dates & age
    const today = new Date();
    const isApplicationExpired = item.application_date && (() => {
      const exp = new Date(item.application_date);
      exp.setDate(exp.getDate() + 365);
      return exp.getTime() < today.getTime();
    })();

    const isApplicationExpiringSoon = item.application_date && !isApplicationExpired && (() => {
      const exp = new Date(item.application_date);
      exp.setDate(exp.getDate() + 365);
      const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft < 30;
    })();

    const age = item.birth_date ? (() => {
      const birth = new Date(item.birth_date);
      return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    })() : undefined;

    const ageWarning = item.license_class?.toUpperCase() === 'B' && typeof age === 'number' && age < 17;
    const isSigned = !!(item.student_signature && item.instructor_signature);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/schueler/${item.id}` as any);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 20,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
          borderWidth: 0.5,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          gap: 12,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: isFinished
              ? isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5'
              : isDark ? 'rgba(108,92,231,0.2)' : '#E9E5FF',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: isFinished ? '#10B981' : '#6C5CE7' }}>
            {item.first_name.charAt(0)}{item.last_name.charAt(0)}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#F0EEF6' : '#1A1625' }}>
            {item.first_name} {item.last_name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <ZoneBadge zone={item.zone} />
            <Text style={{ fontSize: 12, color: '#6E6A85' }}>
              {isFinished ? '✓ Bestanden' : `Tag ${item.next_stage_day} • ${progress}%`}
            </Text>
            {item.theory_passed_at && <BookOpen size={13} color="#F59E0B" />}
            {item.needs_vision_aid && <Glasses size={13} color="#6E6A85" />}
            {isSigned && (
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                ✓ Signiert
              </Text>
            )}
            {isApplicationExpired && (
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                Antrag abgelaufen!
              </Text>
            )}
            {isApplicationExpiringSoon && (
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                Antrag läuft ab!
              </Text>
            )}
            {ageWarning && (
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                Alter beachten!
              </Text>
            )}
          </View>
          {missingDocs.length > 0 && (
            <Text style={{ fontSize: 11, color: '#F97316', marginTop: 4 }} numberOfLines={1}>
              Fehlt: {missingDocs.join(', ')}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!!item.phone && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }} style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5', justifyContent: 'center', alignItems: 'center' }}>
                <Phone size={14} color="#10B981" />
              </TouchableOpacity>
            )}
            {!!item.phone && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); Linking.openURL(`sms:${item.phone}`); }} style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: isDark ? 'rgba(79,138,230,0.16)' : '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                <MessageCircle size={14} color="#4F8AE6" />
              </TouchableOpacity>
            )}
          </View>
        {!isFinished && (
          <View style={{ width: 46, alignItems: 'flex-end', gap: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(108,92,231,0.2)' : '#E9E5FF' }}>
              <View style={{ width: `${progress}%` as any, height: 4, borderRadius: 2, backgroundColor: '#6C5CE7' }} />
            </View>
          </View>
        )}
        </View>

        <ChevronRight size={16} color="#C4C1D4" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>Schüler</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={openScanMenu} disabled={isScanning} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
              {isScanning ? <ActivityIndicator size="small" color="#6C5CE7" /> : <Camera size={18} color="#6C5CE7" strokeWidth={2.5} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/schueler/neu' as any);
              }}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity onPress={loadDemo} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isDark ? 'rgba(79,138,230,0.12)' : '#EFF6FF' }}>
            <Database size={14} color="#4F8AE6" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F8AE6' }}>Demo laden</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Demo-Schüler entfernen?', 'Alle Schüler mit Demo-ID werden entfernt.', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Entfernen', style: 'destructive', onPress: removeDemo }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2' }}>
            <Trash2 size={14} color="#EF4444" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Demo weg</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, color: '#6E6A85', fontWeight: '600' }}>{activeCount} aktiv • {finishedCount} fertig</Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
            borderRadius: 14,
            paddingHorizontal: 14,
            marginTop: 12,
            borderWidth: 0.5,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            gap: 8,
          }}
        >
          <Search size={18} color="#6E6A85" />
          <TextInput
            placeholder="Schüler suchen..."
            placeholderTextColor="#6E6A85"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: isDark ? '#F0EEF6' : '#1A1625',
            }}
          />
        </View>

        {/* Zone Filter */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => setSelectedZone(null)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: !selectedZone ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: !selectedZone ? '#FFFFFF' : '#6E6A85' }}>
              Alle ({filteredStudents.length})
            </Text>
          </TouchableOpacity>
          {zones.map((zone) => (
            <TouchableOpacity
              key={zone}
              onPress={() => setSelectedZone(selectedZone === zone ? null : zone)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: selectedZone === zone ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: selectedZone === zone ? '#FFFFFF' : '#6E6A85' }}>
                {zone}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student List */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#F0EEF6' : '#1A1625' }}>{searchQuery ? 'Keine Treffer' : 'Keine Schüler'}</Text>
            <Text style={{ marginTop: 6, color: '#6E6A85', textAlign: 'center' }}>Lege einen Schüler an oder scanne einen Ausbildungsvertrag.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
