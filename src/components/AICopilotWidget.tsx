import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { 
  AlertCircle, Brain, BookOpen, CalendarPlus, Check, Eye, Mic, Navigation, Send, Sparkles, X, XCircle,
  Calendar, Users, Car, Coins, Scale, Sliders, Settings,
  UserPlus, Clock, Moon, Compass, Sun, AlertTriangle, UserX, 
  Award, FileText, ZapOff, Hourglass, Cake, GitCommit, Target, 
  Map, RefreshCw, Layers, CheckCircle, Smile, MessageCircle, 
  MessageSquare, Wrench, Gauge, Disc, DollarSign, Book, HelpCircle, Megaphone, 
  Star, FolderHeart, FileBarChart, ListTodo, ClipboardList, 
  ShieldAlert, Play, FolderArchive, BellPlus, BrainCircuit, ToggleLeft, UserCog, 
  Globe, CloudSun, Filter, Info, Share2, MapPin, Search, TrendingUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgent } from '../agent/AgentProvider';
import { getAgentOperationLabel } from '../agent/tools';
import { AgentOperation, AgentProactiveInsight } from '../agent/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { COLORS } from './ui';
import { QUICK_ACTIONS_CATEGORIES } from '../agent/quickActionsData';

const getIconComponent = (name: string, size = 16, color = '#A78BFA') => {
  switch (name) {
    case 'Calendar': return <Calendar size={size} color={color} />;
    case 'Users': return <Users size={size} color={color} />;
    case 'Car': return <Car size={size} color={color} />;
    case 'Coins': return <Coins size={size} color={color} />;
    case 'Scale': return <Scale size={size} color={color} />;
    case 'Sliders': return <Sliders size={size} color={color} />;
    case 'Settings': return <Settings size={size} color={color} />;
    case 'ClipboardText': return <BookOpen size={size} color={color} />;
    case 'CheckSquare': return <CheckCircle size={size} color={color} />;
    case 'CalendarDays': return <Calendar size={size} color={color} />;
    case 'Search': return <Search size={size} color={color} />;
    case 'UserPlus': return <UserPlus size={size} color={color} />;
    case 'Clock': return <Clock size={size} color={color} />;
    case 'Moon': return <Moon size={size} color={color} />;
    case 'Milestone': return <Compass size={size} color={color} />;
    case 'Compass': return <Compass size={size} color={color} />;
    case 'Sun': return <Sun size={size} color={color} />;
    case 'AlertTriangle': return <AlertTriangle size={size} color={color} />;
    case 'UserX': return <UserX size={size} color={color} />;
    case 'FileX': return <FileText size={size} color={color} />;
    case 'TrendingUp': return <TrendingUp size={size} color={color} />;
    case 'Check': return <Check size={size} color={color} />;
    case 'AlertCircle': return <AlertCircle size={size} color={color} />;
    case 'Award': return <Award size={size} color={color} />;
    case 'FileText': return <FileText size={size} color={color} />;
    case 'ZapOff': return <ZapOff size={size} color={color} />;
    case 'Hourglass': return <Hourglass size={size} color={color} />;
    case 'Cake': return <Cake size={size} color={color} />;
    case 'GitCommit': return <GitCommit size={size} color={color} />;
    case 'Target': return <Target size={size} color={color} />;
    case 'Map': return <Map size={size} color={color} />;
    case 'BookOpen': return <BookOpen size={size} color={color} />;
    case 'RefreshCw': return <RefreshCw size={size} color={color} />;
    case 'Layers': return <Layers size={size} color={color} />;
    case 'CheckCircle': return <CheckCircle size={size} color={color} />;
    case 'Smile': return <Smile size={size} color={color} />;
    case 'MessageCircle': return <MessageCircle size={size} color={color} />;
    case 'MessageSquare': return <MessageSquare size={size} color={color} />;
    case 'Wrench': return <Wrench size={size} color={color} />;
    case 'Gauge': return <Gauge size={size} color={color} />;
    case 'Disc': return <Disc size={size} color={color} />;
    case 'DollarSign': return <DollarSign size={size} color={color} />;
    case 'Book': return <Book size={size} color={color} />;
    case 'HelpCircle': return <HelpCircle size={size} color={color} />;
    case 'Megaphone': return <Megaphone size={size} color={color} />;
    case 'Star': return <Star size={size} color={color} />;
    case 'FolderHeart': return <FolderHeart size={size} color={color} />;
    case 'FileBarChart': return <FileBarChart size={size} color={color} />;
    case 'FileSignature': return <FileText size={size} color={color} />;
    case 'ListTodo': return <ListTodo size={size} color={color} />;
    case 'ClipboardList': return <ClipboardList size={size} color={color} />;
    case 'ShieldAlert': return <ShieldAlert size={size} color={color} />;
    case 'Play': return <Play size={size} color={color} />;
    case 'FolderArchive': return <FolderArchive size={size} color={color} />;
    case 'BellPlus': return <BellPlus size={size} color={color} />;
    case 'BrainCircuit': return <BrainCircuit size={size} color={color} />;
    case 'ToggleLeft': return <ToggleLeft size={size} color={color} />;
    case 'UserCog': return <UserCog size={size} color={color} />;
    case 'Mic': return <Mic size={size} color={color} />;
    case 'MessageSquareText': return <MessageSquare size={size} color={color} />;
    case 'Globe': return <Globe size={size} color={color} />;
    case 'CloudSun': return <CloudSun size={size} color={color} />;
    case 'Filter': return <Filter size={size} color={color} />;
    case 'Info': return <Info size={size} color={color} />;
    case 'Share2': return <Share2 size={size} color={color} />;
    case 'MapPin': return <MapPin size={size} color={color} />;
    default: return <Sparkles size={size} color={color} />;
  }
};

