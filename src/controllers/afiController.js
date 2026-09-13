/**
 * AFI Controller
 * ───────────────
 * Orchestrates the AFI prediction pipeline.
 * Currently returns an "unavailable" state since the trained model
 * is not yet integrated.
 *
 * FUTURE INTEGRATION:
 * When the trained model is provided, update afiPredictionService.js.
 * This controller's interface and data flow remain unchanged.
 *
 * Data flow (current):
 *   Hook → afiController.getAfiResult() → afiPredictionService → AfiResult { available: false }
 *
 * Data flow (future):
 *   Hook → afiController.getAfiResult() → afiPredictionService → AfiResult { available: true, value: N }
 */

import { predictAfi } from '../services/model/afiPredictionService.js';

/**
 * Returns the AFI prediction for the given flight data.
 * Returns an unavailable state until the trained model is integrated.
 *
 * @param {import('../models/flightModel').NormalizedFlight[]} flightData
 * @returns {Promise<import('../models/afiModel').AfiResult>}
 */
export async function getAfiResult(flightData) {
  return predictAfi(flightData);
}
