import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarCheck2, Flame, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View, type ListViewToken } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Chip, TextField } from '@/components/ui';
import { LANGUAGES, useLanguage, useT, type TranslationKey } from '@/i18n';
import { changeLanguage } from '@/services/languageService';
import { useNoteStore } from '@/store/noteStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { radius, spacing, useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

const SLIDES: { icon: LucideIcon; title: TranslationKey; body: TranslationKey; colors: [string, string] }[] = [
  { icon: CalendarCheck2, title: 'onboarding.slide1.title', body: 'onboarding.slide1.body', colors: ['#6366F1', '#8B5CF6'] },
  { icon: Flame, title: 'onboarding.slide2.title', body: 'onboarding.slide2.body', colors: ['#F97316', '#EC4899'] },
  { icon: ShieldCheck, title: 'onboarding.slide3.title', body: 'onboarding.slide3.body', colors: ['#14B8A6', '#0EA5E9'] },
];

const STARTER = {
  en: { work: 'Work', personal: 'Personal', study: 'Study', ideas: 'Ideas', notes: 'Study notes' },
  fr: { work: 'Travail', personal: 'Personnel', study: 'Études', ideas: 'Idées', notes: 'Cours' },
  ar: { work: 'العمل', personal: 'شخصي', study: 'الدراسة', ideas: 'أفكار', notes: 'ملاحظات الدراسة' },
} as const;

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({ width: withSpring(active ? 24 : 8), opacity: withSpring(active ? 1 : 0.35) }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, style]} />;
}

export default function Onboarding() {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const update = useSettingsStore((s) => s.update);
  const createProject = useProjectStore((s) => s.createProject);
  const createNotebook = useNoteStore((s) => s.createNotebook);
  const language = useLanguage();
  const starterNames = STARTER[language];
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'slides' | 'name'>('slides');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }, []);

  const next = () => {
    haptics.selection();
    if (index < SLIDES.length - 1) listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    else setStep('name');
  };

  const finish = async (starter: boolean) => {
    setBusy(true);
    try {
      if (starter) {
        await createProject({ name: starterNames.work, icon: 'briefcase', color: '#5B5BF6' });
        await createProject({ name: starterNames.personal, icon: 'home', color: '#22C55E' });
        await createProject({ name: starterNames.study, icon: 'graduation', color: '#F5A524' });
        await createNotebook({ name: starterNames.ideas, icon: 'lightbulb', color: '#F5A524' });
        await createNotebook({ name: starterNames.notes, icon: 'book-open', color: '#0EA5E9' });
      }
      await update({ onboarded: true, userName: name.trim() });
      haptics.success();
      router.replace('/');
    } catch {
      toast.error(t('error.saveFailed'));
      setBusy(false);
    }
  };

  if (step === 'name') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xl }]}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.nameBox}>
          <AppText variant="display">{t('onboarding.nameTitle')}</AppText>
          <View style={styles.gap} />
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.namePlaceholder')}
            autoFocus
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <AppText variant="heading" style={styles.starterTitle}>
            {t('onboarding.starterTitle')}
          </AppText>
          <AppText variant="body" tone="secondary">
            {t('onboarding.starterBody')}
          </AppText>
        </Animated.View>
        <View style={styles.actions}>
          <Button label={t('onboarding.starterYes')} onPress={() => void finish(true)} loading={busy} fullWidth size="lg" />
          <Button label={t('onboarding.starterNo')} onPress={() => void finish(false)} disabled={busy} variant="ghost" fullWidth />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.skipRow}>
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => (
            <Chip key={l.value} size="sm" label={l.label} selected={language === l.value} onPress={() => void changeLanguage(l.value)} />
          ))}
        </View>
        <Button label={t('common.skip')} onPress={() => setStep('name')} variant="ghost" size="sm" />
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.slide, { width }]}>
              <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <View style={styles.heroRing}>
                  <Icon size={72} color="#FFFFFF" strokeWidth={1.6} />
                </View>
              </LinearGradient>
              <AppText variant="display" align="center" style={styles.slideTitle}>
                {t(item.title)}
              </AppText>
              <AppText variant="body" tone="secondary" align="center" style={styles.slideBody}>
                {t(item.body)}
              </AppText>
            </View>
          );
        }}
      />
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Dot key={s.title} active={i === index} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          label={index === SLIDES.length - 1 ? t('onboarding.getStarted') : t('common.continue')}
          onPress={next}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 52 },
  langRow: { flexDirection: 'row', gap: spacing.xs },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  hero: { width: 220, height: 220, borderRadius: 72, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.huge, transform: [{ rotate: '-6deg' }] },
  heroRing: { width: 150, height: 150, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }] },
  slideTitle: { marginBottom: spacing.md },
  slideBody: { maxWidth: 320 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xxl },
  dot: { height: 8, borderRadius: radius.full },
  actions: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  nameBox: { flex: 1, paddingHorizontal: spacing.xl },
  gap: { height: spacing.xxl },
  starterTitle: { marginTop: spacing.lg, marginBottom: spacing.xs },
});