export function AICopilotWidget() {
  const pathname = usePathname();
  const { isDark, colors } = useAppTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    open,
    setOpen,
    input,
    setInput,
    messages,
    loading,
    pendingOperations,
    setPendingOperations,
    proactiveInsights,
    memoryCount,
    profileFactCount,
    knowledgeCount,
    notice,
    sendMessage,
    confirmOperation,
    rejectOperation,
    handleInsightAction,
    dismissInsight,
    recordingState,
    isRecording,
    handleMicPress,
  } = useAgent();

  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Auto-hide insights when modal is closed
  useEffect(() => {
    if (!open) {
      setShowInsights(false);
      setShowActionsPanel(false);
      setSearchQuery('');
    }
  }, [open]);

  const [showActionsPanel, setShowActionsPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    calendar: true, // expand calendar by default
  });

  // Auto-hide insights after 5 minutes of inactivity
  useEffect(() => {
    if (!showInsights) return;
    const timer = setTimeout(() => {
      setShowInsights(false);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearTimeout(timer);
  }, [showInsights]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages, pendingOperations, loading, showInsights, open]);

  const pulse = useRef(new Animated.Value(1)).current;
  const loadingPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (loading) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulse, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(loadingPulse, { toValue: 0.4, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      anim.start();
    } else {
      loadingPulse.setValue(0.4);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [loading]);

  return (
    <>
      <Animated.View style={[styles.fab, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="FamSti Agent öffnen"
          activeOpacity={0.84}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setOpen(true);
          }}
          style={styles.fabButton}
        >
          <LinearGradient colors={['#8B5CF6', COLORS.primary]} style={styles.fabGradient}>
            <Brain size={24} color="#FFFFFF" />
          </LinearGradient>
          {proactiveInsights.length > 0 && (
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{proactiveInsights.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={Platform.OS === 'ios' ? 70 : 95} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={[styles.sheet, { backgroundColor: isDark ? 'rgba(15,13,26,0.96)' : 'rgba(248,247,252,0.96)' }]}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.headerIcon}>
                  <Sparkles size={19} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.title, { color: colors.text }]}>FamSti Agent</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={12} color={COLORS.primary} />
                    <Text style={styles.subtitle}>{memoryCount} Memory · {profileFactCount} Profil · {knowledgeCount} Wissen</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity accessibilityLabel="Agent schließen" onPress={() => setOpen(false)} style={styles.close}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {!!notice && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            )}

            {!showActionsPanel && (
              <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {proactiveInsights.length > 0 && (
                    <QuickAction
                      isActive={showInsights}
                      icon={<Sparkles size={14} color={showInsights ? '#A78BFA' : COLORS.primary} />}
                      label={showInsights ? "Hinweise ausblenden" : `💡 ${proactiveInsights.length} Hinweis${proactiveInsights.length === 1 ? '' : 'e'}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowInsights(!showInsights);
                      }}
                    />
                  )}
                  <QuickAction
                    isActive={showActionsPanel}
                    icon={<Sliders size={14} color={showActionsPanel ? '#A78BFA' : COLORS.primary} />}
                    label="⚡ Mehr Aktionen"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowActionsPanel(!showActionsPanel);
                      setShowInsights(false);
                    }}
                  />
                  <QuickAction icon={<Navigation size={14} color={COLORS.primary} />} label="Planer öffnen" onPress={() => sendMessage('Öffne den Planer')} />
                  <QuickAction icon={<CalendarPlus size={14} color={COLORS.primary} />} label="Terminidee" onPress={() => sendMessage('Welche Schüler sollte ich als nächstes einplanen?')} />
                  <QuickAction icon={<BookOpen size={14} color={COLORS.primary} />} label="Prüfungscheck" onPress={() => sendMessage('Welche Schüler sind prüfungsnah?')} />
                </ScrollView>
              </View>
            )}
            {showActionsPanel ? (
              <View style={{ flex: 1, paddingBottom: 8 }}>
                {/* Search Bar */}
                <View style={{ paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                    <Search size={16} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Aktion suchen..."
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                      style={{
                        flex: 1,
                        marginLeft: 8,
                        color: colors.text,
                        fontSize: 14,
                        padding: 0,
                      }}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={16} color={colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowActionsPanel(false)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Zurück</Text>
                  </TouchableOpacity>
                </View>

                {searchQuery ? (
                  /* Filtered Actions flat list */
                  <ScrollView style={{ flex: 1, paddingHorizontal: 18 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
                      SUCHERGEBNISSE ({
                        QUICK_ACTIONS_CATEGORIES.flatMap(cat => cat.items).filter(item =>
                          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length
                      })
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {QUICK_ACTIONS_CATEGORIES.flatMap(cat => cat.items)
                        .filter(item =>
                          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(item => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setShowActionsPanel(false);
                              sendMessage(item.prompt);
                            }}
                            style={{
                              width: '48%',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            }}
                          >
                            {getIconComponent(item.icon, 14, isDark ? '#A78BFA' : COLORS.primary)}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={2}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        ))
                      }
                      {QUICK_ACTIONS_CATEGORIES.flatMap(cat => cat.items).filter(item =>
                        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <View style={{ width: '100%', alignItems: 'center', paddingVertical: 32 }}>
                          <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 13 }}>
                            Keine passenden Aktionen gefunden.
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                ) : (
                  /* Categorized accordions list */
                  <ScrollView style={{ flex: 1, paddingHorizontal: 18 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    {QUICK_ACTIONS_CATEGORIES.map(category => {
                      const isExpanded = !!expandedCategories[category.id];
                      return (
                        <View key={category.id} style={{
                          marginBottom: 8,
                          borderRadius: 14,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          overflow: 'hidden'
                        }}>
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setExpandedCategories(prev => ({
                                ...prev,
                                [category.id]: !prev[category.id]
                              }));
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 14,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {getIconComponent(category.icon, 18, isDark ? '#A78BFA' : COLORS.primary)}
                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                                {category.name}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                              {isExpanded ? 'Einklappen ▲' : `Anzeigen (${category.items.length}) ▼`}
                            </Text>
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {category.items.map(item => (
                                <TouchableOpacity
                                  key={item.id}
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowActionsPanel(false);
                                    sendMessage(item.prompt);
                                  }}
                                  style={{
                                    width: '48%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 10,
                                    borderRadius: 10,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                  }}
                                >
                                  {getIconComponent(item.icon, 14, isDark ? '#A78BFA' : COLORS.primary)}
                                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={2}>
                                    {item.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ) : (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.chat}
                  contentContainerStyle={{ gap: 12, paddingBottom: 18 }}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    return (
                      <View key={message.id} style={[styles.messageRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
                        <View
                          style={[
                            styles.bubble,
                            {
                              backgroundColor: isUser ? COLORS.primary : isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
                              borderBottomRightRadius: isUser ? 5 : 18,
                              borderBottomLeftRadius: isUser ? 18 : 5,
                              borderWidth: isUser ? 0 : 1,
                              borderColor: isUser ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            },
                          ]}
                        >
                          {message.isVoice && <Text style={styles.voiceLabel}>Spracheingabe</Text>}
                          <Text style={{ color: isUser ? '#FFFFFF' : colors.text, fontWeight: '600', lineHeight: 20 }}>{message.text}</Text>
                          {!isUser && message.webSources && message.webSources.length > 0 && (
                            <View style={styles.sourcesBox}>
                              <Text style={styles.sourcesTitle}>Quellen</Text>
                              {message.webSources.map((source) => (
                                <TouchableOpacity key={source.url} onPress={() => Linking.openURL(source.url)} style={styles.sourceLink}>
                                  <Text style={styles.sourceText} numberOfLines={1}>{source.title}</Text>
                                  <Text style={styles.sourceDomain} numberOfLines={1}>{source.domain || source.url}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {pendingOperations.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <Text style={[styles.pendingTitle, { color: colors.text }]}>Aktionen zur Bestätigung</Text>
                      {pendingOperations.length > 1 && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => sendMessage('Okay, führe alle vorbereiteten Aktionen aus.')}
                            style={[styles.bulkActionButton, { backgroundColor: COLORS.primary }]}
                          >
                            <Text style={styles.bulkActionText}>Alle ausführen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setPendingOperations([])}
                            style={[styles.bulkActionButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2' }]}
                          >
                            <Text style={[styles.bulkActionText, { color: '#EF4444' }]}>Alle verwerfen</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {pendingOperations.map((operation) => (
                        <OperationCard
                          key={operation.id}
                          operation={operation}
                          onConfirm={() => confirmOperation(operation)}
                          onReject={() => rejectOperation(operation)}
                        />
                      ))}
                    </View>
                  )}

                  {showInsights && proactiveInsights.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <Text style={[styles.pendingTitle, { color: colors.text }]}>Proaktive Hinweise</Text>
                      {proactiveInsights.map((insight) => (
                        <InsightCard
                          key={insight.id}
                          insight={insight}
                          onAction={() => handleInsightAction(insight)}
                          onDismiss={() => dismissInsight(insight)}
                        />
                      ))}
                    </View>
                  )}

                  {loading && (
                    <Animated.View style={[styles.bubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF', alignSelf: 'flex-start', opacity: loadingPulse, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Brain size={14} color={COLORS.primary} />
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Copilot denkt nach...</Text>
                      </View>
                    </Animated.View>
                  )}
                </ScrollView>

                <View style={[
                  styles.footer,
                  {
                    borderTopColor: colors.border,
                    paddingBottom: keyboardVisible ? 12 : (Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16)
                  }
                ]}>
                  <TouchableOpacity
                    accessibilityLabel={isRecording ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
                    disabled={recordingState !== 'idle' && recordingState !== 'recording'}
                    onPress={handleMicPress}
                    style={[
                      styles.mic,
                      isRecording && { backgroundColor: '#EF4444' },
                    ]}
                  >
                    {isRecording ? (
                      <Animated.View style={{ opacity: loadingPulse }}>
                        <Mic size={20} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Mic size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    value={
                      recordingState === 'starting'
                        ? 'Aufnahme startet...'
                        : recordingState === 'recording'
                        ? 'Aufnahme läuft... Sprich jetzt...'
                        : recordingState === 'stopping' || recordingState === 'transcribing'
                        ? 'Transkribiere...'
                        : input
                    }
                    onChangeText={setInput}
                    onSubmitEditing={() => sendMessage(input)}
                    editable={recordingState === 'idle'}
                    placeholder={isRecording ? 'Aufnahme läuft... Sprich jetzt...' : 'Frag den Agenten...'}
                    placeholderTextColor={isRecording ? '#EF4444' : '#8E8E93'}
                    style={[
                      styles.input,
                      {
                        color: isRecording ? '#EF4444' : colors.text,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        fontStyle: isRecording ? 'italic' : 'normal',
                        fontWeight: isRecording ? 'bold' : 'normal',
                      },
                    ]}
                  />
                  <TouchableOpacity
                    accessibilityLabel="Nachricht senden"
                    disabled={!input.trim() || loading || recordingState !== 'idle'}
                    onPress={() => sendMessage(input)}
                    style={[styles.send, { opacity: input.trim() && !loading && recordingState === 'idle' ? 1 : 0.42 }]}
                  >
                    <Send size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </>
            )}
            </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
    </>
  );
}

function QuickAction({ 
  icon, 
  label, 
  onPress, 
  isActive = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onPress: () => void; 
  isActive?: boolean;
}) {
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: isActive 
          ? (isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)')
          : (isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
        borderWidth: 1,
        borderColor: isActive ? COLORS.primary : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
      }}
    >
      {icon}
      <Text style={{ 
        fontSize: 13, 
        fontWeight: '700', 
        color: isActive 
          ? COLORS.primary 
          : (isDark ? '#A78BFA' : COLORS.primary) 
      }}>{label}</Text>
    </TouchableOpacity>
  );
}

function OperationCard({
  operation,
  onConfirm,
  onReject,
}: {
  operation: AgentOperation;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { isDark, colors } = useAppTheme();
  const label = getAgentOperationLabel(operation);
  const isFollowupConfirmation = operation.type === 'CONFIRM_SESSION' && Boolean(operation.payload?.followup_id);

  return (
    <View
      style={[
        styles.operationCard,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: '#6E6A85', fontSize: 12, fontWeight: '500' }}>{operation.summary}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity
          onPress={onReject}
          style={[styles.operationButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]}
        >
          {isFollowupConfirmation ? <Clock size={18} color="#F59E0B" /> : <XCircle size={18} color="#EF4444" />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          style={[styles.operationButton, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' }]}
        >
          <Check size={18} color="#10B981" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InsightCard({
  insight,
  onAction,
  onDismiss,
}: {
  insight: AgentProactiveInsight;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const { isDark, colors } = useAppTheme();

  return (
    <View
      style={[
        styles.operationCard,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
        },
      ]}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{insight.title}</Text>
        <Text style={{ color: '#6E6A85', fontSize: 12, fontWeight: '500' }} numberOfLines={2}>{insight.body}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.operationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
        >
          <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
        {insight.suggestedOperations && insight.suggestedOperations.length > 0 && (
          <TouchableOpacity
            onPress={onAction}
            style={[styles.operationButton, { backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#EEF2FF' }]}
          >
            <Eye size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 9999,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'visible',
    position: 'relative',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  sheet: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 56 : 30,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#6E6A85',
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(142,142,147,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#EAF7F0',
  },
  noticeText: {
    color: '#107C41',
    fontWeight: '800',
  },
  chat: {
    flex: 1,
    paddingHorizontal: 18,
  },
  messageRow: {
    flexDirection: 'row',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  voiceLabel: {
    color: '#DDE8FF',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sourcesBox: {
    marginTop: 10,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(142,142,147,0.28)',
    paddingTop: 8,
  },
  sourcesTitle: {
    color: '#6E6A85',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sourceLink: {
    gap: 1,
  },
  sourceText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  sourceDomain: {
    color: '#6E6A85',
    fontWeight: '600',
    fontSize: 11,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  operationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  operationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bulkActionText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mic: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
