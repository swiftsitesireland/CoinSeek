export const CHALLENGE_TEMPLATES = [
  { id: 'daily_scan',         type: 'daily',  title: 'Daily Scanner',      description: 'Scan 1 coin today',                       xpReward: 25,  targetCount: 1, targetAction: 'scan' },
  { id: 'daily_add',          type: 'daily',  title: 'Quick Collector',    description: 'Add 1 coin to your collection',            xpReward: 25,  targetCount: 1, targetAction: 'add' },
  { id: 'weekly_scan_5',      type: 'weekly', title: 'Active Week',        description: 'Scan 5 coins this week',                   xpReward: 75,  targetCount: 5, targetAction: 'scan' },
  { id: 'weekly_countries_3', type: 'weekly', title: 'World Traveler',     description: 'Scan coins from 3 different countries',    xpReward: 100, targetCount: 3, targetAction: 'scan_countries' },
  { id: 'weekly_add_3',       type: 'weekly', title: 'Collection Builder', description: 'Add 3 coins to your collection this week', xpReward: 100, targetCount: 3, targetAction: 'add' },
  { id: 'weekly_rare',        type: 'weekly', title: 'Rare Finder',        description: 'Scan 1 rare or legendary coin',            xpReward: 150, targetCount: 1, targetAction: 'scan_rare' },
];

export function getChallenge(id) {
  return CHALLENGE_TEMPLATES.find((c) => c.id === id);
}

export function getDailyChallenges() {
  return CHALLENGE_TEMPLATES.filter((c) => c.type === 'daily');
}

export function getWeeklyChallenges() {
  return CHALLENGE_TEMPLATES.filter((c) => c.type === 'weekly');
}
