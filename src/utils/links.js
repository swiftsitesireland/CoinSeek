import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

// Android package name — keep in sync with android.package in app.json.
export const ANDROID_PACKAGE = 'com.coinseek.app';
export const SUPPORT_EMAIL = 'support@coinseek.app';

// Open the Play Store listing. Prefer the Play Store app via the market://
// scheme and fall back to the https listing if the app isn't installed.
export async function openPlayStoreListing() {
  const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  try {
    const canOpenMarket = await Linking.canOpenURL(marketUrl);
    await Linking.openURL(canOpenMarket ? marketUrl : webUrl);
  } catch {
    Toast.show({ type: 'error', text1: 'Could not open the Play Store' });
  }
}

// Open the device mail client with a pre-filled support address.
export async function openSupportEmail(subject = 'CoinSeek Support') {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Toast.show({ type: 'info', text1: 'Email us at', text2: SUPPORT_EMAIL });
  }
}
