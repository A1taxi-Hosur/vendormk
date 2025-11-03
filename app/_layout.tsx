import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setTimeout(() => {
        window.frameworkReady?.();
      }, 0);
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
