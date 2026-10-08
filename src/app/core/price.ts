import { numberLocale, t } from '../../locale/locale';

const MAX_PRICE = 999_999_999;

export function parsePrice(value: string): number {
  const digits = toWesternDigits(value).replace(/\D/g, '');
  if (!digits) throw new Error(t().errors.priceRequired);
  const price = Number(digits);
  if (!Number.isSafeInteger(price) || price < 1 || price > MAX_PRICE) {
    throw new Error(t().errors.priceRange);
  }
  return price;
}

export function groupPriceInput(value: string, caret: number): { text: string; caret: number } {
  const western = toWesternDigits(value);
  const safeCaret = Math.max(0, Math.min(caret, western.length));
  const digitsBefore = western.slice(0, safeCaret).replace(/\D/g, '').length;
  const digits = western.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
  const text = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let seen = 0;
  let next = 0;
  const target = Math.min(digitsBefore, digits.length);
  if (target === 0) return { text, caret: 0 };
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== ',') seen += 1;
    if (seen >= target) {
      next = index + 1;
      break;
    }
  }
  return { text, caret: next };
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat(numberLocale()).format(value)} ${t().currency}`;
}

function toWesternDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}
