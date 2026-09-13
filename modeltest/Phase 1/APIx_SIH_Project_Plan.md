# APIx — Real-time Airfare Price Index for India
**SIH 2026 · Problem Statement #26056 · MoSPI (Data Informatics & Innovation Division)**

---

## 1. What this project actually is

Strip away the jargon and it's this: **build a system that watches Indian flight prices every day and turns them into a single trustworthy number** — like a "Sensex for airfares" — that MoSPI/RBI can plug into the CPI's Transport & Communication sub-index instead of relying on manual price collection from a handful of ticket counters.

Four things need to exist by the end:
1. **A scraping engine** that pulls live fares from 5 airline sites (IndiGo, Air India, Air India Express, Akasa, SpiceJet) + OTAs (MakeMyTrip, Yatra, EaseMyTrip, Cleartrip, Ixigo, Goibibo) for a fixed basket of city-pairs, at 5 booking horizons (T+1/7/15/30/45).
2. **A cleaned, structured database** — deduplicated, outliers removed, base fare separated from taxes/UDF/convenience fees.
3. **An index-construction module** — turns thousands of raw fares into one daily/weekly/monthly index number, weighted by route importance (DGCA traffic share), validated against real DGCA data.
4. **A dashboard + API** — trends, sector-wise heatmaps, lead-time elasticity curves, and a consumable API for NSO/RBI.

Everything else (anti-bot handling, ML cleaning, forecasting) is in service of these four.

---

## 2. Is it a good pick? (honest rating)

**Rating: strong pick — 8/10.** Here's the reasoning, not just the number:

