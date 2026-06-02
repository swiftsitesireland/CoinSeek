import reducer, {
  setFavourites,
  toggleFavourite,
  selectFavourites,
  selectIsFavourite,
  selectFavouriteCount,
} from '../../store/slices/collectionSlice';

const initial = () => reducer(undefined, { type: '@@INIT' });

describe('favourites reducer', () => {
  it('starts with an empty favourites array', () => {
    expect(initial().favourites).toEqual([]);
  });

  it('toggleFavourite adds an id when absent', () => {
    const s = reducer(initial(), toggleFavourite('coin_1'));
    expect(s.favourites).toEqual(['coin_1']);
  });

  it('toggleFavourite removes an id when present', () => {
    let s = reducer(initial(), toggleFavourite('coin_1'));
    s = reducer(s, toggleFavourite('coin_1'));
    expect(s.favourites).toEqual([]);
  });

  it('toggleFavourite never duplicates an id', () => {
    let s = reducer(initial(), toggleFavourite('coin_1'));
    s = reducer(s, toggleFavourite('coin_2'));
    s = reducer(s, toggleFavourite('coin_1')); // removes coin_1
    expect(s.favourites).toEqual(['coin_2']);
  });

  it('setFavourites replaces state and dedupes non-strings', () => {
    const s = reducer(initial(), setFavourites(['a', 'a', 'b', 5, null]));
    expect(s.favourites).toEqual(['a', 'b']);
  });
});

describe('favourites selectors', () => {
  const state = { collection: { items: [], wishlist: undefined, favourites: ['x', 'y'] } };
  it('selectFavourites returns the array', () => {
    expect(selectFavourites(state)).toEqual(['x', 'y']);
  });
  it('selectIsFavourite reflects membership', () => {
    expect(selectIsFavourite('x')(state)).toBe(true);
    expect(selectIsFavourite('z')(state)).toBe(false);
  });
  it('selectFavouriteCount returns the length', () => {
    expect(selectFavouriteCount(state)).toBe(2);
  });
});
