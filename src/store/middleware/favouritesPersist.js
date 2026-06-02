/**
 * Redux middleware that persists the favourites list to AsyncStorage whenever it
 * changes. Mirrors settingsPersistMiddleware: run the reducer first, then persist
 * the resulting state. Hydrated at startup in App.js via loadFavourites().
 */
import { saveFavourites } from '../../services/storage';

const FAVOURITE_ACTIONS = new Set([
  'collection/toggleFavourite',
  'collection/setFavourites',
]);

export const favouritesPersistMiddleware = store => next => action => {
  const result = next(action);

  if (FAVOURITE_ACTIONS.has(action?.type)) {
    // Fire-and-forget; the storage layer logs its own errors.
    saveFavourites(store.getState().collection.favourites);
  }

  return result;
};
