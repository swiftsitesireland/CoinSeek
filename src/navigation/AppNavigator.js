import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CameraScreen                from '../screens/CameraScreen';
import CollectionScreen            from '../screens/CollectionScreen';
import ProfileScreen               from '../screens/ProfileScreen';
import ResultsScreen               from '../screens/ResultsScreen';
import AccountSettingsScreen       from '../screens/AccountSettingsScreen';
import SubscriptionManagementScreen from '../screens/SubscriptionManagementScreen';
import PlanSelectionScreen         from '../screens/PlanSelectionScreen';
import PrivacyPolicyScreen         from '../screens/PrivacyPolicyScreen';
import PrivacySecurityScreen       from '../screens/PrivacySecurityScreen';
import TermsOfServiceScreen        from '../screens/TermsOfServiceScreen';
import HistoryScreen               from '../screens/HistoryScreen';
import WishlistScreen              from '../screens/WishlistScreen';
import OnboardingScreen            from '../screens/OnboardingScreen';
import LoginScreen                 from '../screens/auth/LoginScreen';
import SignupScreen                from '../screens/auth/SignupScreen';
import ForgotPasswordScreen        from '../screens/auth/ForgotPasswordScreen';

import * as SecureStore from 'expo-secure-store';
import { useDispatch }     from 'react-redux';
import { useAuth }         from '../auth/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useCollectionSync }         from '../hooks/useCollectionSync';
import { getScreenFromNotification } from '../services/notificationService';
import * as Notifications from 'expo-notifications';

import { colors, fonts, spacing } from '../theme';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Screens reachable from a notification tap
const NOTIFICATION_SCREENS = new Set(['Collection', 'Profile', 'Scan']);

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <MaterialCommunityIcons name="circle-double" size={56} color={colors.primary} />
      <Text style={{ fontFamily: fonts.heading, fontSize: 28, color: colors.primary, letterSpacing: 1 }}>
        CoinSeek
      </Text>
      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
    </View>
  );
}

function ScanStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="ScanMain" component={CameraScreen} />
      <S.Screen name="Results"  component={ResultsScreen} />
      <S.Screen name="History"  component={HistoryScreen} />
    </S.Navigator>
  );
}

function CollectionStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="CollectionMain" component={CollectionScreen} />
      <S.Screen name="Results"        component={ResultsScreen} />
    </S.Navigator>
  );
}

function ProfileStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="ProfileMain"    component={ProfileScreen} />
      <S.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <S.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <S.Screen name="Subscription"   component={SubscriptionManagementScreen} />
      <S.Screen name="PlanSelection"  component={PlanSelectionScreen} />
      <S.Screen name="PrivacyPolicy"    component={PrivacyPolicyScreen} />
      <S.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
      <S.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <S.Screen name="History"         component={HistoryScreen} />
      <S.Screen name="Wishlist"        component={WishlistScreen} />
    </S.Navigator>
  );
}

function ScanTabIcon({ focused }) {
  if (focused) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.scanFab}
      >
        <MaterialCommunityIcons name="line-scan" size={22} color={colors.onPrimary} />
      </LinearGradient>
    );
  }
  return <MaterialCommunityIcons name="line-scan" size={24} color={colors.textMuted} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Scan') return <ScanTabIcon focused={focused} />;
          const icons = {
            Collection: focused ? 'layers'   : 'layers-outline',
            Profile:    focused ? 'account'  : 'account-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Scan"       component={ScanStack}       options={{ tabBarLabel: 'Scan' }} />
      <Tab.Screen name="Collection" component={CollectionStack} options={{ tabBarLabel: 'Collection' }} />
      <Tab.Screen name="Profile"    component={ProfileStack}    options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasSubscription, loading: subLoading }  = useSubscription();
  const navigationRef = React.useRef(null);
  const [needsPlanSelection, setNeedsPlanSelection] = React.useState(false);
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);
  const [flagLoading,        setFlagLoading]        = React.useState(true);
  const [planChecked,        setPlanChecked]        = React.useState(false);

  useCollectionSync();

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync('coinseek_needs_plan_selection'),
      SecureStore.getItemAsync('coinseek_onboarding_complete'),
    ]).then(([planVal, onboardingVal]) => {
      setNeedsPlanSelection(planVal === 'true');
      setOnboardingComplete(onboardingVal === 'true');
      setFlagLoading(false);
    });
  }, []);

  // Re-read the plan-selection flag whenever the user becomes authenticated.
  // It's set at sign-up — AFTER the initial launch read above — so without this
  // a first-time user would skip straight past the paywall on their first login.
  // planChecked gates the render so the main app doesn't flash before the paywall.
  useEffect(() => {
    if (!isAuthenticated) { setPlanChecked(false); return; }
    setPlanChecked(false);
    SecureStore.getItemAsync('coinseek_needs_plan_selection').then((val) => {
      setNeedsPlanSelection(val === 'true');
      setPlanChecked(true);
    });
  }, [isAuthenticated]);

  const isLoading = authLoading || flagLoading
    || (isAuthenticated && (subLoading || !planChecked));

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = getScreenFromNotification(response.notification);
      if (screen && NOTIFICATION_SCREENS.has(screen) && navigationRef.current) {
        navigationRef.current.navigate(screen);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!onboardingComplete ? (
            // ── Onboarding ────────────────────────────────────────────
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : !isAuthenticated ? (
            // ── Auth screens ──────────────────────────────────────────
            // Rendered as a group so React Navigation handles the auth→main
            // transition cleanly — no stale GO_BACK actions on sign-out.
            <>
              <Stack.Screen name="Login"          component={LoginScreen} />
              <Stack.Screen name="Signup"         component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
              <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
            </>
          ) : needsPlanSelection ? (
            // ── Plan selection (after first sign-up) ──────────────────
            // Show regardless of hasSubscription — new users are already
            // in a trial but still need to consciously choose their plan.
            <Stack.Screen name="PlanSelection">
              {(props) => (
                <PlanSelectionScreen
                  {...props}
                  onDismiss={() => setNeedsPlanSelection(false)}
                />
              )}
            </Stack.Screen>
          ) : (
            // ── Main app ──────────────────────────────────────────────
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    height: 80,
    paddingBottom: 16,
    paddingTop: 10,
  },
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    marginTop: 2,
  },
  scanFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
