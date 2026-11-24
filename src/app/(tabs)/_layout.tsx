import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { useSettingsStore } from '@/store/settingsStore';

export default function TabsLayout() {
  const onboarded = useSettingsStore((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="habits" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
