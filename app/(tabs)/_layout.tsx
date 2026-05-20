// Tab Navigation Layout – FamSti iOS
// 7 tabs matching the full PWA navigation

import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  Bell,
  GraduationCap,
  Settings,
  PieChart,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function TabLayout() {
  const { isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? COLORS.text.subDark : COLORS.text.sub,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          position: 'absolute',
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={isDark ? 50 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? COLORS.card.dark : COLORS.background.light }]} />
          ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dash',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="schueler"
        options={{
          title: 'Schüler',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="planer"
        options={{
          title: 'Planer',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="termine"
        options={{
          title: 'Termine',
          tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="erinnerungen"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="pruefungen"
        options={{
          title: 'Prüfung',
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="cockpit"
        options={{
          title: 'Cockpit',
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{
          title: 'Setup',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen name="finanzen" options={{ href: null }} />
      <Tabs.Screen name="fahrzeug" options={{ href: null }} />
      <Tabs.Screen name="analytik" options={{ href: null }} />
      <Tabs.Screen name="behoerden" options={{ href: null }} />
      <Tabs.Screen name="marketing" options={{ href: null }} />
      <Tabs.Screen name="compliance" options={{ href: null }} />
    </Tabs>
  );
}
