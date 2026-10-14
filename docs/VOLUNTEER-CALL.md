# Cohort 2 volunteer invitation

Prepared for review only. Do not merge or publish until the page and invitation are approved for launch. No social posts or direct messages have been sent.

## Content basis

The current homepage describes early-stage biology experiments in community labs and other compliant spaces, small fast microgrants, and sharing lab notes, results and stories. `AGENTS.md` and the current homepage/secondary pages establish white surfaces, Karla/Jost typography and biological artwork. `docs/RELEASE.md` identifies the current static build; the older Python generator must not regenerate this page.

Prior volunteer planning, repository content, and issue/PR searches yielded no approved roles, hours, eligibility requirements, response times, or volunteer signup form. The page therefore invites introductions and interests, with general ways anyone can support the program: share the call, introduce relevant people, or offer their skills. It does not announce specific vacancies or promise placement. The existing public contact is `hi@primordiagrants.com`.

No grant amount or application-opening date is repeated: current main and recent planning use different figures, and resolving that is outside this change.

## Draft social post

Help bold early-stage ideas in biology reach the lab.

We’re inviting volunteers to contribute to Primordia’s second cohort. Share the program with your community, make an introduction, or tell us what skills you’d like to offer.

Interested? Email hi@primordiagrants.com with a short introduction, how you’d like to help, and your availability.

After the page is published, add: https://primordiagrants.com/volunteers

## Draft direct outreach

Hi [name], we’re putting together a call for people who’d like to contribute to Primordia’s second cohort. Primordia supports early-stage biology experiments in community labs through small, fast microgrants.

If this interests you, email hi@primordiagrants.com with a little about your skills, how you’d like to help, and your availability. You’re also welcome to pass the invitation on to someone in your community.

## Review and release

- Review `/volunteers`; `/volunteer` redirects there. Navigation links are included on current pages, with footer links on legacy pages.
- Both main contact buttons open editable email drafts; the visible email address is the fallback. There is no new intake backend, payment, email delivery, or tracking integration.
- Run `npm ci`, `npm run build`, `npm test`, `npm run check`, `npx playwright install chromium`, and `npm run smoke`.
- Browser checks cover the page at ten widths, its email destination/body, mobile menu opening/Escape/focus, and discovery from the homepage. No email or form is submitted.
- Keep the PR draft and production `main` unchanged. Other open application, analytics and sharing-card PRs remain separate. If merged later, check their navigation edits for conflicts and preserve the Volunteer link.

## Validation of this revision

- Static build, all 8 existing tests, JavaScript syntax checks, TOML route ordering, and `git diff --check` passed.
- The browser smoke suite passed the existing site checks plus the volunteer route, mailto composition, mobile menu state/Escape/focus, homepage discovery and ten widths from 320px to 1440px.
- Additional checks passed the new page's 14px text floor, primary CTA hit area, keyboard skip-link focus, and navigation/contact without JavaScript.
- Desktop (1440px) and mobile (390px) captures were reviewed against the current homepage. Independent design and documentation reviews passed at that scope.
- The normal Playwright browser download failed in this environment. The same smoke script was run with Chromium 153.0.8010.0 from a temporary packaged binary, with environment-specific proxy/TLS setup. This does not change site dependencies or deployment configuration. No email was sent and no live form submitted.
