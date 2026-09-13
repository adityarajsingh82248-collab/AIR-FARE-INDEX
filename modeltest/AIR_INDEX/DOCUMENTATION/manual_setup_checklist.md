# AIR-INDEX — Manual Setup Checklist

These are human tasks. None of them can be done by the coding agent, and none
of them are done yet as of this audit (2026-09-08). Sourced from IndiGo's own
public developer FAQ (`developer.goindigo.in/FAQs`) and Air India's NDC site
(`ndc.airindia.com`) — not assumed.

## IndiGo NDC (primary target)

- [ ] Confirm eligibility: direct access requires being an **IATA agent** or
      **TIDS agent**; non-GDS aggregator access requires being a **6E-authorized
      partner**. If the team is neither, identify which route applies (e.g. via
      an academic/SIH-use conversation with IndiGo, or via an existing
      IATA/TIDS-registered sponsor)
- [ ] Register on the **6E NDC Swagger Portal** (login + registration required
      per the FAQ)
- [ ] Request Test/UAT environment access (production is never granted
      directly — certification is mandatory first)
- [ ] Provide organization information as required during onboarding
- [ ] Explicitly confirm with IndiGo whether academic/SIH (non-commercial,
      demonstration-only) use is permitted under their terms — do not assume
      it is
- [ ] Obtain credentials: `INDIGO_NDC_SUBSCRIPTION_KEY`, `INDIGO_NDC_USERNAME`,
      `INDIGO_NDC_PASSWORD` (the FAQ describes Basic Auth over
      `username:password`, Base64-encoded, plus an `Ocp-Apim-Subscription-Key`
      header — matching what `COLLECTORS/indigo_ndc_collector.py` already sends)
- [ ] Provide the team's **public IP address(es)** for whitelisting — max 5 IPs
      combined across Test and Production per the FAQ. A laptop's home IP is
      not suitable for this; a stable server/VM IP is needed
- [ ] Confirm the actual base URL and endpoint paths for Test/UAT with IndiGo
      directly. **`.env.example`'s defaults
      (`https://client.ndc.navitaire.com`, `/v21.3/Authentication`,
      `/v21.3/AirShopping`) are engineering placeholders, not confirmed by
      IndiGo's public FAQ — verify them against the actual onboarding
      material/Swagger definition before the first real call.**
- [ ] Store credentials in a local, untracked `.env` file only
- [ ] **Never commit credentials to Git** — check `.gitignore` covers `.env`
      before the first commit with real secrets nearby
- [ ] Run the first UAT `AirShoppingRQ` for DEL-BOM, T+1, 1 adult, Economy
      manually (e.g. via curl or Postman) once credentials exist, to confirm
      the exact response shape before trusting the pipeline's parser against it
- [ ] Only after a genuine UAT response is confirmed, run
      `python -m PIPELINE.run_collection --live` (see `PHASE_2_COMPLETION.md`
      for the exact command and current fail-safe behavior)
- [ ] Complete IndiGo's certification test cycle (search, pricing, booking,
      post-booking scenarios per their FAQ) and submit results with full
      request/response logs to `6ENDC.SUP@goIndiGo.in` before requesting
      production access
- [ ] Request production access only after certification is formally approved

## Air India NDC (secondary — do not start until IndiGo is operational, per Part 5)

- [ ] Choose a connection channel at `ndc.airindia.com`: Direct Connect, Agent
      Portal, GDS, or Tech Service Provider
- [ ] Register for the chosen channel and confirm eligibility requirements
      (IATA/TIDS status is expected to matter here too, by analogy with IndiGo
      and with Travelport's public airline-registration notes for Air India)
- [ ] Obtain Test/UAT credentials and endpoint details
- [ ] Confirm SIH/academic-use permissibility explicitly with Air India
- [ ] Store credentials the same way as IndiGo's — local `.env` only, never
      committed
- [ ] Run and verify a first UAT AirShopping-equivalent call before trusting
      any pipeline output against it

## Infrastructure (applies regardless of which source goes live first)

- [ ] Stand up a real PostgreSQL instance the team controls (Docker locally is
      fine per Part 15/25, but is optional — a plain local install, as used in
      this audit, works too)
- [ ] Set `DATABASE_URL` in the environment before running `--live`
- [ ] Confirm the server's outbound IP is stable and matches whatever was
      whitelisted with the airline — a dynamic IP will silently break live
      collection days or weeks later

## What "done" looks like for this checklist

The checklist is complete when a real `AirShoppingRQ` for DEL-BOM/T+1 returns a
real IndiGo (or Air India) response, that response inserts at least one row
into `airfare_observations`, and `collection_runs` shows that run as
`SUCCESS` — matching Phase 5/6/21's acceptance condition. Nothing here should
be marked done based on code readiness alone.
