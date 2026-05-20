import { useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/storage';
import { DEFAULT_RULES } from '../constants';

export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const { data: rules } = useQuery({
    queryKey: ['rules'],
    queryFn: db.getRules,
    staleTime: Infinity,
  });

  const mode = rules?.appearance_mode || DEFAULT_RULES.appearance_mode || 'system';
  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';

  return {
    isDark,
    mode,
    systemColorScheme,
    colors: {
      primary: '#6C5CE7',
      background: isDark ? '#0F0D1A' : '#F8F7FC',
      card: isDark ? '#1C1C1E' : '#FFFFFF',
      text: isDark ? '#F0EEF6' : '#1A1625',
      textSub: '#6E6A85',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      highlight: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
      success: '#10B981',
      error: '#EF4444',
    },
  };
}
