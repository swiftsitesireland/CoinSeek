/**
 * Redux middleware that persists the settings slice to AsyncStorage whenever
 * it changes (currency, notifications, profile, etc.). Mirrors the source-of-
 * truth pattern used by collectionSync: run the reducer first, then persist the
 * resulting state. Loaded back at startup in App.js via loadSettings().
 */
import { saveSettings } from '../../services/storage';

const SETTINGS_ACTION_PREFIX = 'settings/';

export const settingsPersistMiddleware = store => next => action => {
  const result = next(action);

  if (typeof action?.type === 'string' && action.type.startsWith(SETTINGS_ACTION_PREFIX)) {
    // Fire-and-forget; the storage layer logs its own errors.
    saveSettings(store.getState().settings);
  }

  return result;
};
