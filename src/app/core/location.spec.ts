import { buildLocationKey, isRegion, isSector, normalizeHouseNumber } from './location';

describe('location key', () => {
  it('accepts regions 1 to 7 and sectors from أ to ي', () => {
    expect(isRegion(1)).toBe(true);
    expect(isRegion(7)).toBe(true);
    expect(isRegion(0)).toBe(false);
    expect(isSector('أ')).toBe(true);
    expect(isSector('ي')).toBe(true);
    expect(isSector('x')).toBe(false);
  });

  it('builds one key for the same house number with extra spaces', () => {
    expect(normalizeHouseNumber(' 12-أ ')).toBe('12-أ');
    expect(buildLocationKey(3, 'ب', ' 15 ')).toBe('3_ب_15');
  });

  it('rejects an unknown sector or a number that would break the key', () => {
    expect(buildLocationKey(3, 'لا', '15')).toBeNull();
    expect(buildLocationKey(3, 'ب', '1_5')).toBeNull();
    expect(buildLocationKey(9, 'ب', '15')).toBeNull();
  });
});
