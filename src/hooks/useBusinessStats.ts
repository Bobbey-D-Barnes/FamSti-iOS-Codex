import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/storage';
import { buildBusinessStats, DEFAULT_PRICING } from '../lib/businessStats';
import { DEFAULT_RULES } from '../constants';

export function useBusinessStats() {
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: db.getStudents });
  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: db.getSessions });
  const pricingQuery = useQuery({ queryKey: ['pricing'], queryFn: db.getPricing });
  const rulesQuery = useQuery({ queryKey: ['rules'], queryFn: db.getRules });

  const stats = useMemo(
    () =>
      buildBusinessStats(
        studentsQuery.data || [],
        sessionsQuery.data || [],
        pricingQuery.data || DEFAULT_PRICING,
        rulesQuery.data || DEFAULT_RULES
      ),
    [studentsQuery.data, sessionsQuery.data, pricingQuery.data, rulesQuery.data]
  );

  return {
    stats,
    students: studentsQuery.data || [],
    sessions: sessionsQuery.data || [],
    pricing: pricingQuery.data || DEFAULT_PRICING,
    rules: rulesQuery.data || DEFAULT_RULES,
    isLoading: studentsQuery.isLoading || sessionsQuery.isLoading || pricingQuery.isLoading || rulesQuery.isLoading,
  };
}
