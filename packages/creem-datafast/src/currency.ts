const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD",
  "IQD",
  "JOD",
  "KWD",
  "LYD",
  "OMR",
  "TND",
]);

export function getCurrencyExponent(currency: string): number {
  const normalized = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return 0;
  }

  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 3;
  }

  return 2;
}

export function minorToMajorAmount(amount: number, currency: string): number {
  const exponent = getCurrencyExponent(currency);
  const scaled = amount / 10 ** exponent;
  return Number(scaled.toFixed(exponent));
}
