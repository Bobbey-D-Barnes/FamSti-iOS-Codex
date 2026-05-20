// KI-Provider & Modell – Settings Sub-Page
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/lib/storage';
import { SettingsLayout, SettingsSection } from '../../src/components/SettingsLayout';
import { Card, Input } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { DEFAULT_RULES } from '../../src/constants';
import { rateLimitTracker } from '../../src/services/geminiService';
import { Brain, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const AI_PROVIDERS = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'openrouter', label: 'OpenRouter' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'ollama', label: 'Ollama' },
  { key: 'on_device', label: 'Lokal' },
] as const;
const GEMINI_MODELS = [
  { key: 'gemini-3.5-flash', label: '3.5 Flash' },
  { key: 'gemini-3.1-pro', label: '3.1 Pro' },
  { key: 'gemini-3.1-flash-lite', label: '3.1 Lite' },
  { key: 'gemini-2.5-flash', label: '2.5 Flash' },
  { key: 'gemini-2.0-flash', label: '2.0 Flash' },
  { key: 'gemini-1.5-flash', label: '1.5 Flash' },
  { key: 'custom', label: 'Eigener...' },
] as const;
const OPENROUTER_MODELS = [
  { key: 'google/gemini-3.5-flash', label: '3.5 Flash' },
  { key: 'google/gemini-2.5-flash:free', label: '2.5 Flash (Free)' },
  { key: 'meta-llama/llama-3-8b-instruct:free', label: 'Llama 3 (Free)' },
  { key: 'mistralai/mistral-7b-instruct:free', label: 'Mistral (Free)' },
  { key: 'custom', label: 'Eigener...' },
] as const;
const OPENAI_MODELS = [
  { key: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { key: 'gpt-4o', label: 'GPT-4o' },
  { key: 'gpt-3.5-turbo', label: 'GPT-3.5' },
  { key: 'custom', label: 'Eigener...' },
] as const;
const OLLAMA_MODELS = [
  { key: 'llama3', label: 'Llama 3' },
  { key: 'mistral', label: 'Mistral' },
  { key: 'gemma', label: 'Gemma' },
  { key: 'phi3', label: 'Phi 3' },
  { key: 'custom', label: 'Eigener...' },
] as const;

function Chips<T extends string>({ items, active, onSelect, isDark, warningKeys }: { items: readonly { key: T; label: string }[]; active: T; onSelect: (k: T) => void; isDark: boolean; warningKeys?: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((item) => {
        const a = item.key === active;
        const warn = warningKeys?.includes(item.key);
        return (
          <TouchableOpacity key={item.key} onPress={() => onSelect(item.key)} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, backgroundColor: a ? '#6C5CE7' : isDark ? 'rgba(255,255,255,0.07)' : '#F3F2F8', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ color: a ? '#FFF' : isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800' }}>{item.label}</Text>
            {warn && <Text style={{ color: '#FF3B30', fontWeight: '900', fontSize: 14 }}>!</Text>}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function ProviderSettings() {
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const { data: rulesData } = useQuery({ queryKey: ['rules'], queryFn: db.getRules });
  const rules = rulesData || DEFAULT_RULES;

  const [provider, setProvider] = useState(rules.ai_provider || 'gemini');
  const [geminiKey, setGeminiKey] = useState(rules.gemini_api_key || '');
  const [geminiModel, setGeminiModel] = useState(rules.gemini_model || 'gemini-3.5-flash');
  const [orKey, setOrKey] = useState(rules.openrouter_api_key || '');
  const [orModel, setOrModel] = useState(rules.openrouter_model || 'google/gemini-3.5-flash');
  const [oaiKey, setOaiKey] = useState(rules.openai_api_key || '');
  const [oaiModel, setOaiModel] = useState(rules.openai_model || 'gpt-4o-mini');
  const [ollamaUrl, setOllamaUrl] = useState(rules.ollama_url || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(rules.ollama_model || 'llama3');
  const [onDeviceName, setOnDeviceName] = useState(rules.on_device_model_name || 'Gemma lokal');
  const [customGemini, setCustomGemini] = useState(false);
  const [customOr, setCustomOr] = useState(false);
  const [customOai, setCustomOai] = useState(false);
  const [customOllama, setCustomOllama] = useState(false);
  const [limitedModels, setLimitedModels] = useState<string[]>([]);

  useEffect(() => {
    if (rulesData) {
      setProvider(rulesData.ai_provider || 'gemini');
      setGeminiKey(rulesData.gemini_api_key || '');
      setGeminiModel(rulesData.gemini_model || 'gemini-3.5-flash');
      setOrKey(rulesData.openrouter_api_key || '');
      setOrModel(rulesData.openrouter_model || 'google/gemini-3.5-flash');
      setOaiKey(rulesData.openai_api_key || '');
      setOaiModel(rulesData.openai_model || 'gpt-4o-mini');
      setOllamaUrl(rulesData.ollama_url || 'http://localhost:11434');
      setOllamaModel(rulesData.ollama_model || 'llama3');
      setOnDeviceName(rulesData.on_device_model_name || 'Gemma lokal');
      setCustomGemini(!GEMINI_MODELS.some(m => m.key === rulesData.gemini_model) && !!rulesData.gemini_model);
      setCustomOr(!OPENROUTER_MODELS.some(m => m.key === rulesData.openrouter_model) && !!rulesData.openrouter_model);
      setCustomOai(!OPENAI_MODELS.some(m => m.key === rulesData.openai_model) && !!rulesData.openai_model);
      setCustomOllama(!OLLAMA_MODELS.some(m => m.key === rulesData.ollama_model) && !!rulesData.ollama_model);
    }
  }, [rulesData]);

  useEffect(() => {
    const update = () => {
      const allKeys = [...GEMINI_MODELS, ...OPENROUTER_MODELS, ...OPENAI_MODELS, ...OLLAMA_MODELS].map(m => m.key) as string[];
      [geminiModel, orModel, oaiModel, ollamaModel].forEach(k => { if (k) allKeys.push(k); });
      setLimitedModels([...new Set(allKeys)].filter(k => rateLimitTracker.isLimited(k)));
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [geminiModel, orModel, oaiModel, ollamaModel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await db.saveRules({ ...rules, ai_provider: provider as any, gemini_api_key: geminiKey, gemini_model: geminiModel, openrouter_api_key: orKey, openrouter_model: orModel, openai_api_key: oaiKey, openai_model: oaiModel, ollama_url: ollamaUrl, ollama_model: ollamaModel, on_device_model_name: onDeviceName });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rules'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Gespeichert', 'Provider-Einstellungen übernommen.'); },
  });

  const renderModelSection = () => {
    if (provider === 'gemini') return (
      <>
        <LI label="Gemini API-Key" value={geminiKey} onChange={setGeminiKey} secure />
        <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Gemini Modell</Text>
        <Chips items={GEMINI_MODELS} active={(customGemini ? 'custom' : geminiModel) as any} onSelect={(k: any) => { if (k === 'custom') setCustomGemini(true); else { setCustomGemini(false); setGeminiModel(k); } }} isDark={isDark} warningKeys={limitedModels} />
        {limitedModels.includes(geminiModel) && <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '700' }}>⚠️ API-Limit erreicht. Bitte kurz warten.</Text>}
        {customGemini && <Input value={geminiModel} onChangeText={setGeminiModel} placeholder="Modellname eingeben" />}
      </>
    );
    if (provider === 'openrouter') return (
      <>
        <LI label="OpenRouter API-Key" value={orKey} onChange={setOrKey} secure />
        <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>OpenRouter Modell</Text>
        <Chips items={OPENROUTER_MODELS} active={(customOr ? 'custom' : orModel) as any} onSelect={(k: any) => { if (k === 'custom') setCustomOr(true); else { setCustomOr(false); setOrModel(k); } }} isDark={isDark} warningKeys={limitedModels} />
        {customOr && <Input value={orModel} onChangeText={setOrModel} placeholder="Modellname eingeben" />}
      </>
    );
    if (provider === 'openai') return (
      <>
        <LI label="OpenAI API-Key" value={oaiKey} onChange={setOaiKey} secure />
        <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>OpenAI Modell</Text>
        <Chips items={OPENAI_MODELS} active={(customOai ? 'custom' : oaiModel) as any} onSelect={(k: any) => { if (k === 'custom') setCustomOai(true); else { setCustomOai(false); setOaiModel(k); } }} isDark={isDark} warningKeys={limitedModels} />
        {customOai && <Input value={oaiModel} onChangeText={setOaiModel} placeholder="Modellname eingeben" />}
      </>
    );
    if (provider === 'ollama') return (
      <>
        <LI label="Ollama URL" value={ollamaUrl} onChange={setOllamaUrl} />
        <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>Ollama Modell</Text>
        <Chips items={OLLAMA_MODELS} active={(customOllama ? 'custom' : ollamaModel) as any} onSelect={(k: any) => { if (k === 'custom') setCustomOllama(true); else { setCustomOllama(false); setOllamaModel(k); } }} isDark={isDark} warningKeys={limitedModels} />
        {customOllama && <Input value={ollamaModel} onChangeText={setOllamaModel} placeholder="Modellname eingeben" />}
      </>
    );
    return (
      <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F2F8' }}>
        <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '800' }}>Lokales Modell</Text>
        <Text style={{ color: '#6E6A85', fontWeight: '600', lineHeight: 18 }}>Expo Go kann kein natives On-Device-LLM laden. Fällt automatisch auf Cloud-Provider zurück.</Text>
        <LI label="Modellname" value={onDeviceName} onChange={setOnDeviceName} />
      </View>
    );
  };

  return (
    <SettingsLayout title="KI-Provider" subtitle="Modell, API-Keys & Verbindung" onSave={() => saveMutation.mutate()} saving={saveMutation.isPending}>
      <SettingsSection title="Provider">
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Brain size={18} color="#6C5CE7" />
            <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '900', flex: 1 }}>Aktiver Provider</Text>
          </View>
          <Chips items={AI_PROVIDERS} active={provider as any} onSelect={(k: any) => setProvider(k)} isDark={isDark} />
        </Card>
      </SettingsSection>
      <SettingsSection title="Modell & Zugang">
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} color="#6C5CE7" />
            <Text style={{ color: isDark ? '#F0EEF6' : '#1A1625', fontWeight: '900', flex: 1 }}>Konfiguration</Text>
          </View>
          {renderModelSection()}
        </Card>
      </SettingsSection>
    </SettingsLayout>
  );
}

function LI({ label, value, onChange, secure }: { label: string; value: string; onChange: (v: string) => void; secure?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#6E6A85', fontWeight: '700', fontSize: 12 }}>{label}</Text>
      <Input value={value} onChangeText={onChange} secureTextEntry={secure} />
    </View>
  );
}
