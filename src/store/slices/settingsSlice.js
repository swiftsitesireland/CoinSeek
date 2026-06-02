import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    currency: 'USD',
    notifications: true,
    saveScansToGallery: false,
    darkMode: true,
    defaultCondition: 'VF-20',
    isPremium: false,
    subscriptionStatus: 'free_trial', // 'free_trial' | 'premium' | 'expired'
    trialStartDate: null, // never used — always derived from user.created_at in useFeatureAccess
    scansUsedToday: 0,
    lastScanResetDate: null,
    userProfile: {
      name: 'Collector',
      email: '',
      avatar: null,
    },
    // Privacy & security preferences. Persisted via settingsPersistMiddleware so
    // they survive restarts — required for GDPR consent to be honoured.
    privacy: {
      analytics: true,
      crashReports: true,
      personalisedTips: true,
      scanHistory: true,
      loginAlerts: true,
    },
  },
  reducers: {
    setSettings(state, action) {
      return { ...state, ...action.payload };
    },
    updateProfile(state, action) {
      state.userProfile = { ...state.userProfile, ...action.payload };
    },
    toggleNotifications(state) {
      state.notifications = !state.notifications;
    },
    activatePremium(state) {
      state.isPremium = true;
      state.subscriptionStatus = 'premium';
    },
    deactivatePremium(state) {
      state.isPremium = false;
      state.subscriptionStatus = 'expired';
    },
    toggleSaveScansToGallery(state) {
      state.saveScansToGallery = !state.saveScansToGallery;
    },
    setCurrency(state, action) {
      state.currency = action.payload;
    },
    setScansUsedToday(state, action) {
      state.scansUsedToday = action.payload;
    },
    incrementScansUsed(state) {
      state.scansUsedToday += 1;
    },
    resetScanCount(state, action) {
      state.scansUsedToday = 0;
      state.lastScanResetDate = action.payload; // today's date string
    },
    setPrivacySetting(state, action) {
      const { key, value } = action.payload;
      if (state.privacy && key in state.privacy) {
        state.privacy[key] = value;
      }
    },
  },
});

export const {
  setSettings, updateProfile, toggleNotifications, toggleSaveScansToGallery,
  activatePremium, deactivatePremium, setCurrency,
  setScansUsedToday, incrementScansUsed, resetScanCount, setPrivacySetting,
} = settingsSlice.actions;

export default settingsSlice.reducer;

export const selectSettings          = (state) => state.settings;
export const selectIsPremium         = (state) => state.settings.isPremium;
export const selectCurrency          = (state) => state.settings.currency;
export const selectSubscriptionStatus= (state) => state.settings.subscriptionStatus;
export const selectScansUsedToday    = (state) => state.settings.scansUsedToday;
export const selectPrivacy           = (state) => state.settings.privacy;
// selectTrialStartDate intentionally removed — use user.created_at from useAuth()
