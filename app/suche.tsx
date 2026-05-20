import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, Calendar, ChevronLeft, Search, User } from 'lucide-react-native';
import { db } from '../src/lib/storage';
import { Card, COLORS, LoadingSpinner } from '../src/components/ui';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { formatDate } from '../src/lib/utils';

type SearchResult = {
  id: string;
  type: 'student' | 'session' | 'reminder';
  title: string;
  subtitle: string;
  route: string;
  scoreText: string;
};

export default function GlobalSearchScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState('');

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const remindersQuery = useQuery({ queryKey: ['reminders'], queryFn: db.getReminders });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const studentResults: SearchResult[] = (studentsQuery.data || [])
      .filter((student) =>
        [
          student.first_name,
          student.last_name,
          student.phone,
          student.email,
          student.zone,
          student.license_class,
          student.pickup_address,
          student.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .map((student) => ({
        id: `student-${student.id}`,
        type: 'student',
        title: `${student.first_name} ${student.last_name}`,
        subtitle: `Stufe ${student.next_stage_day} · ${student.zone || 'keine Zone'} · ${student.phone || 'keine Telefonnummer'}`,
        route: `/schueler/${student.id}`,
        scoreText: 'Schüler',
      }));

    const sessionResults: SearchResult[] = (sessionsQuery.data || [])
      .filter((session) =>
        [session.student_name, session.date, session.start_time, session.end_time, session.zone, session.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .map((session) => ({
        id: `session-${session.id}`,
        type: 'session',
        title: session.student_name,
        subtitle: `${formatDate(session.date)} · ${session.start_time}-${session.end_time} · ${session.confirmed ? 'gebucht' : session.cancellation_reason ? 'storniert' : 'geplant'}`,
        route: '/termine',
        scoreText: 'Termin',
      }));

    const reminderResults: SearchResult[] = (remindersQuery.data || [])
      .filter((reminder) =>
        [reminder.title, reminder.description, reminder.due_date, reminder.type].filter(Boolean).join(' ').toLowerCase().includes(q)
      )
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: 'reminder',
        title: reminder.title,
        subtitle: `${formatDate(reminder.due_date.slice(0, 10))} · ${reminder.is_completed ? 'erledigt' : 'offen'}`,
        route: '/erinnerungen',
        scoreText: 'Erinnerung',
      }));

    return [...studentResults, ...sessionResults, ...reminderResults].slice(0, 40);
  }, [query, studentsQuery.data, sessionsQuery.data, remindersQuery.data]);

  const isLoading = studentsQuery.isLoading || sessionsQuery.isLoading || remindersQuery.isLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.background.dark : COLORS.background.light }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light }}
          >
            <ChevronLeft size={24} color={isDark ? COLORS.text.mainDark : COLORS.text.main} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: isDark ? COLORS.text.mainDark : COLORS.text.main }}>Suche</Text>
            <Text style={{ color: COLORS.text.sub, fontWeight: '600', marginTop: 2 }}>Schüler, Termine und Erinnerungen</Text>
          </View>
        </View>

        <View
          style={{
            minHeight: 54,
            borderRadius: 18,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <Search size={19} color={COLORS.text.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Name, Datum, Telefon, Zone..."
            placeholderTextColor={COLORS.text.sub}
            style={{ flex: 1, color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontSize: 16, fontWeight: '700' }}
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Card style={{ marginTop: 12, alignItems: 'center', gap: 10 }}>
            <Search size={28} color={COLORS.text.sub} />
            <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontWeight: '900', fontSize: 17 }}>
              {query.trim() ? 'Keine Treffer gefunden' : 'Wonach suchst du?'}
            </Text>
            <Text style={{ color: COLORS.text.sub, textAlign: 'center', lineHeight: 20 }}>
              Suche nach Schülernamen, Telefonnummern, Datum, Zone, Notizen oder Erinnerungen.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(item.route as never)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(108,92,231,0.16)' : '#F0EDFF' }}>
                {item.type === 'student' ? <User size={20} color={COLORS.primary} /> : item.type === 'session' ? <Calendar size={20} color={COLORS.primary} /> : <Bell size={20} color={COLORS.primary} />}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: isDark ? COLORS.text.mainDark : COLORS.text.main, fontSize: 16, fontWeight: '900' }}>{item.title}</Text>
                <Text style={{ color: COLORS.text.sub, fontWeight: '600' }}>{item.subtitle}</Text>
              </View>
              <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 12 }}>{item.scoreText}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
