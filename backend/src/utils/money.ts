import Decimal from 'decimal.js';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  /**
   * Safely rounds a number to 2 decimal places using ROUND_HALF_UP
   */
  static round(val: number | string | Decimal): number {
    return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Exact addition
   */
  static add(a: number | string, b: number | string): number {
    return new Decimal(a).plus(new Decimal(b)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Exact subtraction
   */
  static subtract(a: number | string, b: number | string): number {
    return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Exact multiplication
   */
  static multiply(a: number | string, b: number | string): number {
    return new Decimal(a).times(new Decimal(b)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Calculate percentage (e.g. rate 15% on 200 => 30)
   */
  static calcPercentage(base: number | string, ratePercent: number | string): number {
    return new Decimal(base)
      .times(new Decimal(ratePercent))
      .dividedBy(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  /**
   * Format for display
   */
  static format(amount: number | string, currency: string = 'USD'): string {
    const num = Money.round(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  }
}
