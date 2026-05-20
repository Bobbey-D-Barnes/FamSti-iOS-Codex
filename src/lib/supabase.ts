// Supabase import temporarily disabled to fix iOS bundler crash with 'ws/stream'
// import 'react-native-url-polyfill/auto';
// import { createClient } from '@supabase/supabase-js';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase: SupabaseClient | null = null;

console.log('Supabase disabled. Falling back to local storage mode.');
