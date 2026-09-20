# Durable intake staging setup

Implemented, not connected to a hosted database or Airtable. `/apply` retains Netlify Forms. The prototype can now use a real Netlify endpoint and PostgreSQL instead of browser-only storage, but it remains synthetic-only and production is explicitly disabled. No new service was provisioned or purchased.

## What is implemented

- Required/type/size validation on the server; honeypot; explicit allowed origins; shared PostgreSQL rate limit (10 accepted new applications/IP/hour). Duplicate retries are exempt after payload matching.
- Atomic immutable application snapshot + durable outbox insert. A UUID receipt is returned only after commit. Concurrent identical retries return that same reference; changed answers under an accepted reference return 409.
- Question version, complete original schema, answer keys and original values live together in PostgreSQL. New question versions retain old versions. Browser IDs are generated from schema; do not hand-edit prototype HTML fields. `schema-locks.json` catches accidental edits to published versions; add a new version for wording, descriptions, type or key changes.
- Session recovery and downloadable draft. A browser can lose local storage; the file is an independent recovery option. No success is shown after storage failure or an unverified response.
- Airtable receives a submission-reference field and the complete JSON snapshot. Column renames are harmless because mappings use field IDs. Deletion/type changes stop sync and retain the canonical database record; repair IDs/types and replay. Full snapshot storage avoids losing a newly added question because someone forgot to add a review column.
- Transaction-locked worker, upsert by reference, retry/backoff for transient failures, failed state for schema/access errors. This avoids normal duplicate processing but is not a guarantee about Airtable's behavior under every network failure.
- Operator migration, status, export, sync and replay commands. No public endpoint exposes all applications.

## Owner setup: staging only

1. Owner chooses a PostgreSQL service, confirms costs, enables backups/PITR and tests restore. Create a separate empty staging database, never a copy containing real applicants.
2. Owner creates an Airtable staging base/table with a single-line text reference field and a long-text JSON snapshot field. Supply the base/table/field IDs through server environment configuration. Give the server restricted record read/write and schema read access to this base only.
3. In https://app.netlify.com/projects/primordia-grants/configuration/env set these for the appropriate preview function scope only:
   - `INTAKE_ENABLED=staging`
   - `INTAKE_DATABASE_URL` (TLS-enabled managed database connection)
   - `INTAKE_ALLOWED_ORIGINS=https://deploy-preview-5--primordia-grants.netlify.app`
   - `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID`, `AIRTABLE_REFERENCE_FIELD_ID`, `AIRTABLE_SNAPSHOT_FIELD_ID`
   Never paste secrets into chat, Git or frontend source.
4. From a trusted operator shell with the staging database environment, run `node backend/operator.mjs migrate` once. Use a non-owner runtime DB role with SELECT/INSERT on application_submissions, SELECT/INSERT/UPDATE on application_outbox and SELECT/INSERT/UPDATE/DELETE on application_rate_limits; no schema modification or TRUNCATE privileges. Migration owner credentials should not be deployed.
5. Redeploy PR #5 and open https://deploy-preview-5--primordia-grants.netlify.app/draft-application/?storage=server . Submit synthetic data; verify database receipt and original envelope. Run `node backend/operator.mjs sync` and inspect the Airtable record. Preview deploys do not execute Netlify scheduled functions.
6. Run `node backend/operator.mjs status`. After repairing a failed mapping, `node backend/operator.mjs retry UUID`, then `sync`. `node backend/operator.mjs export > secure-export.json` exports original envelopes; handle exports as confidential.

## Production remains a separate launch step

Confirm approved questions/round/privacy/retention, connect production-only destinations, activate the approved form on `/apply`, remove the staging-only endpoint restriction as part of a reviewed launch change, and test a real end-to-end receipt in the isolated staging destination first. The current endpoint intentionally rejects production-context requests.

The shipped scheduled worker is opt-in (`INTAKE_SYNC_ENABLED=true`) and processes one record every five minutes on published deploys. It must be configured for an approved environment; it is not currently running. Choose an alert recipient and configure alerts for intake errors, failed sync, oldest pending record, worker failures and backup failures. Daily reconciliation against Airtable plus backup restore drills still require operational setup. Database originals survive downstream column damage, but provider deletion, administrator actions or loss of the database are not magically prevented. No system can honestly promise zero loss under every circumstance.

## Verification scope

Tests run with a separate real local PostgreSQL 16 instance and synthetic data: atomic insertion, four concurrent retries, conflicting payload, blocked update/delete of originals, v1/v2 wording history, required fields, spam honeypot, shared rate limit, database unavailability, downstream outage and schema mismatch. Airtable HTTP behavior uses mocked responses; no claim of a real Airtable integration test is made until owner configuration is available. Browser test exercises the real hosted handler against PostgreSQL, including failure/reload/lost-response recovery. CI includes a disposable PostgreSQL service, subject to owner activation of GitHub Actions.

Reference: https://docs.netlify.com/build/functions/overview/ and https://airtable.com/developers/web/api/update-multiple-records .
