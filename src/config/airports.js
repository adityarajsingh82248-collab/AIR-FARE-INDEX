// Air Fare Index — Static Airport Reference Configuration
// This is legitimate config data, NOT mock data.
// Represents the 8 Indian domestic airports monitored by the AFI system.
// Source: airfare_index_upgraded_8airports.csv (authoritative dataset)
// DO NOT add airports outside this list — they are not in the authoritative dataset.

export const AIRPORTS = [
  { code: 'DEL', name: 'Indira Gandhi Int Airport (DEL)', city: 'Delhi' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj Int (BOM)', city: 'Mumbai' },
  { code: 'BLR', name: 'Kempegowda Int Airport (BLR)', city: 'Bengaluru' },
  { code: 'HYD', name: 'Rajiv Gandhi Int Airport (HYD)', city: 'Hyderabad' },
  { code: 'MAA', name: 'Chennai Int Airport (MAA)', city: 'Chennai' },
  { code: 'CCU', name: 'Netaji Subhash Chandra Bose Int (CCU)', city: 'Kolkata' },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel Int (AMD)', city: 'Ahmedabad' },
  { code: 'GOI', name: 'Dabolim Airport (GOI)', city: 'Goa' },
];

/** Returns an airport config object by IATA code, or undefined. */
export function getAirportByCode(code) {
  return AIRPORTS.find((a) => a.code === code);
}
