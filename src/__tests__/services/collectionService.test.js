jest.mock('../../config/supabase', () => ({ supabase: { from: jest.fn() } }));

import { mergeCollections } from '../../services/collectionService';

describe('mergeCollections', () => {
  it('returns remote when there are no local-only items', () => {
    const remote = [{ id: 'a' }, { id: 'b' }];
    const local  = [{ id: 'a' }];
    expect(mergeCollections(remote, local)).toEqual(remote);
  });

  it('appends local-only items not present remotely', () => {
    const remote = [{ id: 'a' }];
    const local  = [{ id: 'a' }, { id: 'x9', notes: 'pending' }];
    expect(mergeCollections(remote, local)).toEqual([
      { id: 'a' },
      { id: 'x9', notes: 'pending' },
    ]);
  });

  it('returns local when remote is empty', () => {
    const local = [{ id: 'p1' }, { id: 'x' }];
    expect(mergeCollections([], local)).toEqual(local);
  });

  it('tolerates non-array inputs', () => {
    expect(mergeCollections(null, undefined)).toEqual([]);
  });
});
