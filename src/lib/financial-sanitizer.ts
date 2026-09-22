/**
 * Financial Data Sanitizer & Safe Math Engine
 * Handles international currencies, accounting negative notation,
 * European/US number formats, and zero-division safety.
 */

export function sanitizeFinancialNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? 0 : val;
  }

  let str = String(val).trim();
  if (!str || str === '-' || str === '—' || str === '–' || str === 'N/A' || str === 'n/a' || str === 'null') {
    return 0;
  }

  // Handle accounting parentheses negative: (1,250.00), ( $ 1,500 ), ($100)
  const isParenthesesNegative = /^\s*\((.*?)\)\s*$/.test(str);
  str = str.replace(/[()]/g, '');

  // Handle trailing minus: "1000-" -> "-1000"
  let isTrailingNegative = false;
  if (str.endsWith('-')) {
    isTrailingNegative = true;
    str = str.slice(0, -1);
  }

  // Remove currency symbols, non-breaking spaces, and whitespace
  // Strips $, €, £, ¥, C$, Q, L, S/, R$, USD, EUR, etc.
  str = str.replace(/[\$\€\£\¥\₹\₽\₪\₩\₫\₡\₮\₦\₭\₲\₴\₵\₸\₹]/g, '');
  str = str.replace(/\b(usd|eur|cop|mxn|clp|ars|pen|bob|uyu|pyg|crc|gtq|hnl|nio|dop|bs|c\$)\b/gi, '');
  str = str.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
  str = str.replace(/[^0-9.,\-+]/g, '').trim();

  if (!str || str === '-' || str === '+') return 0;

  // Handle European vs US thousands & decimals (e.g. 1.250.000,50 vs 1,250,000.50)
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.320.000,50 format -> dot is thousands, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,320,000.50 format -> comma is thousands, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length > 2) {
      // Multiple commas: 1,320,000 -> thousands separator
      str = str.replace(/,/g, '');
    } else if (parts.length === 2) {
      // Single comma: e.g. "1,50" (decimal) vs "1,000" (thousands)
      if (parts[1].length === 3 && parts[0].length >= 1) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(',', '.');
      }
    }
  }

  let num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) return 0;

  if (isParenthesesNegative || isTrailingNegative) {
    num = -Math.abs(num);
  }

  return num;
}

export const safeNumber = (num: number | undefined | null): number => {
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return 0;
  return num;
};

export const safeDiv = (numerator: number | null | undefined, denominator: number | null | undefined, fallback: number | null = null): number | null => {
  const n = safeNumber(numerator);
  const d = safeNumber(denominator);
  if (d === 0 || !isFinite(n) || !isFinite(d)) {
    return fallback;
  }
  const res = n / d;
  return isFinite(res) ? res : fallback;
};

export const safePct = (numerator: number | null | undefined, denominator: number | null | undefined, fallback: number | null = null): number | null => {
  const ratio = safeDiv(numerator, denominator, null);
  if (ratio === null) return fallback;
  return ratio * 100;
};
