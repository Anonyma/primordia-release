# Netlify Forms launch

Netlify Forms is the chosen intake service. The older database/Airtable prototype in PR #5 is not required for this launch.

## Build modes

- Default: `npm run build` keeps `/apply` as the approved opening announcement. No form or submission controls are exposed.
- Test candidate: `APPLICATION_FORM_MODE=preview npm run build` restores the preserved twelve answer fields in the current approved shell, with a synthetic-data warning and noindex metadata. Netlify deploy-preview builds use this mode.
- Public opening: `APPLICATION_FORM_MODE=open npm run build` exposes the form and changes the opening notice. Set this only after the owner approves opening, questions and applicant-data handling. No date automatically opens applications.

Native POST uses `grant-application`, the honeypot `bot-field`, and `/thanks.html`. Netlify detection must remain enabled. JavaScript adds inline validation and linked errors, optional local drafts, a 25-second timeout, in-flight submit locking, and a reference preserved on retries. There are no file attachments. Payload limits remain well below Netlify's 8 MB request limit.

## Verification commands

```
npm ci
npm run build
npm test
npm run check
npm run smoke
APPLICATION_FORM_MODE=preview npm run build
npm test
npx playwright install chromium firefox webkit
npm run smoke:form
```

The form smoke command uses isolated local browser contexts in Chromium, Firefox and WebKit. It verifies keyboard focus, input validation, draft reload, 320/390/768/1440px layouts, HTTP 503/offline recovery, duplicate clicks and JavaScript-disabled native POST. Set `FORM_SMOKE_URL` only for a known test deployment; hosted submissions additionally require `FORM_SMOKE_SUBMIT=1`.

The original smoke command verifies the closed build. Run it before building preview mode. The focused node/jsdom tests inject HTTP 400/403/404/413/429/500/503, offline and timeout failures. They do not simulate Netlify storage, spam decisions or notification delivery; those require the hosted checks below.

## Release gates

1. Confirm question copy, amount limits, the launch date, and applicant-facing data-use/privacy information. Identify who can read applications, what they may be used for, and how long Netlify submissions and downloaded exports are kept. Browser drafts are opt-in, removable, and are purged on the next form visit after 30 days or on confirmed JavaScript submission.
2. Confirm notification recipients in Netlify Forms → Submission notifications. Send a labelled hosted test and have the intended recipient confirm receipt. Netlify notifications are for verified submissions, so assign someone to review Spam daily while applications are open. The dashboard is the source of truth; an email notification is not the only record.
3. Assign an owner for credit alerts and site availability. Confirm sufficient team credits or an owner-approved recharge policy. Do not launch while the team is at risk of being paused for exhausted credits.
4. Assign an application reviewer to reconcile ambiguous retries by `application-reference`, review spam, and export submissions to approved storage on a defined schedule. A reference is a client correlation label, not a server-issued receipt or an idempotency guarantee. Native submissions without JavaScript have no client-generated reference; use Netlify's submission ID.
5. Test the exact release preview: form detection, twelve stored answers, version/context fields, native POST, error handling, Unicode/multiline values, optional fields, mobile/keyboard validation, draft recovery, and CSV export.
6. After an approved production deployment, inspect the custom-domain HTML and run one labelled synthetic application there. Verify its Netlify record and notification. Keep the previous production deploy available for rollback; reverting the application page closes new entry without deleting stored applications.

## Limitations

Client-side validation is applicant guidance, not a server-side trust boundary. Direct requests can bypass required-field and budget limits; reviewers must treat all answers as untrusted. Netlify provides form collection and spam processing, but does not promise application-level exactly-once submission or a durable draft service. Cross-device drafts, applicant confirmation emails, authentication, and Airtable synchronization are not implemented.

References: https://docs.netlify.com/manage/forms/setup/ ; https://docs.netlify.com/manage/forms/submissions/ ; https://docs.netlify.com/manage/forms/notifications/ ; https://docs.netlify.com/manage/forms/spam-filters/
