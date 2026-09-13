# AIR-INDEX — Source Feasibility Matrix

Compiled 2026-09-08. Grounded in each source's own public documentation
(IndiGo developer portal FAQ, Air India NDC site, published NDC/press material,
DGCA monthly traffic releases, and MoSPI's public CPI 2024 base-revision
announcements) plus the existing robots.txt/Terms audit in `source_audit.csv`.
Nothing below is claimed as access actually obtained — see
`manual_setup_checklist.md` for what remains to be done by a human.

| Source | Type | Official URL | API/NDC available? | Authorization required? | Technical feasibility | Legal/access feasibility | Project priority | Status |
|---|---|---|---|---|---|---|---|---|
| IndiGo | Airline (LCC) | https://developer.goindigo.in/ | Yes — NDC 21.3.5 (AirShoppingRQ/RS, OfferPriceRQ/RS, OrderCreate/Retrieve/Change/Cancel) | Yes — eligible sellers only: IATA agents, TIDS agents (direct), or 6E-authorized non-GDS aggregators/tech service providers. IP whitelisting (max 5 IPs) + mandatory certification before production. | HIGH once credentialed — official XML/HTTPS API, documented auth (Basic + subscription key), collector already built | NOT YET GRANTED — a student/SIH team is not automatically an eligible seller; requires registering on the 6E NDC Swagger Portal and completing certification | **1 (primary target)** | `AUTHORIZATION_PENDING` |
| Air India | Airline (FSC) | https://ndc.airindia.com/ | Yes — NDC 21.3, live since Sep 2024. Four channels: Direct Connect, Agent Portal, GDS, Tech Service Provider | Yes — registration required for API/direct access; GDS route requires IATA/TIDS + GDS enablement | MEDIUM — schema is documented at a similar level to IndiGo, but no collector built yet | NOT YET GRANTED — same seller-eligibility barrier as IndiGo | 2 (secondary, per Part 5 — do not build before IndiGo works) | `DEFERRED / PENDING AUTHORIZATION` |
| Air India Express | Airline (LCC, Air India Group) | https://www.airindiaexpress.com/ | Not confirmed publicly at LCC-subsidiary level | Presumed yes, if/when available | LOW — unconfirmed | NOT_GRANTED; robots/Terms not fully verified (see `source_audit.csv`) | Low | `DEFERRED` |
| Akasa Air | Airline (LCC) | https://www.akasaair.com/ | No public NDC program identified | N/A | LOW | robots has no explicit disallow, but ToS/authorization not verified — scraping is not a substitute for API access | Low | `DEFERRED` |
| SpiceJet | Airline (LCC) | https://www.spicejet.com/ | No public NDC program identified | N/A | LOW | robots disallows booking/search API paths (`/externalBooking` etc.) | Low | `RESTRICTED` |
| MakeMyTrip | OTA | https://www.makemytrip.com/ | Partner/affiliate APIs exist commercially but are not self-serve; none integrated here | Yes — commercial partner agreement | LOW without a partner agreement | robots disallows `/flight/search*`, `/flight/fis`, `/air/*` | Low | `RESTRICTED` |
| Yatra | OTA | https://www.yatra.com/ | No public self-serve fare API identified | N/A | LOW | robots disallows flight-search paths | Low | `RESTRICTED` |
| EaseMyTrip | OTA | https://www.easemytrip.com/ | No public self-serve fare API identified | N/A | LOW | robots disallows flight-search/cheap-flight paths | Low | `RESTRICTED` |
| Cleartrip | OTA | https://www.cleartrip.com/ | No public self-serve fare API identified | N/A | LOW | robots/Terms not fully verifiable in this audit | Low | `DEFERRED` |
| Ixigo | OTA | https://www.ixigo.com/ | No public self-serve fare API identified | N/A | LOW | Terms explicitly prohibit automated/non-human access, scraping, data mining | Low | `RESTRICTED` |
| Goibibo | OTA | https://www.goibibo.com/ | No public self-serve fare API identified | N/A | LOW | robots disallows `/flights/new/` and flight-search query patterns | Low | `RESTRICTED` |
| DGCA | Government (aviation regulator) | https://www.dgca.gov.in/ | No fare API. Publishes monthly domestic/international **traffic** reports (passengers carried, market share, on-time performance, complaints) as public releases, not machine-readable fare data | No — public releases | HIGH for what it actually offers (route/carrier/traffic reference), N/A for fares | Publicly available; safe to cite as reference data | Reference only (Part 7) | `REFERENCE_SOURCE — not a fare feed` |
| MoSPI / NSO | Government (statistics ministry) | https://www.mospi.gov.in/ | No public real-time airfare API or feed identified. MoSPI's own CPI 2024 base-revision material (effective the Jan-2026 index, released 12 Feb 2026) states airfare price data for the revised CPI series is compiled internally "from online sources using web-based methods," with international-direct-route airfares folded into the price-collection framework — this is MoSPI's own internal collection process, not a published dataset or API for external use | Unknown — no public data-sharing mechanism found | N/A until a mechanism is confirmed | Nothing to bypass; nothing to build against without contact | Positioning reference only (Part 6) | `MANUAL_EXTERNAL_DEPENDENCY — no API/feed identified; would require direct outreach to MoSPI/PSD` |

## Reading this table

- **Priority 1 remains IndiGo NDC**, exactly as scoped in Part 4 — it is the only
  source with both a documented, IATA-standard API *and* an existing collector
  in this codebase. The blocker is seller eligibility and certification, not
  engineering.
- **Air India NDC is architecturally the same shape as IndiGo** (same IATA 21.3
  schema family), so once IndiGo's collector is proven against real credentials,
  adapting it for Air India is expected to be a config/endpoint change rather
  than new architecture — but per Part 5, that work should wait until IndiGo is
  operational.
- **No OTA in this list has a self-serve public fare API.** Every one either
  disallows automated flight-search paths in `robots.txt`, prohibits scraping in
  its Terms, or both (full detail in `source_audit.csv`). None are scraped by
  this project.
- **DGCA is a legitimate public source, but for traffic volumes, not fares.**
  It's useful for route-basket justification (Part 7) — e.g. corroborating that
  the six configured routes are genuinely high-traffic — not for price data.
- **MoSPI's CPI 2024 series now includes airfare as a priced item**, which is
  the correct framing for this project: AIR-INDEX is a higher-frequency,
  automated *augmentation* alongside MoSPI's own collection, not a claim that
  MoSPI has no airfare data. MoSPI does not appear to publish that airfare feed
  externally, so there is nothing to integrate against without direct contact.
