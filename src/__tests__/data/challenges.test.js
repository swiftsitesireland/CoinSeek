import { CHALLENGE_TEMPLATES, getChallenge, getDailyChallenges, getWeeklyChallenges } from '../../data/challenges';

describe('CHALLENGE_TEMPLATES', () => {
  it('has 6 entries', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(6);
  });

  it('every template has required fields', () => {
    CHALLENGE_TEMPLATES.forEach((c) => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('xpReward');
      expect(c).toHaveProperty('targetCount');
      expect(c).toHaveProperty('targetAction');
    });
  });
});

describe('getChallenge', () => {
  it('returns template with matching id', () => {
    expect(getChallenge('daily_scan').title).toBe('Daily Scanner');
  });
});

describe('getDailyChallenges / getWeeklyChallenges', () => {
  it('daily returns only daily type', () => {
    getDailyChallenges().forEach((c) => expect(c.type).toBe('daily'));
  });
  it('weekly returns only weekly type', () => {
    getWeeklyChallenges().forEach((c) => expect(c.type).toBe('weekly'));
  });
});
