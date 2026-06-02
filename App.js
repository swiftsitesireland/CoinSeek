import 'react-native-url-polyfill/auto';
import { initAppCheck } from './src/services/appCheckService';
// Kick off App Check initialisation immediately at module load time.
// It resolves async in the background — no await needed here.
initAppCheck();
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useFonts, LibreCaslonText_400Regular, LibreCaslonText_700Bold } from '@expo-google-fonts/libre-caslon-text';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { store } from './src/store';
import { setSettings } from './src/store/slices/settingsSlice';
import { setFavourites } from './src/store/slices/collectionSlice';
import { loadSettings, loadFavourites } from './src/services/storage';
import { AuthProvider } from './src/auth/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { paperTheme, colors } from './src/theme';
import XPToast from './src/components/XPToast';

function ToastComponent({ text1, text2, backgroundColor, borderColor }) {
  return (
    <View
      style={{
        backgroundColor,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        borderRadius: 8,
        minWidth: 280,
      }}
    >
      {text1 && (
        <Text style={{ color: '#e5e2e1', fontWeight: '700', fontSize: 14 }}>{text1}</Text>
      )}
      {text2 && (
        <Text style={{ color: '#99907c', fontSize: 12, marginTop: 2 }}>{text2}</Text>
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    LibreCaslonText_400Regular,
    LibreCaslonText_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Restore persisted settings (display currency, notifications, etc.) on launch.
  useEffect(() => {
    (async () => {
      const saved = await loadSettings();
      if (saved) store.dispatch(setSettings(saved));
      const favIds = await loadFavourites();
      if (favIds.length) store.dispatch(setFavourites(favIds));
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PaperProvider theme={paperTheme}>
          <SafeAreaProvider>
            <AuthProvider>
              <AppNavigator />
              <Toast
                config={{
                  success: (props) => (
                    <ToastComponent {...props} backgroundColor="#1a2a1a" borderColor="#4ADE80" />
                  ),
                  error: (props) => (
                    <ToastComponent {...props} backgroundColor="#2a1a1a" borderColor="#ffb4ab" />
                  ),
                  info: (props) => (
                    <ToastComponent {...props} backgroundColor="#201f1a" borderColor="#f2ca50" />
                  ),
                  xpEarned: (props) => <XPToast {...props} />,
                }}
              />
            </AuthProvider>
          </SafeAreaProvider>
        </PaperProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
