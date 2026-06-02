import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import {
  setGamification, setLeaderboard, setLoading,
  selectXP, selectWeekXP, selectLevel, selectLevelTitle,
  selectBadges, selectChallenges, selectLeaderboard, selectGamLoading,
} from '../store/slices/gamificationSlice';
import { fetchGamificationData, fetchLeaderboard } from '../services/gamificationService';

export function useGamification() {
  const { user }   = useAuth();
  const dispatch   = useDispatch();

  const xp          = useSelector(selectXP);
  const weekXp      = useSelector(selectWeekXP);
  const level       = useSelector(selectLevel);
  const levelTitle  = useSelector(selectLevelTitle);
  const badges      = useSelector(selectBadges);
  const challenges  = useSelector(selectChallenges);
  const leaderboard = useSelector(selectLeaderboard);
  const loading     = useSelector(selectGamLoading);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    dispatch(setLoading(true));
    try {
      const [gamData, board] = await Promise.all([
        fetchGamificationData(user.id),
        fetchLeaderboard(),
      ]);
      dispatch(setGamification(gamData));
      dispatch(setLeaderboard(board));
    } catch (e) {
      console.warn('useGamification fetch error:', e.message);
    } finally {
      dispatch(setLoading(false));
    }
  }, [user?.id]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const xpToNextLevel = getXPToNextLevel(level, xp);

  return { xp, weekXp, level, levelTitle, xpToNextLevel, badges, challenges, leaderboard, loading, refetch };
}

const LEVEL_THRESHOLDS = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];

function getXPToNextLevel(level, xp) {
  const next = LEVEL_THRESHOLDS[level ?? 1];
  if (!next) return 0;
  return Math.max(0, next - (xp ?? 0));
}