**Why it's good:**
- It's a **ministry-backed, real-world problem** with a genuine government use case (RBI monetary policy inputs) — judges tend to rate these higher than generic "app idea" statements because there's a real client and a real success metric (does your index track DGCA's actual average fares?).
- The scope **maps almost perfectly onto your team's skill mix** — data science (index theory, weighting), AI (anomaly detection, elasticity/forecasting), full stack (scraping infra, dashboard, API). You won't have people doing work outside their lane.
- It has a **built-in validation story** ("back-test 30 days against DGCA data") — this gives you a concrete, demoable "we were right" moment for judges instead of a vague "trust our numbers."

**Where the real risk is (be honest with your team about this):**
- **Anti-bot arms race is the #1 execution risk**, not the index math. MakeMyTrip, IndiGo, etc. run serious bot-detection (Cloudflare/Akamai-class, device fingerprinting, dynamic CAPTCHAs). A student team will not "solve" this at production scale in hackathon time. Plan for this from day one: pick 1–2 airline direct sites that are comparatively scrape-friendly for your **live demo**, and have a **cached/pre-collected dataset as fallback** for the rest — judges care that the methodology and pipeline work, not that you're live-scraping IndiGo on stage.
- **Legal/ethical scraping is a genuine gray area**, not a checkbox. Most OTA ToS technically prohibit scraping. Don't gloss over this — address it head-on in your submission (robots.txt compliance, rate-limiting, no-load-bearing-on-source-servers, public-interest/statistical-use framing) since a judge from MoSPI/DIID will likely ask about it directly.
- **The 30-day backtest requirement means you must start collecting data almost immediately** — not in week 6. If your scraper isn't running by week 2–3, you won't have 30 days of history to back-test against by submission time. This is the single most important scheduling constraint in the whole project — flagged again in Phase 2 below.

**Net take:** it's a genuinely good, well-specified, ministry-relevant problem statement that suits your team well. Don't let the scraping engineering overshadow the index methodology — the methodology (weighting, formula choice, backtest rigor) is what will actually differentiate you from other teams attempting the same PS, since most teams will converge on "we used Selenium."

---

## 3. Data sources

| Source | What it actually gives you | How to use it |
|---|---|---|
| **Live scraping (your own data)** | Real-time fares per route/date/airline — this is the actual primary dataset for the index. Nothing pre-existing substitutes for this. | Core input to everything |
| **[eSankhyiki portal](https://esankhyiki.mospi.gov.in/)** (given in the PS) | MoSPI's data catalogue — hosts CPI (incl. Transport & Communication sub-group), National Accounts Statistics, IIP, ASI, ~10 yrs history. **It does not contain raw airfare data** — its value here is the *historical CPI transport sub-index* series for context/comparison in your report, and to show you understand what your index is meant to augment. | Context, motivation slide, sanity-check narrative |
| **DGCA** ([dgca.gov.in](https://www.dgca.gov.in)) monthly/quarterly traffic statistics | City-pair-wise monthly passenger traffic (used to pick your route basket & weights) and periodic average-fare disclosures (often released via Parliament Q&A / press notes rather than a clean downloadable file — you may need to dig through DGCA press releases or Lok Sabha/Rajya Sabha unstarred question replies for fare-specific numbers) | Route basket weighting + the 30-day backtest baseline |
| **[data.gov.in — Monthly Air Traffic Statistics](https://www.data.gov.in/catalog/monthly-air-traffic-statistics)** | Structured monthly traffic parameters (passengers carried, load factor, etc.) in open format | Easier-to-parse traffic data than DGCA's raw site |
| **[Vonter/india-aviation-traffic (GitHub)](https://github.com/Vonter/india-aviation-traffic)** | Community-maintained, cleaned CSV of DGCA traffic data, historical | Fast bootstrap instead of scraping DGCA's own site for traffic numbers |

**Practical note on "PSD"** in the PS ("index-construction module based on PSD given routes and weights") — this isn't a standard, universally-recognized acronym in index-number theory as written; it most likely means *"based on the prescribed/selected [basket of] routes and [their traffic-based] weights,"* i.e., a weighted price index (Laspeyres-style, similar to how CPI itself is built) using your DGCA-derived weights. Don't present a confident definition of "PSD" in front of judges — instead describe your weighting methodology explicitly (which route gets what weight, and why) so you're not exposed if it does mean something specific you haven't identified.

---

## 4. Tech stack

| Layer | Stack |
|---|---|
| **Scraping** | Python, Playwright (primary — handles JS-rendering best), Selenium (fallback), Scrapy (for simpler static endpoints), `requests`/`httpx` |
| **Anti-bot / infra** | Rotating residential proxies (e.g. a paid proxy pool for the demo subset), `undetected-chromedriver`, session/cookie management, CAPTCHA-solving API (2Captcha/Anti-Captcha) — used sparingly and only where legitimately needed |
| **Scheduling/orchestration** | Apache Airflow (or simpler: Celery + Redis, or even cron + systemd timers for hackathon scope) |
| **Raw storage** | MongoDB or raw JSON/Parquet on disk (schema-flexible for messy scraped data) |
| **Structured storage** | PostgreSQL (or TimescaleDB extension — good fit since this is fundamentally time-series data) |
| **Data cleaning/ETL** | Pandas, NumPy, Great Expectations (data quality checks), PySpark only if data volume actually demands it |
| **Index construction** | Python — Pandas/NumPy/SciPy/`statsmodels` |
| **ML/AI layer** | scikit-learn, XGBoost/LightGBM (elasticity & anomaly detection), `statsmodels`/Prophet (time-series forecasting, optional stretch goal) |
| **Backend/API** | FastAPI (Python — keeps the whole backend in one language, fast to build, auto-generates OpenAPI/Swagger docs which the PS explicitly wants) |
| **Frontend/Dashboard** | React + Next.js, Recharts or D3.js/Plotly (for heatmaps + elasticity curves specifically) |
| **DevOps** | Docker + Docker Compose, GitHub Actions (CI/CD), deploy on Render/Railway/AWS free-tier for the prototype |
| **Testing** | Pytest (backend/pipeline), Jest (frontend) |
| **Docs** | Markdown + Swagger/OpenAPI (auto from FastAPI) |
| **Monitoring (optional, adds polish)** | Simple scraper-health dashboard (success rate per site, last-run timestamp) — judges like seeing you've thought about production reliability |

---

## 5. Team structure

You've already fixed the 3 internal pairs — the cleanest split is to hand each pair one of the project's 3 natural parts, matched to skill:

| Part | Owns | Team |
|---|---|---|
| **Part 1 — Data Acquisition & Cleaning** | Scraping engine + anti-bot handling + data cleaning pipeline | **Akshara** (Co-lead, Data Sci) + **Priyal** (AI) |
| **Part 2 — Index Construction & Analytics** | Index methodology, weighting, backtesting + ML analytics layer | **Jatin** (Lead, Data Sci) + **Simran** (AI) |
| **Part 3 — Platform, Dashboard & API** | Frontend dashboard + backend API/infra/testing/docs | **Kushi** (Full Stack) + **Aditya** (Full Stack) |

### Detailed roles (2 sub-parts per pair)

**Part 1 — Data Acquisition & Cleaning**
- **Akshara (1A – Scraping Architecture):** Design & build the scraper suite for all airline sites + OTAs; orchestration/scheduling across the 5 booking-horizon windows (T+1/7/15/30/45) and the full city-pair basket; robots.txt compliance + rate-limiting policy; raw data lake structure.
- **Priyal (1B – Bot-Resilience & Cleaning):** Anti-bot/CAPTCHA handling, proxy rotation, session management; the cleaning pipeline — outlier detection, missing-value handling, de-duplication of near-identical listings, and separating base fare from taxes/UDF/convenience fees.

**Part 2 — Index Construction & Analytics** *(Jatin: also overall project lead — coordinates across all 3 parts)*
- **Jatin (2A – Index Methodology):** Route-basket & weight design (from DGCA traffic share), the index formula itself (daily/weekly/monthly aggregation), the structured DB schema for cleaned fare data, and the 30-day backtest against DGCA figures — this is the module judges will scrutinize most closely.
- **Simran (2B – Predictive/AI Layer):** Lead-time elasticity curve modeling (price vs. days-to-departure), demand-surge/festival-season detection, anomaly-detection models feeding back into Part 1's cleaning step, and (stretch goal) short-term fare-trend forecasting.

**Part 3 — Platform, Dashboard & API**
- **Kushi (3A – Frontend):** Interactive dashboard — price trend charts, sector-wise heatmaps, lead-time elasticity visualizations, scraper-health monitoring view.
- **Aditya (3B – Backend/Infra):** REST API for NSO/RBI consumption, database hosting, Docker/CI-CD deployment, automated test suite, documentation.

---

## 6. Six-phase implementation plan

> ⚠️ **Critical scheduling constraint:** the PS requires a 30-day back-tested result. Your scraper (Part 1) needs to be running continuously starting in **Phase 2**, not Phase 3 — the clock on your 30-day dataset only starts once scraping is live, and everything downstream (index, backtest, dashboard) depends on that data existing. Don't let this run in series with the rest of the build — it runs in parallel, in the background, from week 2–3 onward, regardless of what else is happening.

### Phase 1 — Research & Foundation (Week 1–2)
- Study DGCA traffic data → finalize the city-pair basket (DEL-BOM, DEL-BLR, BOM-BLR, DEL-CCU, BLR-HYD, MAA-DEL + a few more based on traffic weight) and derive initial route weights.
- Study CPI/index-number methodology (how MoSPI builds CPI, how similar airfare indices work elsewhere) to settle on your weighting formula.
- Audit each target site's robots.txt/ToS; decide the demo-safe subset vs. full-scope ambition.
- Finalize tech stack, repo structure, environment setup, architecture diagram.
- **Owners:** all 3 pairs jointly (this phase is cross-cutting); Jatin coordinates.

### Phase 2 — Data Acquisition Engine live (Week 2–5)
- Build and deploy scrapers for all airline sites + OTAs, per booking-horizon window.
- Get scheduling/orchestration running so scraping happens automatically, daily, unattended.
- **Start the continuous data-collection clock now** — this is the phase that unlocks Phase 4's backtest later.
- **Owners:** Akshara (1A) leads, Priyal (1B) builds anti-bot resilience alongside.

### Phase 3 — Cleaning Pipeline & Structured Database (Week 4–6, overlapping Phase 2)
- ETL: outlier removal, missing-value handling, dedup, fare decomposition (base/tax/UDF/convenience).
- Structured DB schema live and being populated from the raw scrape feed.
- **Owners:** Priyal (1B) leads, with Akshara feeding raw data in.

### Phase 4 — Index Construction & Analytics (Week 6–9)
- Build the index-construction module (weighted aggregation, daily/weekly/monthly).
- Run the 30-day backtest against DGCA data (this is why Phase 2 had to start early).
- Build the elasticity/anomaly/forecasting ML layer.
- **Owners:** Jatin (2A) leads index + backtest, Simran (2B) leads the ML/analytics layer.

### Phase 5 — Dashboard, API & Integration (Week 8–10, overlapping Phase 4)
- Build the dashboard (trends, heatmaps, elasticity curves).
- Build the API layer for NSO/RBI consumption.
- Wire everything end-to-end: scraper → cleaning → DB → index → API → dashboard.
- **Owners:** Kushi (3A) + Aditya (3B) lead, integrating with Parts 1 & 2's outputs.

### Phase 6 — Testing, Documentation & Demo Prep (Week 10–12)
- Automated test suite (Pytest/Jest), bug fixes, edge-case handling.
- Finalize documentation, backtest report, and API docs (Swagger).
- Build the pitch: problem framing → live/cached demo → backtest accuracy result → architecture walkthrough.
- Rehearse the demo with a fallback plan if live scraping fails on stage (very likely given anti-bot systems) — have a recorded run or cached dataset ready as backup.
- **Owners:** all pairs — Aditya owns test suite, Jatin owns the pitch narrative, everyone reviews docs for their own module.

---

*Adjust week numbers to your actual SIH internal-round → grand-finale calendar — the phase order and the parallel-scraping constraint matter more than the exact dates.*
