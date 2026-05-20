import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { AgentLearningProfile, AgentMemoryItem } from './types';

const MEMORY_ITEMS_KEY = 'fc_agent_memory_items_v2';
const MEMORY_LEGACY_KEY = 'fc_agent_memory';
const PROFILE_KEY = 'fc_agent_learning_profile';
const MAX_MEMORY_ITEMS = 100;

export const DEFAULT_LEARNING_PROFILE: AgentLearningProfile = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  communicationStyle: 'unknown',
  preferredWorkingTimes: [],
  planningPreferences: [],
  businessPreferences: [],
  teachingPreferences: [],
  appPreferences: [],
  recurringTopics: [],
  importantNotes: [],
};

const isWeb = Platform.OS === 'web';

// SecureStore helpers with web fallback
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn('SecureStorage write failed:', e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.warn('SecureStorage read failed:', e);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn('SecureStorage delete failed:', e);
    }
  },
};

const cleanList = (value: unknown, max = 30) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const normalizeProfile = (profile?: Partial<AgentLearningProfile> | null): AgentLearningProfile => ({
  ...DEFAULT_LEARNING_PROFILE,
  ...(profile || {}),
  version: 1,
  updatedAt: profile?.updatedAt || new Date().toISOString(),
  communicationStyle: profile?.communicationStyle || 'unknown',
  preferredWorkingTimes: cleanList(profile?.preferredWorkingTimes),
  planningPreferences: cleanList(profile?.planningPreferences),
  businessPreferences: cleanList(profile?.businessPreferences),
  teachingPreferences: cleanList(profile?.teachingPreferences),
  appPreferences: cleanList(profile?.appPreferences),
  recurringTopics: cleanList(profile?.recurringTopics),
  importantNotes: cleanList(profile?.importantNotes, 50),
});

const inferCategory = (text: string): AgentMemoryItem['category'] => {
  const lower = text.toLowerCase();
  if (
    lower.includes('arbeit') ||
    lower.includes('zeit') ||
    lower.includes('plan') ||
    lower.includes('bevorzug') ||
    lower.includes('stunde')
  ) {
    return 'preferences';
  }
  if (
    lower.includes('umsatz') ||
    lower.includes('steuer') ||
    lower.includes('kosten') ||
    lower.includes('beleg') ||
    lower.includes('geld') ||
    lower.includes('finanz') ||
    lower.includes('betrieb')
  ) {
    return 'business';
  }
  if (
    lower.includes('geheim') ||
    lower.includes('privat') ||
    lower.includes('passwort') ||
    lower.includes('key') ||
    lower.includes('token')
  ) {
    return 'private';
  }
  return 'general';
};

export const agentMemoryStore = {
  // Structured items
  async getMemoryItems(): Promise<AgentMemoryItem[]> {
    try {
      const stored = await AsyncStorage.getItem(MEMORY_ITEMS_KEY);
      if (stored) {
        return JSON.parse(stored) as AgentMemoryItem[];
      }

      // Legacy migration
      const legacy = await AsyncStorage.getItem(MEMORY_LEGACY_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) {
          const items: AgentMemoryItem[] = parsedLegacy.map((content) => ({
            id: uuidv4(),
            category: inferCategory(String(content)),
            content: String(content),
            createdAt: new Date().toISOString(),
          }));
          await AsyncStorage.setItem(MEMORY_ITEMS_KEY, JSON.stringify(items));
          return items;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async saveMemoryItems(items: AgentMemoryItem[]): Promise<AgentMemoryItem[]> {
    const clean = items.slice(0, MAX_MEMORY_ITEMS);
    await AsyncStorage.setItem(MEMORY_ITEMS_KEY, JSON.stringify(clean));
    return clean;
  },

  // Backwards compatibility layer mapping items content
  async getMemory(): Promise<string[]> {
    const items = await this.getMemoryItems();
    return items.map((item) => item.content);
  },

  async saveMemory(memoryStrings: string[]): Promise<string[]> {
    const existing = await this.getMemoryItems();
    const existingStrings = existing.map((item) => item.content.toLowerCase().trim());
    
    const newItems = [...existing];
    
    // Add strings that aren't already present
    for (const text of memoryStrings) {
      const trimmed = text.trim();
      if (!trimmed) continue;
      if (!existingStrings.includes(trimmed.toLowerCase())) {
        newItems.push({
          id: uuidv4(),
          category: inferCategory(trimmed),
          content: trimmed,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const saved = await this.saveMemoryItems(newItems);
    return saved.map((item) => item.content);
  },

  async deleteMemoryItem(id: string): Promise<void> {
    const items = await this.getMemoryItems();
    const filtered = items.filter((item) => item.id !== id);
    await this.saveMemoryItems(filtered);
  },

  async deleteMemoryByCategory(category: AgentMemoryItem['category']): Promise<void> {
    const items = await this.getMemoryItems();
    const filtered = items.filter((item) => item.category !== category);
    await this.saveMemoryItems(filtered);
  },

  async count(): Promise<number> {
    const items = await this.getMemoryItems();
    return items.length;
  },

  async getLearningProfile(): Promise<AgentLearningProfile> {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      return normalizeProfile(stored ? JSON.parse(stored) : null);
    } catch {
      return normalizeProfile();
    }
  },

  async saveLearningProfile(profile: Partial<AgentLearningProfile>): Promise<AgentLearningProfile> {
    const normalized = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    return normalized;
  },

  async profileFactCount(): Promise<number> {
    const profile = await this.getLearningProfile();
    return [
      profile.userName,
      profile.drivingSchoolName,
      profile.communicationStyle !== 'unknown' ? profile.communicationStyle : '',
      ...profile.preferredWorkingTimes,
      ...profile.planningPreferences,
      ...profile.businessPreferences,
      ...profile.teachingPreferences,
      ...profile.appPreferences,
      ...profile.recurringTopics,
      ...profile.importantNotes,
    ].filter(Boolean).length;
  },

  async clearLearningData(): Promise<void> {
    await AsyncStorage.multiRemove([MEMORY_ITEMS_KEY, MEMORY_LEGACY_KEY, PROFILE_KEY, 'fc_agent_dynamic_knowledge']);
  },

  async getDynamicKnowledgeCards(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('fc_agent_dynamic_knowledge');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async saveDynamicKnowledgeCard(card: any): Promise<void> {
    const existing = await this.getDynamicKnowledgeCards();
    const updated = [...existing.filter((c) => c.id !== card.id), card].slice(0, 100);
    await AsyncStorage.setItem('fc_agent_dynamic_knowledge', JSON.stringify(updated));
  },

  async deleteDynamicKnowledgeCard(id: string): Promise<void> {
    const existing = await this.getDynamicKnowledgeCards();
    const filtered = existing.filter((c) => c.id !== id);
    await AsyncStorage.setItem('fc_agent_dynamic_knowledge', JSON.stringify(filtered));
  },
};

