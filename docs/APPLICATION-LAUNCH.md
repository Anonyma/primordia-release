# Application launch handoff

The public `/apply` page announces applications opening at the end of September 2026. It deliberately contains no form, submission controls, or application script. Keep that notice until hosted intake is verified; do not automatically open applications based only on the date.

Durable intake is implemented separately in draft PR #5: https://github.com/ThatMrE/primordia/pull/5 . Its `docs/INTAKE-SETUP.md` is the staging setup reference. This UI release does not provision or activate that backend.

## Priority path to a functional application

1. Configure an isolated hosted PostgreSQL database with backup/restore, plus an Airtable staging base/table. Put credentials and IDs in Netlify server-side environment variables, never source control or chat. See PR #5 for the exact variable list and access requirements.
2. Apply the database migration, deploy the staging endpoint, and verify a synthetic application produces a committed database receipt and the matching Airtable record. Preview sync must be run with the operator command because scheduled functions do not run on Deploy Previews.
3. Verify reload recovery, database outage, lost response and retry, duplicate prevention, failed Airtable sync and replay. Activate CI and confirm hosted checks pass.
4. Confirm application questions, privacy/retention, production destinations and operational alerts. Connect the public application page to the verified backend in a separate launch change, retaining the opening notice until release is approved.

The public opening notice is covered by the browser smoke check, including absence of form controls. When opening applications, replace that assertion with end-to-end submission and recovery checks against an isolated test destination.
