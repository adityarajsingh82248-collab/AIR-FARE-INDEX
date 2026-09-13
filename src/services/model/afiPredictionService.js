/**
 * AFI Prediction Service
 * ───────────────────────
 * This is the integration boundary for the trained ML model.
 *
 * CURRENT STATE: Model not yet integrated.
 * Returns a clear "unavailable" state — does NOT fabricate predictions.
 *
 * FUTURE INTEGRATION:
 * When the trained model is provided, replace the body of `predictAfi()`
 * with the real model inference call. The function signature and return
 * shape (AfiResult) must remain the same so no View or Controller code changes.
 *
 * Data flow (future):
 *   flightData → Feature Extraction → Trained Model → createAfiResult(value)
 *
 * Data flow (current):
 *   flightData → createUnavailableAfiState()
 */

import { createUnavailableAfiState } from '../../models/afiModel.js';

/**
 * Predicts the Air Fare Index for the given flight data.
 *
 * @param {import('../../models/flightModel').NormalizedFlight[]} flightData
 * @returns {Promise<import('../../models/afiModel').AfiResult>}
 */
export async function predictAfi(flightData) {
  // ─────────────────────────────────────────────────────────────────────────
  // TODO: Replace this stub when the trained model is provided.
  //
  // Example future implementation:
  //   const features = extractFeatures(flightData);
  //   const prediction = await trainedModel.predict(features);
  //   return createAfiResult(prediction.value, prediction.metadata);
  // ─────────────────────────────────────────────────────────────────────────

  // Do NOT fabricate AFI values.
  // Do NOT use Math.random() or hardcoded numbers.
  return createUnavailableAfiState('Trained model not yet integrated');
}
