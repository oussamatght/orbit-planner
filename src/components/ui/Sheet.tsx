import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Render children inside a ScrollView (default true). */
  scrollable?: boolean;
  /** Maximum height as a fraction of the screen. */
  maxHeightRatio?: number;
  footer?: ReactNode;
}

/**
 * Bottom sheet built on a transparent Modal: animated backdrop, spring slide-up,
 * drag-down-to-dismiss on the handle, and keyboard-aware bottom padding.
 */
export function Sheet({ visible, onClose, title, children, scrollable = true, maxHeightRatio = 0.88, footer }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const keyboard = useKeyboardHeight();
  const [mounted, setMounted] = useState(visible);
  // Mount immediately when opened (state adjusted during render, not in an effect).
  if (visible && !mounted) setMounted(true);
  const translateY = useSharedValue(screenHeight);
  const backdrop = useSharedValue(0);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      translateY.set(screenHeight);
      translateY.set(withSpring(0, { damping: 26, stiffness: 260, mass: 0.9 }));
      backdrop.set(withTiming(1, { duration: 220 }));
    } else {
      backdrop.set(withTiming(0, { duration: 180 }));
      translateY.set(
        withTiming(screenHeight, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }),
      );
    }
  }, [visible, screenHeight, translateY, backdrop]);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    onCloseRef.current();
  };

  // Drag-to-dismiss on the handle using the View responder system (no gesture library inside the Modal).
  const dragStart = useRef(0);
  const dragHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      dragStart.current = e.nativeEvent.pageY;
    },
    onResponderMove: (e: GestureResponderEvent) => {
      translateY.set(Math.max(0, e.nativeEvent.pageY - dragStart.current));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      if (e.nativeEvent.pageY - dragStart.current > 110) requestClose();
      else translateY.set(withSpring(0, { damping: 24, stiffness: 260 }));
    },
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));

  if (!mounted) return null;

  const bottomPad = keyboard > 0 ? keyboard + spacing.sm : Math.max(insets.bottom, spacing.lg);
  const Body = scrollable ? ScrollView : View;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceElevated, maxHeight: screenHeight * maxHeightRatio, paddingBottom: bottomPad },
            sheetStyle,
          ]}
          accessibilityViewIsModal
        >
          <View {...dragHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            {title ? (
              <AppText variant="heading" style={styles.title} accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
          </View>
          <Body
            style={scrollable ? styles.scroll : undefined}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={scrollable ? styles.content : undefined}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </Body>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  handleArea: { paddingTop: spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.xl },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: spacing.sm },
  title: { marginTop: spacing.xs },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
});
