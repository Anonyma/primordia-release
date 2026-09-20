# Draft application prototype

This is not an application launch. Use only synthetic data. Approved questions, consent/privacy wording, dates and the production backend remain team decisions. No Netlify/Airtable credentials or new services are connected.

## Run

Node 22.13+ (the local test adapter uses experimental built-in SQLite):

```
npm ci
npm run build
npm test
node prototype/server.mjs
```

Open http://127.0.0.1:8913/local-draft/ for the loopback-only SQLite adapter. Synthetic records are in ignored `work/synthetic-applications.sqlite`. The service binds to 127.0.0.1, validates host/origin, enforces payload size and a local rate window, and never contacts Airtable. The in-memory rate limiter is suitable only for this local prototype; a production deployment needs a shared limiter and authenticated operations.

For static preview: `DRAFT_PROTOTYPE=1 npm run build`. Open `/draft-application/` on a static server or the deploy preview. This uses IndexedDB in that browser and origin only; browser storage may be cleared/evicted and is not a hosted durable intake. It shows a test reference, not a grant receipt. JSON/CSV downloads stay on the test user's machine.

## Schema and history

Edit `prototype/schemas.json` by adding a new immutable version. Do not alter a version after submissions use it. Each question has a stable key, label, group, input type, required flag and technical size limit. Meaningfully different questions get a new key. The supplied v2 changes the name label, removes expected impact and adds a next-experiment question.

Acceptance snapshots schema, raw answer strings, ID, server timestamp (local server mode), version, round, provisional consent identifier, and sync state. Consent is explicitly `not-approved-no-real-applicants`: it is not consent language or permission to collect real applications.

The local SQL transaction enforces a primary-key submission ID. Identical retries return the same envelope; conflicting payloads get 409. Unknown input keys are rejected; known questions without an Airtable mapping remain stored and fail synchronization visibly.

Export locally:

```
node prototype/export.mjs work/synthetic-applications.sqlite json > work/history.json
node prototype/export.mjs work/synthetic-applications.sqlite csv > work/history.csv
```

JSON is the exact original snapshot/answer export. Long CSV includes one row per question with original wording, version, ID and answer JSON; formula-leading cells are escaped for spreadsheet safety. Back up the SQLite database through SQLite's online backup tooling while the service runs, or stop the service and copy the database plus any WAL files together. Production should use scheduled provider backups plus independent encrypted exports, with restore drills and approved retention.

## Validation and fault evidence

`npm test` covers real local SQLite acceptance and reopening, duplicate/conflicting retry, invalid input, unknown keys, honeypot, timeout after capture (simulated dropped response), failed capture, v1/v2 original wording/answer export, missing mapping, rate-limit backoff/replay, simulated field-ID rename/deletion/type/access errors, downstream timeout deduplication in a fake upsert provider, and local rate-limit reset.

`node scripts/smoke-prototype.mjs` drives the local server in Chromium: invalid input/error summary, valid submission, repeated retry, v1/v2 records and JSON export, and 320/375/768/1440px overflow checks. `PROTOTYPE_URL=<preview>/draft-application/ node scripts/smoke-prototype.mjs` repeats this against browser-only preview storage. Neither command touches production application intake.

The fake downstream tests validate our control flow, not Airtable's live behavior. There are no real staging provider tests yet; those require an approved, separate base/backend. Physical-device tests are not claimed.

## Recovery model

`syncOne` stores pending/synced/failed state, attempts and safe error categories. Missing mappings fail before calling the provider; original answers remain retrievable. Transient errors retry at most three times per invocation; 429 waits 30 seconds. Repair the mapping/provider and call `syncOne` with the same submission ID to replay. This test worker does not run automatically, lease jobs or connect to Airtable. Production must add durable worker leases, shared retry schedules, dead-letter/operator alerts and reconciliation before launch, as described in APPLICATION-ARCHITECTURE.md.

No email or applicant notifications are sent. Alert recipients and retention/export ownership are still required. The production build rejects draft inclusion even if `DRAFT_PROTOTYPE=1` is set while `CONTEXT=production`; only deploy previews opt in. `/apply` remains the existing production form.
