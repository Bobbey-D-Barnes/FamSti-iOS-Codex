// 404 Not Found Screen
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, AlertTriangle } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F7FC' }}>
      <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
        <AlertTriangle size={36} color="#F59E0B" />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1625', marginBottom: 8 }}>Seite nicht gefunden</Text>
      <Text style={{ fontSize: 14, color: '#6E6A85', textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
        Diese Seite existiert nicht. Zurück zum Dashboard?
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/')}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
          backgroundColor: '#6C5CE7',
        }}
      >
        <Home size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Zum Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
