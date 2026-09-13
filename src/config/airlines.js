// Air Fare Index — Static Airline Reference Configuration
// This is legitimate config data, NOT mock data.
// Represents the 5 domestic carriers present in the authoritative dataset.
// Source: airfare_index_upgraded_8airports.csv
// DO NOT add airlines not present in the dataset.

export const AIRLINES = [
  { id: 'all', name: 'All Airlines' },
  { id: '6E', name: 'IndiGo (6E)', iata: '6E', fullName: 'IndiGo (InterGlobe Aviation)', datasetName: 'IndiGo' },
  { id: 'AI', name: 'Air India (AI)', iata: 'AI', fullName: 'Air India (Tata Group)', datasetName: 'Air India' },
  { id: 'IX', name: 'Air India Express (IX)', iata: 'IX', fullName: 'Air India Express', datasetName: 'Air India Express' },
  { id: 'QP', name: 'Akasa Air (QP)', iata: 'QP', fullName: 'Akasa Air (SNV Aviation)', datasetName: 'Akasa Air' },
  { id: 'SG', name: 'SpiceJet (SG)', iata: 'SG', fullName: 'SpiceJet', datasetName: 'SpiceJet' },
];

/** Returns an airline config object by IATA code, or undefined. */
export function getAirlineByIata(iata) {
  return AIRLINES.find((a) => a.iata === iata);
}

/** Returns an airline config object by dataset name, or undefined. */
export function getAirlineByDatasetName(name) {
  return AIRLINES.find((a) => a.datasetName === name);
}
