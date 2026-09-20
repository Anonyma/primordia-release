# Expanded website release — 20 September 2026

Source: `/Users/z/Desktop/PersonalProjects/ClaudeProjects/primordia-site-dev`, including its working changes. The original checkout is untouched; a complete source checkpoint and binary Git diff are in the task workspace. The release branch is based on `ThatMrE/primordia` main, not the unrelated development repository history.

The new homepage preserves the approved local design and seven grantee projects, adds the approved high-resolution mobile artwork and official social links, and includes the missing project JSON. Existing application, donation, about, program, message, thanks and 404 pages remain intact. The application form remains `grant-application`; no synthetic submission is sent to it.

## Production and access

- Domain: https://primordiagrants.com
- GitHub: https://github.com/ThatMrE/primordia
- Netlify: https://app.netlify.com/projects/primordia-grants/overview
- Site ID: `03479892-a927-4776-b99c-f12eb7da32cc`
- Production branch: `main`; GitHub App builds enabled.
- Before release: commit `ad20694606cf921d1e8c6f71712a427b159961b5`, ready deploy `6a9e424ddb6bdb0009cd68d8`.
- Rollback permalink: https://6a9e424ddb6bdb0009cd68d8--primordia-grants.netlify.app
- Current contributor `Anonyma` has READ on production, ADMIN on the separate development repository. A fork PR requires the production owner to merge. Branch protection endpoint is unavailable to this account; do not infer absence of protections from its 404.

## Contributor workflow and gates

Create a branch, run `npm ci`, `npm run build`, `npm test`, `npm run check`, `npx playwright install chromium`, `npm run smoke`, and open a PR. Netlify should create a deploy preview. Fork builds may require approval in Netlify because the site's untrusted-contributor policy is `review`. The owner must verify and approve the particular reviewed revision.

Netlify's build command now builds and runs unit/syntax checks before publication. Browser smoke checks run in GitHub Actions as `Site checks`. Owner: in https://github.com/ThatMrE/primordia/settings/rules protect `main`, require a pull request and the `Site checks` status, require approval per team policy, dismiss stale approvals, and require the branch to be up to date. Restrict direct pushes and bypasses as appropriate. Browser checks alone are NOT a production gate until this rule is enforced. Manual Netlify uploads and administrators can still bypass GitHub protections; restrict deployment access rather than assume checks cover these paths.

Fork checks use only read-only repository permissions and no deployment or applicant-storage secrets. No `pull_request_target` execution. Owner credentials must never be available to untrusted PR code. Real form integration tests belong in a separately approved staging environment.

Browser smoke checks cover ten widths (320–1440), document overflow, missing loaded images, hero overlap, CTA hit areas, runtime exceptions, and six production routes. They do not submit the live form or test inbox delivery. Physical-device Safari and Android checks remain recommended team review steps.

## Monitoring and rollback

Inspect GitHub Actions for check failures and Netlify Deploys for build failures. Netlify Forms shows the existing intake and spam queue. Add notification recipients only after the team identifies them. No new email alerts are configured by this change.

A basic uptime job should GET `/`, `/apply`, and `/fund-experiments` and check meaningful content; this cannot prove submission storage. The draft prototype's fault tests are local only. Future synthetic intake monitoring must use an isolated test destination with applicant emails disabled.

To roll back: owner opens Netlify Deploys, selects recorded deploy `6a9e424ddb6bdb0009cd68d8`, and publishes that successful deploy, or reverts the release PR through the reviewed Git workflow. Verify `/`, `/apply`, and `/fund-experiments` afterward. Site rollback does not restore form schemas or records. Preserve immutable application schema versions and keep server support for versions emitted by rollback candidates.

Do not run `build_site.py` to regenerate the new homepage: it generates the previous temporary design. Edit the homepage HTML, styles and scripts directly; legacy secondary pages retain their original source and behavior until a separately reviewed migration.

An hourly GitHub Actions route monitor is included and activates only after merge into the production repository's default branch. It checks HTTP success and nonempty page size; it is not a submission test. GitHub's scheduler can be delayed and public-repository scheduled workflows can be disabled after inactivity. Use a dedicated uptime service if a strict alert SLA is needed. No alert email recipient or third-party notification was configured.

Hosted preview validation on 20 September passed the same ten-width Chromium smoke suite and all six routes at https://deploy-preview-4--primordia-grants.netlify.app. Impeccable's detector flagged existing tracking and generic container heuristics; the approved type/desktop design is intentionally preserved. The GitHub workflow may need owner approval for this first fork contribution before `Site checks` appears; Netlify's preview already built successfully.
