import { configureStore } from '@reduxjs/toolkit';
import collectionReducer from './slices/collectionSlice';
import historyReducer from './slices/historySlice';
import settingsReducer from './slices/settingsSlice';
import gamificationReducer from './slices/gamificationSlice';
import { collectionSyncMiddleware } from './middleware/collectionSync';
import { settingsPersistMiddleware } from './middleware/settingsPersist';

export const store = configureStore({
  reducer: {
    collection:    collectionReducer,
    history:       historyReducer,
    settings:      settingsReducer,
    gamification:  gamificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(collectionSyncMiddleware, settingsPersistMiddleware),
});
