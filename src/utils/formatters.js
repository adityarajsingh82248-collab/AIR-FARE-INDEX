/**
 * Formatting Utilities
 * ─────────────────────
 * Centralised number and currency formatting helpers.
 * Previously these were inline in JSX components.
 */

/**
 * Formats a number as Indian Rupees.
 * e.g. 7420 → "₹7,420"
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Formats a large number with Indian locale separators.
 * e.g. 4912480 → "4,912,480"
 *
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-IN');
}

/**
 * Formats a percentage change with sign.
 * e.g. 4.2 → "+4.2%", -1.5 → "-1.5%"
 *
 * @param {number} value
 * @returns {string}
 */
export function formatPercentChange(value) {
  if (value == null || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
