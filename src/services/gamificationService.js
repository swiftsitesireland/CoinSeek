import { supabase } from '../config/supabase';
import { LEVEL_TITLES } from '../store/slices/gamificationSlice';

const EU_COUNTRIES = new Set(['Germany','France','Italy','Spain','Netherlands','Belgium','Austria','Portugal','Greece','Finland','Ireland','Luxembourg']);

export async function awardXP(action, metadata = {}) {
  const { data, error } = await supabase.rpc('award_xp', {
    p_action:   action,
    p_metadata: metadata,
  });
  if (error) throw new Error(error.message);
  return data; // { xp_earned, new_total, new_week_xp, level_before, level_after }
}

export async function awardBadge(badgeId) {
  const { data, error } = await supabase.rpc('award_badge', { p_badge_id: badgeId });
  if (error) return { newly_earned: false };
  return data; // { badge_id, newly_earned }
}

export async function fetchGamificationData(userId) {
  const [xpRes, badgesRes, challengesRes] = await Promise.all([
    supabase.from('user_xp').select('total_xp, week_xp, level').eq('user_id', userId).maybeSingle(),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId),
    supabase.from('user_challenges').select('challenge_id, progress, completed_at').eq('user_id', userId),
  ]);

  const xpRow  = xpRes.data  ?? { total_xp: 0, week_xp: 0, level: 1 };
  const level  = xpRow.level ?? 1;

  return {
    xp:         xpRow.total_xp,
    weekXp:     xpRow.week_xp,
    level,
    levelTitle: LEVEL_TITLES[level] ?? 'Pocket Change',
    badges:     (badgesRes.data ?? []).map((r) => r.badge_id),
    challenges: (challengesRes.data ?? []).map((r) => ({
      challengeId: r.challenge_id,
      progress:    r.progress,
      completed:   !!r.completed_at,
    })),
  };
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard_weekly')
    .select('user_id, display_name, week_xp, level, rank')
    .order('rank', { ascending: true })
    .limit(10);
  if (error) return [];
  return data ?? [];
}

export async function checkAndAwardBadges({ action, metadata, newTotal, level, earnedBadges, collectionSize, scanCount, countries }) {
  const newlyEarned = [];

  const check = async (badgeId, condition) => {
    if (!earnedBadges.includes(badgeId) && condition) {
      const res = await awardBadge(badgeId);
      if (res.newly_earned) newlyEarned.push(badgeId);
    }
  };

  // Scanning milestones
  await check('first_scan',      action === 'scan' && scanCount >= 1);
  await check('warm_up',         action === 'scan' && scanCount >= 10);
  await check('century_scanner', action === 'scan' && scanCount >= 100);
  await check('scan_master',     action === 'scan' && scanCount >= 500);

  // Collection milestones
  await check('starting_out',       action === 'add' && collectionSize >= 1);
  await check('growing',            action === 'add' && collectionSize >= 10);
  await check('serious_collector',  action === 'add' && collectionSize >= 50);
  await check('century_collection', action === 'add' && collectionSize >= 100);

  // Geography
  const countryCount = countries?.size ?? 0;
  await check('world_traveler', countryCount >= 5);
  await check('global_citizen', countryCount >= 10);
  await check('euro_explorer',  [...(countries ?? [])].filter((c) => EU_COUNTRIES.has(c)).length >= 5);

  // Era & material (metadata from current scan)
  if (action === 'scan' && metadata) {
    await check('ancient_history', metadata.era === 'ancient');
    await check('silver_age',      (metadata.composition ?? '').toLowerCase().includes('silver'));
    await check('gold_standard',   (metadata.composition ?? '').toLowerCase().includes('gold'));
    await check('medieval_times',  metadata.era === 'medieval');
    await check('rare_find',       metadata.rarity === 'rare' || metadata.rarity === 'legendary');
    await check('legendary_hunter',metadata.rarity === 'legendary');
  }

  // Level milestones
  await check('level_5',  level >= 5);
  await check('level_10', level >= 10);
  await check('level_15', level >= 15);
  await check('level_20', level >= 20);

  return newlyEarned;
}

export async function upsertChallengeProgress(challengeId, progress, completed, cycleStart) {
  const { error } = await supabase.from('user_challenges').upsert({
    challenge_id: challengeId,
    progress,
    completed_at: completed ? new Date().toISOString() : null,
    cycle_start:  cycleStart,
  }, { onConflict: 'user_id,challenge_id,cycle_start' });
  if (error) console.warn('upsertChallengeProgress error:', error.message);
}
