import { createSlice } from '@reduxjs/toolkit';

const LEVEL_TITLES = [
  '', 'Pocket Change', 'Penny Picker', 'Nickel Novice', 'Dime Dropper',
  'Quarter Master', 'Dollar Digger', 'Silver Hoarder', 'Gold Hunter',
  'Bronze Age', 'Silver Scholar', 'Gold Expert', 'Coin Whisperer',
  'Numismatist', 'Ancient Seeker', 'Relic Hunter', 'Museum Worthy',
  'Vault Keeper', 'Grand Collector', 'Legendary Hoarder', 'Master Numismatist',
];

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState: {
    xp:         0,
    weekXp:     0,
    level:      1,
    levelTitle: 'Pocket Change',
    badges:     [],
    challenges: [],
    leaderboard:[],
    loading:    false,
  },
  reducers: {
    setGamification(state, action) {
      return { ...state, ...action.payload };
    },
    addEarnedBadge(state, action) {
      if (!state.badges.includes(action.payload)) {
        state.badges.push(action.payload);
      }
    },
    updateChallengeProgress(state, action) {
      const { challengeId, progress, completed } = action.payload;
      const idx = state.challenges.findIndex((c) => c.challengeId === challengeId);
      if (idx >= 0) {
        state.challenges[idx] = { challengeId, progress, completed };
      } else {
        state.challenges.push({ challengeId, progress, completed });
      }
    },
    setLeaderboard(state, action) {
      state.leaderboard = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const {
  setGamification, addEarnedBadge, updateChallengeProgress, setLeaderboard, setLoading,
} = gamificationSlice.actions;

export default gamificationSlice.reducer;

export const selectXP           = (s) => s.gamification.xp;
export const selectWeekXP       = (s) => s.gamification.weekXp;
export const selectLevel        = (s) => s.gamification.level;
export const selectLevelTitle   = (s) => s.gamification.levelTitle;
export const selectBadges       = (s) => s.gamification.badges;
export const selectChallenges   = (s) => s.gamification.challenges;
export const selectLeaderboard  = (s) => s.gamification.leaderboard;
export const selectGamLoading   = (s) => s.gamification.loading;

export { LEVEL_TITLES };
