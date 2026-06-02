import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFavourites, loadFavourites } from '../../services/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => { await AsyncStorage.clear(); });

describe('favourites storage', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await loadFavourites()).toEqual([]);
  });

  it('round-trips an array of ids', async () => {
    await saveFavourites(['a', 'b']);
    expect(await loadFavourites()).toEqual(['a', 'b']);
  });

  it('returns [] for non-array stored data', async () => {
    await AsyncStorage.setItem('@coin_collector/favourites', JSON.stringify({ not: 'array' }));
    expect(await loadFavourites()).toEqual([]);
  });
});
