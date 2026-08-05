import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: 'ko' | 'en' | 'ja' | 'de' | 'zh';
}

/**
 * Fetch user preferences from DB.
 * Returns empty object if column doesn't exist yet or on error.
 */
export async function fetchPreferences(userId: string): Promise<UserPreferences> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error || !data) return {};
    return (data.preferences as UserPreferences) || {};
  } catch {
    return {};
  }
}

/**
 * Save a single preference key to DB (merge with existing).
 * Fails silently if preferences column doesn't exist yet.
 */
export async function savePreference(
  userId: string,
  key: keyof UserPreferences,
  value: string
): Promise<void> {
  try {
    // Read current, merge, write back
    const { data: current } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    const prefs: UserPreferences = (current?.preferences as UserPreferences) || {};
    (prefs as Record<string, string>)[key] = value;

    await supabase
      .from('users')
      // preferences 는 jsonb 컬럼 — 생성 타입의 Json 으로 좁혀 넘긴다
      .update({ preferences: prefs as Record<string, string> })
      .eq('id', userId);
  } catch {
    // Silently fail — column may not exist yet
  }
}
