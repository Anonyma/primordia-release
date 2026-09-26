# Netlify form readiness plan

Goal: verify and harden the preserved grant application using Netlify Forms, without opening public applications during testing.

Architecture: retain the current approved page shell and twelve existing answer fields. Build a test-only form into deploy previews; production remains the opening notice by default. Use native HTML POST as fallback, with JavaScript validation, explicit opt-in local draft storage, bounded requests and an in-flight submission guard. A client reference helps operators reconcile ambiguous retries; it is not a server-side idempotency guarantee.

1. Establish baseline: current main, live custom domain, form detection, honeypot, notifications and billing. Run build, existing tests and syntax checks.
2. Add reproducible DOM tests for field serialization, accessible validation, drafts, storage failures, success, HTTP failures, network errors, timeouts and repeated submits. Reproduce failures before changing application.js.
3. Restore only the preserved form section in templates/application-form.html. Build preview/open modes explicitly; default builds stay closed. Preserve approved hero, header, artwork and footer.
4. Harden application.js; run the full test suite and build checks. Preserve native POST when JavaScript is unavailable. Do not add Airtable, Supabase or credentials.
5. Deploy a non-production candidate to the existing Netlify project. Verify the exact deployed HTML and form schema, run a labelled synthetic submission, and inspect stored fields in Verified and Spam.
6. Check keyboard errors, small-screen layout and zoom in the browser. Verify custom-domain notice remains closed. Record test evidence, known Netlify limits, and owner-dependent notification/billing/privacy/launch decisions.

Acceptance: all implementation tests pass; hosted payload matches stored fields; no production opening is implied by preview success. Notification delivery, approved data handling, operational ownership and explicit launch remain release gates.
