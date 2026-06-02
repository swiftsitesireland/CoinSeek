import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'coinseek-trial';

// ─── Configure how notifications appear when app is foregrounded ──────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Android channel (must be created before scheduling) ─────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Trial Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f2ca50',
  });
}

// ─── Permission request ────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule trial reminder notifications ────────────────────────────────────
// Day 5 → "2 days left"  |  Day 7 → "expires today"
export async function scheduleTrialReminders(trialEndsAt) {
  if (Platform.OS === 'web') return;

  await ensureAndroidChannel();

  const trialEnd = new Date(trialEndsAt);
  const now      = new Date();

  // Day 5 — 10am, 2 days before expiry
  const day5 = new Date(trialEnd);
  day5.setDate(day5.getDate() - 2);
  day5.setHours(10, 0, 0, 0);

  // Day 7 — 10am on expiry day
  const day7 = new Date(trialEnd);
  day7.setHours(10, 0, 0, 0);

  await cancelTrialReminders();

  if (day5 > now) {
    const secondsUntilDay5 = Math.floor((day5.getTime() - now.getTime()) / 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: 'trial_day5',
      content: {
        title: '⏰ 2 days left on your free trial',
        body:  'Upgrade to CoinSeek Premium for €18.99/year and keep full access.',
        data:  { screen: 'Subscription' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: { seconds: secondsUntilDay5, repeats: false },
    });
  }

  if (day7 > now) {
    const secondsUntilDay7 = Math.floor((day7.getTime() - now.getTime()) / 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: 'trial_day7',
      content: {
        title: '🚨 Your free trial expires today',
        body:  "Don't lose access — upgrade now for €18.99/year.",
        data:  { screen: 'Subscription' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: { seconds: secondsUntilDay7, repeats: false },
    });
  }
}

// ─── Cancel trial reminders (e.g. user upgraded) ─────────────────────────────
export async function cancelTrialReminders() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync('trial_day5').catch(() => {});
  await Notifications.cancelScheduledNotificationAsync('trial_day7').catch(() => {});
}

// ─── Handle notification tap → return target screen ──────────────────────────
// L-02: whitelist enforced here so every caller is automatically safe.
// AppNavigator no longer needs its own NOTIFICATION_SCREENS check.
const SAFE_NOTIFICATION_SCREENS = new Set(['Subscription', 'Scan', 'Collection', 'Profile']);

export function getScreenFromNotification(notification) {
  const screen = notification?.request?.content?.data?.screen ?? null;
  return SAFE_NOTIFICATION_SCREENS.has(screen) ? screen : null;
}
