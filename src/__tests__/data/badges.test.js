import { BADGES, getBadge, getBadgesByCategory } from '../../data/badges';

describe('BADGES', () => {
  it('has 30 entries', () => {
    expect(BADGES).toHaveLength(30);
  });

  it('every badge has required fields', () => {
    BADGES.forEach((b) => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('emoji');
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('description');
      expect(b).toHaveProperty('category');
      expect(b).toHaveProperty('criteria');
    });
  });
});

describe('getBadge', () => {
  it('returns the badge with matching id', () => {
    const badge = getBadge('first_scan');
    expect(badge.name).toBe('First Scan');
  });

  it('returns undefined for unknown id', () => {
    expect(getBadge('nonexistent')).toBeUndefined();
  });
});

describe('getBadgesByCategory', () => {
  it('returns only badges in the given category', () => {
    const scanning = getBadgesByCategory('scanning');
    expect(scanning.length).toBeGreaterThan(0);
    scanning.forEach((b) => expect(b.category).toBe('scanning'));
  });
});
