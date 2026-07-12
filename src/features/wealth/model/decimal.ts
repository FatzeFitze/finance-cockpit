import Decimal from 'decimal.js';

declare const decimalBrand: unique symbol;
declare const nonNegativeBrand: unique symbol;

export type DecimalString = string & { readonly [decimalBrand]: true };
export type NonNegativeDecimalString = DecimalString & { readonly [nonNegativeBrand]: true };

const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -1_000_000_000,
  toExpPos: 1_000_000_000,
});

function canonicalize(value: string): string {
  const decimal = new Decimal(value);
  return decimal.isZero() ? '0' : decimal.toFixed();
}

export function parseDecimal(value: string): DecimalString {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new Error(`Invalid canonical decimal: ${JSON.stringify(value)}`);
  }

  return canonicalize(value) as DecimalString;
}

export function parseNonNegativeDecimal(value: string): NonNegativeDecimalString {
  if (value.startsWith('-')) {
    throw new Error('Expected a non-negative decimal magnitude');
  }

  return parseDecimal(value) as NonNegativeDecimalString;
}

export function decimal(value: DecimalString | NonNegativeDecimalString): Decimal {
  return new Decimal(value);
}

export function toDecimalString(value: Decimal.Value): DecimalString {
  const result = new Decimal(value);

  if (!result.isFinite()) {
    throw new Error('Financial calculations must produce a finite decimal');
  }

  return canonicalize(result.toFixed()) as DecimalString;
}

export function toNonNegativeDecimalString(value: Decimal.Value): NonNegativeDecimalString {
  const result = new Decimal(value);

  if (result.isNegative()) {
    throw new Error('Expected a non-negative decimal magnitude');
  }

  return toDecimalString(result) as NonNegativeDecimalString;
}

export function roundDecimal(
  value: DecimalString,
  decimalPlaces: number,
  rounding: Decimal.Rounding = Decimal.ROUND_HALF_UP,
): DecimalString {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new Error('Decimal places must be a non-negative integer');
  }

  return parseDecimal(decimal(value).toDecimalPlaces(decimalPlaces, rounding).toFixed());
}
