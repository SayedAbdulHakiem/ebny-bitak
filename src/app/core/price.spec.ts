import { formatPrice, groupPriceInput, parsePrice } from './price';

describe('price', () => {
  it('reads western and Arabic digits', () => {
    expect(parsePrice('2,700,000')).toBe(2700000);
    expect(parsePrice('٢٧٠٠٠٠٠')).toBe(2700000);
    expect(() => parsePrice('')).toThrow();
    expect(() => parsePrice('0')).toThrow();
  });

  it('groups the input every three digits', () => {
    expect(groupPriceInput('2700000', 7)).toEqual({ text: '2,700,000', caret: 9 });
    expect(groupPriceInput('2,700,000', 5).text).toBe('2,700,000');
    expect(groupPriceInput('١٢٣٤٥٦٧', 7).text).toBe('1,234,567');
  });

  it('formats the amount in Egyptian pounds', () => {
    expect(formatPrice(2700000)).toContain('جنيه');
    expect(parsePrice(formatPrice(2700000))).toBe(2700000);
  });
});
