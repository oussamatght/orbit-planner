import { Cairo_400Regular } from '@expo-google-fonts/cairo/400Regular';
import { Cairo_500Medium } from '@expo-google-fonts/cairo/500Medium';
import { Cairo_600SemiBold } from '@expo-google-fonts/cairo/600SemiBold';
import { Cairo_700Bold } from '@expo-google-fonts/cairo/700Bold';
import { Cairo_800ExtraBold } from '@expo-google-fonts/cairo/800ExtraBold';
// Per-weight imports so only the weights we use are bundled.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import * as Font from 'expo-font';

import type { Language } from '@/types/models';

import { fonts } from './tokens';

/**
 * Registers the app's font aliases with the family that matches the language:
 * Cairo for Arabic (Plus Jakarta Sans has no Arabic glyphs), Plus Jakarta Sans otherwise.
 * Switching to or from Arabic restarts the app, so this only runs at startup.
 */
export async function loadAppFonts(language: Language): Promise<void> {
  const arabic = language === 'ar';
  await Font.loadAsync({
    [fonts.regular]: arabic ? Cairo_400Regular : PlusJakartaSans_400Regular,
    [fonts.medium]: arabic ? Cairo_500Medium : PlusJakartaSans_500Medium,
    [fonts.semibold]: arabic ? Cairo_600SemiBold : PlusJakartaSans_600SemiBold,
    [fonts.bold]: arabic ? Cairo_700Bold : PlusJakartaSans_700Bold,
    [fonts.extrabold]: arabic ? Cairo_800ExtraBold : PlusJakartaSans_800ExtraBold,
  });
}
