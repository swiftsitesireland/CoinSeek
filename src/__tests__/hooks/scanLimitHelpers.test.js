import { usedFromRemaining, msUntilUtcMidnight } from '../../hooks/scanLimitHelpers';

describe('usedFromRemaining', () => {
  it('converts remaining to used against the limit', () => {
    expect(usedFromRemaining(3, 2)).toBe(1);
    expect(usedFromRemaining(3, 0)).toBe(3);
    expect(usedFromRemaining(3, 3)).toBe(0);
  });
  it('treats premium (-1 remaining) as 0 used', () => {
    expect(usedFromRemaining(3, -1)).toBe(0);
  });
  it('never returns negative', () => {
    expect(usedFromRemaining(3, 5)).toBe(0);
  });
});

describe('msUntilUtcMidnight', () => {
  it('computes ms to the next UTC midnight', () => {
    const now = new Date('2026-06-02T23:00:00.000Z');
    expect(msUntilUtcMidnight(now)).toBe(60 * 60 * 1000);
  });
  it('is a full day just after UTC midnight', () => {
    const now = new Date('2026-06-02T00:00:00.000Z');
    expect(msUntilUtcMidnight(now)).toBe(24 * 60 * 60 * 1000);
  });
});
