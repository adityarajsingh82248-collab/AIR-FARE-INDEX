# AIR-INDEX — Manual vs. Coding-Agent Responsibilities

This project's remaining work splits cleanly into two categories. Conflating
them is the main risk to an honest Phase 2 status — it's easy to make the code
*look* done while the actual blocker (a human relationship with an airline)
hasn't moved at all.

## What a coding agent can legitimately do

- Build and maintain collector adapters (HTTP/Playwright/NDC), including auth
  header construction, retry/backoff, and pacing
- Construct and validate NDC XML requests (AirShoppingRQ) and parse responses
- Normalize, validate, and deduplicate observations (Phase 1-compatible schema)
- Build and evolve the PostgreSQL schema, loader, transactions, and run tracking
- Write and maintain the scheduler, including fail-safe behavior (never falling
  back from LIVE to FIXTURE)
- Write tests (unit, integration-against-a-real-local-Postgres, regression)
- Write and update documentation, source audits, and configuration validation
- Read and summarize a source's *own published* API/NDC documentation and
  eligibility rules (as this audit did for IndiGo, Air India, DGCA, and MoSPI)
- Flag exactly which credentials/variables are missing, without ever
  fabricating or guessing at their values

## What a coding agent cannot legitimately do

These require a human, acting in the team's name, taking on real-world
obligations:

- **Register as an IATA or TIDS agent**, or otherwise become an eligible NDC
  seller — this is an industry accreditation, not a technical integration step
- **Apply for / accept IndiGo's or Air India's NDC partner terms**, including
  signing any Solution Design Document or certification sign-off
- **Request and receive IP whitelisting** — a real, static, team-controlled IP
  has to exist and be submitted to the airline before any live call can succeed
- **Obtain and store subscription keys / usernames / passwords** — these are
  issued to a verified legal or institutional entity, not to an agent
- **Complete the airline's certification test cycle** (IndiGo: submit results
  and payload logs to `6ENDC.SUP@goIndiGo.in`; Air India: register via the
  channel of choice at `ndc.airindia.com`) and receive formal production approval
- **Decide whether to enable a source as `LIVE`** in `CONFIG/sources.yaml` —
  this is a judgment call that should only follow real authorization, and this
  audit has deliberately left it untouched for that reason
- **Contact MoSPI/PSD** about any data-sharing mechanism for CPI-adjacent
  airfare data — this is an institutional outreach, not an API call
- **Bypass** CAPTCHA, robots.txt, Terms of Service, authentication, rate
  limits, or IP restrictions on any site — not "cannot obtain permission for,"
  genuinely will not do regardless of who asks or why

## The dividing line in one sentence

If the next step is "write or fix code," it belongs to the coding agent. If
the next step is "someone has to click Register, fill a form, sign something,
or wait for a human at IndiGo/Air India/MoSPI to reply," it belongs to the team
— see `manual_setup_checklist.md` for the concrete task list.
