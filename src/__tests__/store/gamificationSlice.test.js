import gamificationReducer, {
  setGamification,
  addEarnedBadge,
  updateChallengeProgress,
  selectXP,
  selectLevel,
  selectLevelTitle,
  selectBadges,
  selectChallenges,
  selectLeaderboard,
} from '../../store/slices/gamificationSlice';

const initial = gamificationReducer(undefined, { type: '@@INIT' });

describe('initial state', () => {
  it('has zero xp', () => expect(initial.xp).toBe(0));
  it('has level 1', () => expect(initial.level).toBe(1));
  it('has empty badges', () => expect(initial.badges).toEqual([]));
  it('has empty challenges', () => expect(initial.challenges).toEqual([]));
});

describe('setGamification', () => {
  it('merges partial payload', () => {
    const next = gamificationReducer(initial, setGamification({ xp: 500, level: 4 }));
    expect(next.xp).toBe(500);
    expect(next.level).toBe(4);
    expect(next.badges).toEqual([]);
  });
});

describe('addEarnedBadge', () => {
  it('appends badge_id', () => {
    const next = gamificationReducer(initial, addEarnedBadge('first_scan'));
    expect(next.badges).toContain('first_scan');
  });

  it('does not add duplicate', () => {
    let state = gamificationReducer(initial, addEarnedBadge('first_scan'));
    state = gamificationReducer(state, addEarnedBadge('first_scan'));
    expect(state.badges.filter((b) => b === 'first_scan')).toHaveLength(1);
  });
});

describe('updateChallengeProgress', () => {
  it('upserts challenge progress', () => {
    const payload = { challengeId: 'daily_scan', progress: 1, completed: false };
    const next = gamificationReducer(initial, updateChallengeProgress(payload));
    expect(next.challenges[0]).toMatchObject(payload);
  });

  it('updates existing entry', () => {
    let state = gamificationReducer(initial, updateChallengeProgress({ challengeId: 'daily_scan', progress: 0, completed: false }));
    state = gamificationReducer(state, updateChallengeProgress({ challengeId: 'daily_scan', progress: 1, completed: true }));
    expect(state.challenges).toHaveLength(1);
    expect(state.challenges[0].completed).toBe(true);
  });
});

describe('selectors', () => {
  const state = { gamification: { xp: 1320, weekXp: 200, level: 7, levelTitle: 'Silver Hoarder', badges: ['first_scan'], challenges: [], leaderboard: [] } };
  it('selectXP', () => expect(selectXP(state)).toBe(1320));
  it('selectLevel', () => expect(selectLevel(state)).toBe(7));
  it('selectLevelTitle', () => expect(selectLevelTitle(state)).toBe('Silver Hoarder'));
  it('selectBadges', () => expect(selectBadges(state)).toContain('first_scan'));
});
