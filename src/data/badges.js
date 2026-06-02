export const BADGES = [
  // ── Scanning ──────────────────────────────────────────────────────────────
  { id: 'first_scan',        emoji: '📷', name: 'First Scan',         description: 'Scan your first coin',         category: 'scanning',   criteria: { action: 'scan',       count: 1 } },
  { id: 'warm_up',           emoji: '🔥', name: 'Warm Up',            description: 'Scan 10 coins',                category: 'scanning',   criteria: { action: 'scan',       count: 10 } },
  { id: 'century_scanner',   emoji: '💯', name: 'Century Scanner',    description: 'Scan 100 coins',               category: 'scanning',   criteria: { action: 'scan',       count: 100 } },
  { id: 'scan_master',       emoji: '🎖️', name: 'Scan Master',        description: 'Scan 500 coins',               category: 'scanning',   criteria: { action: 'scan',       count: 500 } },
  // ── Collection ────────────────────────────────────────────────────────────
  { id: 'starting_out',      emoji: '🌱', name: 'Starting Out',       description: 'Add your first coin',          category: 'collection', criteria: { action: 'add',        count: 1 } },
  { id: 'growing',           emoji: '📦', name: 'Growing Collection', description: 'Add 10 coins',                 category: 'collection', criteria: { action: 'add',        count: 10 } },
  { id: 'serious_collector', emoji: '🏛️', name: 'Serious Collector',  description: 'Add 50 coins',                 category: 'collection', criteria: { action: 'add',        count: 50 } },
  { id: 'century_collection',emoji: '🗄️', name: 'Century Collection', description: 'Add 100 coins',                category: 'collection', criteria: { action: 'add',        count: 100 } },
  // ── Geography ─────────────────────────────────────────────────────────────
  { id: 'world_traveler',    emoji: '🌍', name: 'World Traveler',     description: 'Coins from 5 countries',       category: 'geography',  criteria: { action: 'countries',  count: 5 } },
  { id: 'global_citizen',    emoji: '🌐', name: 'Global Citizen',     description: 'Coins from 10 countries',      category: 'geography',  criteria: { action: 'countries',  count: 10 } },
  { id: 'euro_explorer',     emoji: '🇪🇺', name: 'Euro Explorer',      description: 'Coins from 5 European countries', category: 'geography', criteria: { action: 'eu_countries', count: 5 } },
  // ── Era & Material ────────────────────────────────────────────────────────
  { id: 'ancient_history',   emoji: '🏛️', name: 'Ancient History',    description: 'Scan a Roman or ancient coin', category: 'era',        criteria: { action: 'scan_era',   era: 'ancient' } },
  { id: 'silver_age',        emoji: '🌕', name: 'Silver Age',         description: 'Scan a silver coin',           category: 'era',        criteria: { action: 'scan_metal', metal: 'silver' } },
  { id: 'gold_standard',     emoji: '🥇', name: 'Gold Standard',      description: 'Scan a gold coin',             category: 'era',        criteria: { action: 'scan_metal', metal: 'gold' } },
  { id: 'medieval_times',    emoji: '⚔️', name: 'Medieval Times',     description: 'Scan a medieval coin',         category: 'era',        criteria: { action: 'scan_era',   era: 'medieval' } },
  { id: 'modern_era',        emoji: '🏭', name: 'Modern Era',         description: 'Scan 10 post-1900 coins',      category: 'era',        criteria: { action: 'scan_modern', count: 10 } },
  // ── Rarity ────────────────────────────────────────────────────────────────
  { id: 'rare_find',         emoji: '💎', name: 'Rare Find',          description: 'Scan a rare coin',             category: 'rarity',     criteria: { action: 'scan_rare',  count: 1 } },
  { id: 'legendary_hunter',  emoji: '👑', name: 'Legendary Hunter',   description: 'Scan a legendary coin',        category: 'rarity',     criteria: { action: 'scan_legendary', count: 1 } },
  { id: 'rarity_seeker',     emoji: '🔍', name: 'Rarity Seeker',      description: 'Scan 5 rare or legendary coins',category: 'rarity',   criteria: { action: 'scan_rare',  count: 5 } },
  // ── Challenges ────────────────────────────────────────────────────────────
  { id: 'challenge_accepted',emoji: '🎯', name: 'Challenge Accepted', description: 'Complete your first challenge',category: 'challenges', criteria: { action: 'challenge',  count: 1 } },
  { id: 'weekly_warrior',    emoji: '⚔️', name: 'Weekly Warrior',     description: 'Complete 4 weekly challenges', category: 'challenges', criteria: { action: 'weekly_challenge', count: 4 } },
  { id: 'daily_devotion',    emoji: '📅', name: 'Daily Devotion',     description: 'Complete 7 daily challenges',  category: 'challenges', criteria: { action: 'daily_challenge',  count: 7 } },
  { id: 'streak_7',          emoji: '🔥', name: 'On Fire',            description: '7-day scan streak',           category: 'challenges', criteria: { action: 'streak',     count: 7 } },
  // ── Level milestones ──────────────────────────────────────────────────────
  { id: 'level_5',           emoji: '⭐', name: 'Rising Star',        description: 'Reach level 5',               category: 'levels',     criteria: { action: 'level',      count: 5 } },
  { id: 'level_10',          emoji: '🌟', name: 'Expert Eye',         description: 'Reach level 10',              category: 'levels',     criteria: { action: 'level',      count: 10 } },
  { id: 'level_15',          emoji: '💫', name: 'Elite Collector',    description: 'Reach level 15',              category: 'levels',     criteria: { action: 'level',      count: 15 } },
  { id: 'level_20',          emoji: '🏆', name: 'Master',             description: 'Reach level 20',              category: 'levels',     criteria: { action: 'level',      count: 20 } },
  // ── Special ───────────────────────────────────────────────────────────────
  { id: 'wishlist_10',       emoji: '💫', name: 'Dream Collector',    description: 'Add 10 coins to wishlist',     category: 'collection', criteria: { action: 'wishlist',   count: 10 } },
  { id: 'share_1',           emoji: '📤', name: 'Show Off',           description: 'Share a coin result',          category: 'special',    criteria: { action: 'share',      count: 1 } },
  { id: 'profile_complete',  emoji: '✅', name: 'All Set',            description: 'Complete your profile',        category: 'special',    criteria: { action: 'profile',    count: 1 } },
];

export function getBadge(id) {
  return BADGES.find((b) => b.id === id);
}

export function getBadgesByCategory(category) {
  return BADGES.filter((b) => b.category === category);
}
