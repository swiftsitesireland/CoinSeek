jest.mock('../../config/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq:         jest.fn(() => ({ data: null, error: null })),
        order:      jest.fn(() => ({ limit: jest.fn(() => ({ data: [], error: null })) })),
        maybeSingle: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}));

import { supabase } from '../../config/supabase';
import {
  awardXP,
  fetchGamificationData,
  fetchLeaderboard,
  checkAndAwardBadges,
} from '../../services/gamificationService';

beforeEach(() => jest.clearAllMocks());

describe('awardXP', () => {
  it('calls award_xp RPC with action and metadata', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { xp_earned: 10, new_total: 110, new_week_xp: 10, level_before: 2, level_after: 2 },
      error: null,
    });
    const result = await awardXP('scan', { rarity: 'common', era: 'modern', country: 'US' });
    expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
      p_action: 'scan',
      p_metadata: { rarity: 'common', era: 'modern', country: 'US' },
    });
    expect(result.xp_earned).toBe(10);
  });

  it('throws when RPC returns error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
    await expect(awardXP('scan', {})).rejects.toThrow('rpc failed');
  });
});

describe('fetchLeaderboard', () => {
  it('returns empty array on error', async () => {
    supabase.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: null, error: { message: 'fail' } })),
        })),
      })),
    });
    const result = await fetchLeaderboard();
    expect(result).toEqual([]);
  });
});
