import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Loading } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { migrate } from '@/db/migrate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [fontsLoaded] = useFonts({ Vazirmatn: require('@/assets/fonts/Vazirmatn-Variable.ttf') });
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.background, card: c.surface, text: c.text, primary: c.brand, border: c.line } }}>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="zabanz.db" onInit={migrate} useSuspense>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="review" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
