# Application intake decision — researched 20 September 2026

Status: recommendation for approval. No new production backend, account, paid service, database, or Airtable base was connected. The existing production Netlify form is unchanged. The prototype uses synthetic data and local adapters only.

## Options

| Option | Strengths | Limits / maintenance |
|---|---|---|
| Embedded Airtable form | Fastest setup; nontechnical question editing; direct table review and CSV export | Limited visual control; questions tied to mutable table fields; repeated submissions can create duplicates. Freeze a separate round table/form and export regularly. No custom durable idempotent receipt. |
| Custom site form → server → Airtable | Full visual/accessibility control; one main storage service; field-ID mappings and PATCH upserts supported | Intake unavailable when Airtable is unavailable or capped. Browser timeouts require reconciliation. API upsert is not evidence of a database-level uniqueness constraint under concurrent requests. A raw snapshot field helps but remains editable/deletable by base collaborators. |
| Custom site form → Netlify Forms → Airtable | Uses existing service; stored submissions, spam review and CSV exports; Airtable outage does not have to block initial capture | No documented atomic idempotency key or definitive stored-record receipt for client POSTs. Honeypot/challenge failures can be silently rejected. Reconciliation must scan stored submissions, not rely only on a webhook. Less code, but does not establish the strict receipt/duplicate invariants requested. |
| Custom site form → managed Postgres intake + outbox → Airtable | Atomic unique ID, immutable original snapshot, explicit accepted/pending/failed state; replayable sync | More code than embeds; a small endpoint, worker and export tool need maintenance. Recommended for the stated strict requirements. |

