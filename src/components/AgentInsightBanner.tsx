import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertTriangle, Calendar, Car, FileText, X, ArrowRight, MessageSquare } from 'lucide-react-native';
import { useAgent } from '../agent/AgentProvider';
import { useAppTheme } from '../hooks/useAppTheme';
import { AgentProactiveInsight } from '../agent/types';

export function AgentInsightBanner() {
  const { proactiveInsights, handleInsightAction, dismissInsight } = useAgent();
  const { isDark } = useAppTheme();

  if (proactiveInsights.length === 0) return null;

  // Show the most urgent/first insight
  const insight = proactiveInsights[0];

  const getIcon = (type: AgentProactiveInsight['type']) => {
    const size = 20;
    const color = '#8B5CF6'; // purple primary accent
    switch (type) {
      case 'sleeper':
        return <AlertTriangle size={size} color="#F59E0B" />; // amber warning
      case 'missing_docs':
        return <FileText size={size} color="#EF4444" />; // red danger
      case 'upcoming_exam':
        return <Calendar size={size} color="#10B981" />; // green info
      case 'expiring_application':
        return <FileText size={size} color="#F59E0B" />;
      case 'expiring_theory':
        return <FileText size={size} color="#EF4444" />;
      case 'planning_gap':
        return <Calendar size={size} color="#3B82F6" />; // blue info
      case 'vehicle_check':
        return <Car size={size} color="#EF4444" />;
      default:
        return <AlertTriangle size={size} color={color} />;
    }
  };

  const getActionLabel = (type: AgentProactiveInsight['type']) => {
    switch (type) {
      case 'sleeper':
      case 'missing_docs':
      case 'expiring_application':
      case 'expiring_theory':
        return 'WhatsApp senden';
      case 'planning_gap':
      case 'upcoming_exam':
        return 'Termine öffnen';
      case 'vehicle_check':
        return 'Fahrzeug verwalten';
      default:
        return 'Details';
    }
  };

  const containerBg = isDark ? 'rgba(23, 21, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const borderColor = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)';
  const textColor = isDark ? '#FFFFFF' : '#1F2937';
  const descColor = isDark ? '#A78BFA' : '#6B7280';

  const CardContent = (
    <View style={[styles.innerContainer, { borderColor }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>{getIcon(insight.type)}</View>
          <Text style={[styles.title, { color: textColor }]}>{insight.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => dismissInsight(insight)}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.description, { color: descColor }]}>{insight.body}</Text>

      {insight.suggestedOperations && insight.suggestedOperations.length > 0 && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleInsightAction(insight)}
          >
            <Text style={styles.actionText}>{getActionLabel(insight.type)}</Text>
            <ArrowRight size={14} color="#FFFFFF" style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.outerContainer}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={isDark ? 25 : 45} tint={isDark ? 'dark' : 'light'} style={[styles.blur, { backgroundColor: containerBg }]}>
          {CardContent}
        </BlurView>
      ) : (
        <View style={[styles.blur, { backgroundColor: containerBg }]}>
          {CardContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  blur: {
    borderRadius: 16,
  },
  innerContainer: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 30,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    marginLeft: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowIcon: {
    marginLeft: 6,
  },
});
