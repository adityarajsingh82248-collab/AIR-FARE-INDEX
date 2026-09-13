/**
 * AFI (Air Fare Index) Data Model
 * ────────────────────────────────
 * Defines the data shape for AFI prediction results.
 * The trained ML model is NOT yet integrated.
 *
 * When the trained model is provided, replace the implementation of
 * afiPredictionService.js — this model shape stays the same.
 *
 * Data flows (future):
 *   Aviationstack Data → Data Processing → Trained AFI Model → afiModel → View
 *
 * Data flows (current):
 *   Aviationstack Data → afiController → afiModel.createUnavailableAfiState() → View
 */

/**
 * @typedef {Object} AfiResult
 * @property {boolean}     available   - Whether an AFI value is available
 * @property {number|null} value       - The AFI index value (null if unavailable)
 * @property {string|null} reason      - Why the value is unavailable (if applicable)
 * @property {Object|null} metadata    - Additional model metadata (future)
 */

/**
 * Creates an "AFI not available" state.
 * Used when the trained model is not yet integrated.
 *
 * @param {string} [reason]
 * @returns {AfiResult}
 */
export function createUnavailableAfiState(reason = 'Trained model not yet integrated') {
  return {
    available: false,
    value: null,
    reason,
    metadata: null,
  };
}

/**
 * Creates a valid AFI result from trained model output.
 * Call this when the trained model is integrated.
 *
 * @param {number} value    - The AFI index value produced by the trained model
 * @param {Object} [meta]   - Optional model metadata (confidence, version, etc.)
 * @returns {AfiResult}
 */
export function createAfiResult(value, meta = null) {
  return {
    available: true,
    value,
    reason: null,
    metadata: meta,
  };
}
