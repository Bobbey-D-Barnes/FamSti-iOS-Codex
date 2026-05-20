// Root Layout – FamSti iOS App
// Sets up providers: QueryClient, Theme, SafeArea, Notifications

import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService } from '../src/lib/notifications';
import { AICopilotWidget } from '../src/components/AICopilotWidget';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { AgentProvider } from '../src/agent/AgentProvider';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // Initialize notification service
  useEffect(() => {
    NotificationService.init();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Run checks immediately when app comes to foreground
        NotificationService.checkProactiveInsightsNotifications();
        NotificationService.checkSessionFollowups();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      NotificationService.stop();
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AgentProvider>
          <AppErrorBoundary>
            <RootStack />
          </AppErrorBoundary>
        </AgentProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? '#0F0D1A' : '#F8F7FC',
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="schueler/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="session/live"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="suche"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="einstellungen/provider"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/agent"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/darstellung"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/widgets"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/schnellzugriff"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/arbeitszeiten"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/regeln"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/pipeline"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/benachrichtigungen"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/profil"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/klassen"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/pruefung"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/datenschutz"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/fortbildung"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/diagnose"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/sprache"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/daten"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/fahrzeug"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/kalender"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="einstellungen/ueber"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <AICopilotWidget />
    </>
  );
}
