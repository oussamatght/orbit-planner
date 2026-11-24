import { useCallback } from 'react';

import { useSettingsStore } from '@/store/settingsStore';
import type { Language } from '@/types/models';

import { ar } from './ar';
import { en, type TranslationKey } from './en';
import { fr } from './fr';

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, fr, ar };

export type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function translate(language: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const template = dictionaries[language]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}

/** Translation function for non-React code (services, stores). */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(useSettingsStore.getState().settings.language, key, params);
}

export function useT(): TFunction {
  const language = useSettingsStore((s) => s.settings.language);
  return useCallback<TFunction>((key, params) => translate(language, key, params), [language]);
}

export function useLanguage(): Language {
  return useSettingsStore((s) => s.settings.language);
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
];

export const isRtlLanguage = (language: Language): boolean => language === 'ar';

export type { TranslationKey };