Airtable form responses become table records; deleting a referenced field can block submission until the form is repaired. Form branding/customization varies by plan. [Airtable form documentation](https://support.airtable.com/articles/9431794285-building-and-sharing-forms-in-airtable)

Netlify stores submissions and provides UI/API access and CSV export; form-triggered functions run on verified submissions. A webhook notification is not an independent durable queue. [Netlify submissions](https://docs.netlify.com/manage/forms/submissions/)

Netlify spam filtering separates spam from verified records, while honeypot/reCAPTCHA failures can be rejected without appearing in either list. Do not equate a generic success page with proof of durable acceptance. [Spam filters](https://docs.netlify.com/manage/forms/spam-filters/)

## Recommended minimal design

Use a custom accessible form and a server endpoint on Netlify; use managed Postgres for canonical intake and Airtable only for review. Netlify Database is a candidate if the team's credit-based plan supports it. It exposes a connection pool for atomic transactions. [Database API](https://docs.netlify.com/build/data-and-storage/netlify-database/api/)

1. Browser creates one UUID per attempt and preserves it and its answers across recoverable errors.
2. Server validates allowed schema version, stable keys, types, size, honeypot, origin and shared-store rate limits. Apply a server-verified challenge only if observed abuse warrants it.
3. One transaction inserts immutable answers plus schema snapshot, server timestamp, round and consent version under a unique UUID, and an outbox row. A retry with the same ID and same payload returns the original receipt; changed payload returns 409.
4. Return acceptance only after transaction commit. An ambiguous browser timeout retries the same UUID. A storage failure yields no success.
5. Worker locks/leases outbox rows, validates the Airtable schema against field IDs/types, then PATCH-upserts by submission ID. Use one worker lease per submission; never PUT, which clears omitted fields. Do not typecast silently. Store record ID and sync status; retry transient failures with bounded backoff. Permanent mismatches remain failed and recoverable.
6. Reconciliation checks pending/failed/stale rows and Airtable IDs. Operator repairs mappings, then replays by ID. No applicant answers in logs; use ID, error category, attempts and timestamps.
7. Restrict application roles from editing/deleting original snapshots. Back up/export independently; immutable application semantics do not prevent an owner from deleting a database. No provider guarantees zero loss.

Airtable create/update operations accept field IDs; `returnFieldsByFieldId` supports stable response keys. PATCH upsert matches one to three eligible fields, creates on zero matches, updates on one, and fails on multiple. These are verified API contracts, not a live-base integration test. [Create records](https://airtable.com/developers/web/api/create-records), [Update records](https://airtable.com/developers/web/api/update-multiple-records)

Use OAuth or a narrowly scoped server credential for `data.records:read`, `data.records:write`, and `schema.bases:read`, restricted to the approved base. Never browser credentials. Airtable owner supplies separate synthetic staging base and production base, table IDs and field IDs. Netlify owner confirms plan, backend approval and environment scopes. No credential setup is required for the delivered prototype.

## Question/schema changes

| Change | Required behavior |
|---|---|
| Wording only, same key | Publish new immutable schema version. Keep old snapshot so exports retain old wording. Airtable field labels do not substitute for snapshots. |
| New question, no Airtable mapping | Canonical intake keeps it; mark sync failed with mapping mismatch. Never silently omit it. |
| Airtable field renamed | Same field ID remains the mapping; verify against the current metadata. Name-based integrations need repair. |
| Field deleted/recreated | Treat as a new schema/ID and fail closed. Recreating the same name is not restoration of old cells. Remap explicitly and replay original snapshots. |
| Field type changed | Metadata mismatch blocks sync until reviewed; do not auto-convert original answers. |
| Question removed/replaced | Retire old key; new concept gets new key. Old snapshots remain. Keep older server schema versions for deployed clients and rollback. |
| Mixed-version export | JSON contains full original envelopes; long CSV has one row per question with ID, version, original wording and answer JSON. Never infer old wording from today's form. |

Airtable documents that changing types attempts conversion and some conversions clear values. [Field types](https://support.airtable.com/articles/2361876459-field-type-overview) Field IDs can be fetched through metadata and used for extraction. [Finding IDs](https://support.airtable.com/articles/4688931572-finding-airtable-ids) Deleted fields can be restored from base trash within seven days; this is limited recovery, not archival preservation. [Trash](https://support.airtable.com/articles/4837035377-managing-trash-in-airtable)

## Cost and limits

Airtable Free: 1,000 records/base and 1,000 API calls/workspace/month. Team: $20 per billable collaborator/month annually or $24 monthly, with 50,000 records/base and 100,000 API calls/month. One review record per application avoids multiplying record use by question count. For a small pilot Free may suffice; historical rounds count toward its ceiling. [Plans](https://support.airtable.com/articles/2277136852-airtable-plans-overview)

API traffic is capped at 5 requests/second/base; 429 requires waiting 30 seconds. Monthly caps are distinct: Free can block after its one-time grace; Team can throttle to 2/second. Budget schema checks, exports and reconciliation in addition to writes. [API limits](https://support.airtable.com/articles/7735693959-managing-api-call-limits-in-airtable)

Netlify Forms is free/unlimited on credit-based plans; legacy plans differ. [Forms billing](https://docs.netlify.com/manage/forms/usage-and-billing/) Netlify compute is 10 credits/GB-hour, bandwidth 20/GB, requests 2/10,000, production deploys 15; previews are zero deploy credits. [Credit rates](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

Planning estimate, NOT a quote: 1 GB-hour compute + 0.1 GB bandwidth + 10,000 requests ≈14 incremental credits/month before storage and deployments. Actual idle database/worker usage and existing team consumption must be measured. Incremental dollars may be $0 within existing allowance plus Airtable Free, but this is not confirmed for the owner's account. Database docs still mention a storage-free period ending July 1, 2026; that date is past, so do not assume free storage. Owner must confirm current database/storage pricing before provisioning. [Database availability](https://docs.netlify.com/build/data-and-storage/netlify-database/)

## Staging, monitoring and launch decisions

Netlify database previews can be seeded with production data. Use a separate empty staging project/database and synthetic seed, not automatic copies of applicant data in public previews. [Database guidance](https://www.netlify.com/knowledge-base/how-to-add-a-postgres-database-to-a-netlify-app/)

Monitor intake storage errors, outbox age/failure count, worker health, schema drift and successful reconciliation. A GET uptime monitor cannot prove accepted writes. Synthetic tests need a separate storage destination and disabled applicant email. Alert recipient remains a team decision; none configured.

Approval needed: backend choice and plan/cost; owner/base and access; approved questions, round identifier, launch dates and consent/privacy wording; retention/export ownership; monitoring recipient. Approve architecture before connecting production. Tests delivered here use real local SQLite and browser IndexedDB plus a fake downstream adapter, not Netlify/Airtable storage.
