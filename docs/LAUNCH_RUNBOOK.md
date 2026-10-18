# Launch runbook: www.thewireguyelectric.com

The one document for the DNS cutover from Webflow to Vercel. It says who does each step, where to click and what to enter. The background is in [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md), the forms in [`FORMS.md`](FORMS.md), the SEO plan in [`SEO_STRATEGY.md`](SEO_STRATEGY.md).

**Launch day (L): Thursday 2026-10-22.** If it moves, keep the offsets (T-2 is two days before L, and so on).

**Who:**
- **Owner:** anyone with the dashboard logins (WordPress.com, Vercel team celaya-ventures, GitHub, Sanity, Formspark, FlowDrive, Google, Bing, Webflow).
- **Claude:** the repository, the checks and the content import. Secrets (the Sanity token, the bypass secret, the deploy hook URL, the Formspark form ID) go into dashboards or shell variables, never into chat or this file.

**Ground rules:**
- Email keeps working throughout. The cutover edits two DNS records and nothing else.
- Webflow stays untouched and paid for until L+30. It is the rollback.
- No Webflow publishing and no Webflow or Studio content edits from T-1 until the launch checks pass. An urgent change (hours, phone number) goes to Claude, who adds it to the content pipeline.

## Where things stand (checked 2026-10-17)

| Item | Today | At launch |
|---|---|---|
| DNS | At WordPress.com: apex A → Webflow, www CNAME → Webflow (TTL 14400) | Apex A and www CNAME → Vercel, TTL 300 |
| Vercel production branch | `claude/funny-goldberg-0idk0t` (PR #1) | `main` |
| Vercel env vars | `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` only | plus `FORMSPARK_FORM_ID` and `SITE_INDEXABLE=true` (Production) |
| Ignored Build Step | The same-commit guard: at least 8 production deployments of `d3db0c6` were Canceled on 2026-10-17 | `node scripts/ignore-build.mjs` (content-aware) |
| Deployment Protection | Vercel Authentication on All Deployments: visitors get a Vercel login | Standard Protection |
| Domains on the project | `thewireguyelectric.vercel.app` only | plus `www.thewireguyelectric.com` (primary) and the apex redirecting to it |
| Forms | `/api/contact` answers 503: no destination set | Formspark delivers every lead |
| Content in Sanity | The 2026-10-17 import, before the launch fixes | The regenerated dataset with all launch fixes |
| Sanity Studio | Not hosted: https://thewireguyelectric.sanity.studio answers 404 | Optional before launch; needed to edit content yourself |

## Timeline

| When | Date | Who | Step |
|---|---|---|---|
| T-5 | Sat 10-17 | Owner | [Lower the www TTL to 300](#t-5-to-t-3-dns-ttl-webflow-freeze-questions). Freeze Webflow. Start on the [owner questions](#owner-questions) |
| T-5 | Sat 10-17 | Claude | Merge the launch-fix PRs into PR #1; run the gates |
| T-3 | Mon 10-19 | Owner | [Formspark form](#formspark) and `FORMSPARK_FORM_ID`; [FlowDrive check](#flowdrive-résumé-upload); [Vercel build settings](#vercel-settings) |
| T-3 | Mon 10-19 | Claude | Confirm the TTL is 300; test a lead on the preview |
| T-2 | Tue 10-20 | Owner | [Add the domains in Vercel](#t-2-add-the-domains-in-vercel); send Claude the two DNS values |
| T-2 | Tue 10-20 | Claude | Check the values are Vercel's; prepare the after-cutover checks |
| T-1 | Wed 10-21 | Claude | [Back up Sanity and import the launch dataset](#t-1-import-the-launch-content); full preview check |
| T-1 | Wed 10-21 | Owner | Screenshot the WordPress.com DNS page; answer the blocking questions |
| **L** | **Thu 10-22** | Both | [Launch-day sequence](#launch-day), steps L1–L15 |
| L+1 | Fri 10-23 | Both | [Day-after checks](#l1-to-l7) |
| L+7 | Thu 10-29 | Owner | Revoke the bypass secret; start the [off-site fixes](#off-site-fixes-for-the-owner) |
| L+27 | Wed 11-18 | Owner | [Job posting expires](#job-posting-expiry) unless extended |
| L+28 | Thu 11-19 | Claude | [Wave-2 city titles](#wave-2-city-titles-l28) if wave 1 held up |
| L+30 | Sat 11-21 (or Mon 11-23) | Owner | [Decommission Webflow](#webflow-decommission-l30) and clean up DNS |

## T-5 to T-3: DNS TTL, Webflow freeze, questions

**Owner, now (by Mon 10-19 at the latest): lower the www TTL.** It is 14400 s (4 hours) today, so a switch or a rollback could take 4 hours. It must be 300 at least 4 hours before L.
1. Go to https://my.wordpress.com/domains and click **thewireguyelectric.com**.
2. Under **Settings**, click **DNS records**. Take a full-page screenshot first: it is the rollback copy.
3. On the row **www · CNAME · cdn.webflow.com**: under **Actions**, click the three dots → **Edit** → set **TTL** to `300`. Leave **Alias of (points to)** as it is → **Update DNS record**.
4. The apex A record is already at 300. Change nothing else.

**Claude, T-3: confirm** both resolvers show TTL 300 or less:

```bash
curl -s 'https://dns.google/resolve?name=www.thewireguyelectric.com&type=CNAME'
curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=www.thewireguyelectric.com&type=CNAME'
```

**Owner: freeze Webflow.** No Designer or CMS edits and no **Publish**. The home page has an unpublished staged edit from 2026-10-12 that publishing would push live. Keep Webflow's form notification email on: during the switch some visitors still reach Webflow's forms.

## Vercel settings

Project **thewireguyelectric** in team **celaya-ventures**, at https://vercel.com/celaya-ventures/thewireguyelectric/settings. Owner does these unless the Vercel connection gives Claude project write access.

| Setting | Click path | Value | When |
|---|---|---|---|
| Build queue | Settings → Build and Deployment → **On-Demand Concurrent Builds** | **Run up to one build per branch** → Save. A bulk import or a burst of Sanity publishes then makes one follow-up build, not one per document | T-3 |
| Ignored Build Step | Settings → Build and Deployment → **Ignored Build Step** → Behavior **Custom** | Command `node scripts/ignore-build.mjs` → Save. Replaces the same-commit guard | T-3 |
| System variables | Settings → Environment Variables → **Enable access to System Environment Variables** | Checked (the ignore step reads them) | T-3 |
| Form destination | Settings → Environment Variables → **Add** | Key `FORMSPARK_FORM_ID`; value: the form ID only, not the URL; environments **Production** and **Preview** → Save | T-3 |
| Domains | Settings → **Domains** | See [T-2](#t-2-add-the-domains-in-vercel) | T-2 |
| Production branch | Settings → **Environments** → **Production** → **Branch Tracking** | `main` → Save | L2 |
| Indexing switch | Settings → Environment Variables → **Add** | Key `SITE_INDEXABLE`, value `true` (lowercase), environment **Production** only → Save | L3 |
| Protection | Settings → **Deployment Protection** → **Vercel Authentication** | **Standard Protection** → Save | L6 |
| Deploy hook | Settings → **Git** → **Deploy Hooks** | Name `Sanity publish (main)`, branch `main` → Create Hook. Delete the hook for `claude/funny-goldberg-0idk0t` | L13 |
| Bypass secret | Settings → Deployment Protection → **Protection Bypass for Automation** | Revoke the secret | L+7 |

**How the ignore step decides** (`web/scripts/ignore-build.mjs`; exit 1 builds, exit 0 skips and shows the deployment as Canceled). It reads `/build-info.json` from the production site and builds when: the deployment is not production, the file can't be read, the commit differs, the content source or `SITE_INDEXABLE` differs, a form destination (`FORMSPARK_FORM_ID`, `LEAD_WEBHOOK_URL`, `RESEND_API_KEY`, `LEADS_TO_EMAIL`) was added or removed, Sanity's published content differs, or the last build was made on an earlier day in Arizona or more than 20 hours ago. Otherwise it skips. Any error builds. The deployment log shows one line: `[ignore-build] Building: <reason>` or `[ignore-build] Skipping the build: <reason>`.
- It uses `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_SHA` and, while the site is protected, `VERCEL_AUTOMATION_BYPASS_SECRET`. Vercel exposes all four to the Ignored Build Step ([system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)). If one is missing, it builds.
- **It sees whether a form destination is set, not its value, and no other env vars.** After adding `FORMSPARK_FORM_ID` for the first time, a plain redeploy builds: Deployments → latest Production deployment → ⋯ → **Redeploy**. After changing the value of a variable that is already set (a new form ID, say), or any other variable except `SITE_INDEXABLE`, redeploy with the check off: ⋯ → **Redeploy** → uncheck **Use project's Ignore Build Step** → Redeploy. A changed variable reaches the site only through a new build.

## T-2: add the domains in Vercel

Owner. Visitors see no change until DNS moves.
1. Settings → **Domains** → **Add Domain** → `thewireguyelectric.com` → **Add**. When Vercel offers to add `www`, choose the option that makes **www.thewireguyelectric.com** the main domain and redirects the apex to it.
2. If the apex was added without a redirect: click **Edit** on `thewireguyelectric.com` → **Redirect to** `www.thewireguyelectric.com` → status **301** (Webflow uses 301 today; 308 is also fine) → Save.
3. Copy the two values Vercel shows and send them to Claude:
   - the **A** value on the apex card (an IP, for example `216.198.79.1` or `76.76.21.21`);
   - the **CNAME** value on the www card (project-specific, like `<hash>.vercel-dns-0NN.com.`).

   Always use the values on the cards, not these examples.
4. If a card asks for a **TXT** record at `_vercel`, the domain is held by another Vercel account. At WordPress.com: **Add record** → Type `TXT`, Name `_vercel`, Text: the value shown, TTL `300` → save. Then click **Verify** in Vercel.
5. Optional, avoids a certificate gap for returning visitors (Webflow sends HSTS, so browsers won't click past a certificate error): Vercel team **Domains** page → `thewireguyelectric.com` → **SSL Certificates** → **Pre-generate**. Add the `_acme-challenge` TXT records it shows at WordPress.com (TTL 300), click **Verify**.

**Claude, T-2:** check the IP is Vercel's (the name must start `VERCEL-`), and test the certificate if it was pre-generated:

```bash
curl -s https://rdap.arin.net/registry/ip/<apex IP> | grep -o '"name" *: *"[^"]*"' | head -1
curl -sI https://www.thewireguyelectric.com --resolve www.thewireguyelectric.com:443:<apex IP>
```

## T-1: import the launch content

The site builds from Sanity, so the launch fixes (copy, titles, links, schema data) reach the site only when the regenerated dataset is imported. Claude, with the owner's go-ahead and a write token in `SANITY_AUTH_TOKEN` (set in the shell, never pasted anywhere):

```bash
CONTENT_DATE=2026-10-17 node scripts/migrate/webflow-to-sanity.mjs
git diff --exit-code migration/sanity-import/
node scripts/migrate/validate-dataset.mjs
node scripts/migrate/verify-content.mjs
cd studio
pnpm exec sanity dataset export production ~/wireguy-sanity-backup-2026-10-21.tar.gz
pnpm exec sanity dataset import ../migration/sanity-import/production.ndjson production --replace
```

- `CONTENT_DATE` is the day given to any material change that `migration/sanity-import/content-dates.json` doesn't record yet (none, when the tree is clean); without it, such a change would be dated the day of the run. `git diff --exit-code` proves the regenerated dataset is the committed one the gates passed on, so that is what gets imported.
- `--replace` overwrites any Studio edit made since the last import. That is why Studio edits are frozen from T-1.
- The import fires one webhook per document. With **Run up to one build per branch** they collapse into one or two builds.

**Claude, T-1: full preview check** (with `VERCEL_AUTOMATION_BYPASS_SECRET` exported in the shell):

```bash
node scripts/launch/verify.mjs --base https://thewireguyelectric.vercel.app --allow-noindex
```

Pass = `OK` and 0 failures (on 2026-10-17, before the launch fixes were deployed and without the parity group: 18 passed, 0 failures). Since the merge, `GET /api/contact` must answer 405, and a build without a lead destination shows as INFO here and fails on www. The script also runs the parity crawl against `migration/seo-baseline.json`. Then re-run the Webflow drift check: the live home page must still send `last-modified: Thu, 24 Sep 2026 17:33:30 GMT` and the newest live sitemap `lastmod` must be `2026-09-21T02:29:25.598Z`.

## Launch day

Start in the morning (Arizona time), with Claude available. Do the steps in order; each has a "done when".

| # | Who | Step | Done when |
|---|---|---|---|
| L1 | Owner | Check https://status.search.google.com/ for a core update in progress. If one started, postpone to after it ends (about 2 weeks) | No ranking update in progress (on 2026-10-17: none; the last, a spam update, ended 2026-10-08) |
| L2 | Owner | Vercel → Settings → Environments → Production → Branch Tracking → `main` → Save | Shows `main` |
| L3 | Owner | Add `SITE_INDEXABLE` = `true`, **Production only** | Listed under Production only |
| L4 | Owner or Claude | Merge PR #1 into `main` on GitHub. The merge commit starts the production build | Vercel → Deployments: a Production deployment from `main`, **Ready**; its log shows `[ignore-build] Building: …` and the Astro build, not Canceled |
| L5 | Claude | Check that build on the protected alias (see below) | `index, follow` on the pages; verify passes |
| L6 | Owner | Deployment Protection → Vercel Authentication → **Standard Protection** → Save | https://thewireguyelectric.vercel.app/ answers 200 without a login, with `x-robots-tag: noindex` |
| L7 | Owner | WordPress.com DNS edits ([table](#dns-at-wordpresscom)): apex A, then www CNAME | Both rows show the Vercel values |
| L8 | Claude | DoH until both resolvers return the new values (usually 5 minutes) | Both resolvers agree |
| L9 | Claude | `verify.mjs` on www, repeated until it passes | `OK`, 0 failures |
| L10 | Owner | Phone and email tests (below) | All four pass |
| L11 | Claude | IndexNow | 200 or 202 |
| L12 | Owner | Search Console, Bing, GA4 ([below](#search-engines-and-analytics)) | Sitemap submitted, home inspected, Realtime shows hits |
| L13 | Owner | Deploy hook for `main` (below) | A test publish builds production |
| L14 | Owner | Google Business Profile (Mesa) → Website `https://www.thewireguyelectric.com/` | Saved |
| L15 | Claude | Re-run `verify.mjs` at +1 h | Still 0 failures |

**L5, Claude.** Before protection is lowered, the alias still needs the bypass header. It sends `x-robots-tag: noindex` on purpose (every host but www does), so allow noindex and check the page's own robots tag:

```bash
node scripts/launch/verify.mjs --base https://thewireguyelectric.vercel.app --allow-noindex
curl -s -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" https://thewireguyelectric.vercel.app/ | grep -o '<meta name="robots"[^>]*>'
```

The second line must show `index, follow` (today it shows `noindex, nofollow`). If it doesn't, the build missed `SITE_INDEXABLE`: check its scope, then Redeploy with **Use project's Ignore Build Step** unchecked.

**L8, Claude.** Run each query on both resolvers:

```bash
curl -s 'https://dns.google/resolve?name=thewireguyelectric.com&type=A'
curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=thewireguyelectric.com&type=A'
curl -s 'https://dns.google/resolve?name=www.thewireguyelectric.com&type=CNAME'
curl -s 'https://dns.google/resolve?name=thewireguyelectric.com&type=MX'
curl -s 'https://dns.google/resolve?name=thewireguyelectric.com&type=TXT'
```

Expect the new A and CNAME, no AAAA, and the MX and TXT answers unchanged (5 Google MX records; SPF, google-site-verification, openai-domain-verification, proxy-ssl.webflow.com). The owner can watch https://dnschecker.org/#A/thewireguyelectric.com and https://dnschecker.org/#CNAME/www.thewireguyelectric.com.

**L9, Claude.**

```bash
node scripts/launch/verify.mjs --base https://www.thewireguyelectric.com
```

It checks, and fails on any miss: apex → www in one 301/308 with the path kept; http → https; `/x/` → `/x`; the 80 legacy, misspelling and `/blog/` redirects; `robots.txt` allows crawling and lists the sitemap; the sitemap has **96** URLs, each 200, no noindex, one correct canonical; GA4 `G-4ZYV7JMRJH` on every page; `/api/contact` deployed (GET answers 405, an empty POST 400) with a lead destination set for the build; the parity crawl against the baseline with 0 errors. Also by hand:

```bash
curl -sI https://www.thewireguyelectric.com/
curl -sI http://thewireguyelectric.com/
curl -sI https://thewireguyelectric.com/about-us
curl -sI https://www.thewireguyelectric.com/og-default.png
```

Expect `200` and `server: Vercel` with no `x-robots-tag` on www; one 301/308 to `https://www.thewireguyelectric.com/…` from the apex, path kept; `200 image/png` for the share image. The Vercel domain cards should read **Valid Configuration**, and the certificate should be issued within minutes. Today the apex answers `301` to www from Webflow, and `og-default.png` is 404 on Webflow.

**L10, Owner.**
1. On a phone, on www, submit /estimate with the name `QA test - ignore` and tap a phone number. Expect "Your request is in." and the dialer.
2. Check the Formspark inbox and that the notification reached office@thewireguyelectric.com (not in spam). Delete the test entry.
3. Submit /careers with a one-page test PDF. Confirm the résumé link arrives; delete the file in FlowDrive.
4. Send an email to office@thewireguyelectric.com from an outside account and reply to it.

**L11, Claude.** Only after L9 passes:

```bash
node scripts/launch/indexnow.mjs --dry-run
node scripts/launch/indexnow.mjs
```

It refuses to run until the key file answers on www (on 2026-10-17 it correctly refused against Webflow: 404). IndexNow reaches Bing, Yandex, Seznam, Naver and Yep, not Google.

**L13, Owner: deploy hook for `main`.** A deploy hook builds one branch. The existing hook was made for the old production branch.
1. Vercel → Settings → Git → Deploy Hooks → name `Sanity publish (main)`, branch `main` → **Create Hook**. Copy the URL. Treat it like a password.
2. https://www.sanity.io/manage → **The Wire Guy Electric** → **API** → **Webhooks** → edit the site webhook → paste the new URL → save. Keep the filter `!(_id in path("drafts.**"))` and the create, update and delete triggers.
3. GitHub → https://github.com/patrickcelaya/thewireguyelectric/settings/secrets/actions → **New repository secret** → Name `VERCEL_DEPLOY_HOOK_URL`, Secret: the same URL. The daily rebuild (`.github/workflows/daily-rebuild.yml`, 00:17 Arizona time) uses it.
4. Delete the old hook in Vercel.
5. Test: publish any small change in Studio, or run the **Daily rebuild** workflow by hand (GitHub → Actions → Daily rebuild → Run workflow): its log should read "Deploy hook answered 200" (or 201). A production deployment should appear.

**L14, Owner.** Edit the Mesa profile's website only after L9 passes (it reaches the site through two redirects today). See the [off-site list](#off-site-fixes-for-the-owner) for the other profiles.

### Stop and roll back if

- the site shows a Vercel login, errors (5xx) or a certificate error 30 minutes after the DNS edit;
- `verify.mjs` on www still fails after DNS has propagated and the fix isn't obvious;
- email stops arriving.

[Rollback](#rollback) takes about 5 minutes.

## DNS at WordPress.com

All values re-checked on 2026-10-17 through both public DNS-over-HTTPS resolvers (Cloudflare and Google; Google's answers came straight from WordPress.com's nameservers). Registrar: Automattic (WordPress.com), expires 2027-08-22, transfer-locked, DNSSEC off. Nameservers stay at WordPress.com.

| Name | Type | Value today | TTL | Launch action |
|---|---|---|---|---|
| `@` | A | `198.202.211.1` (Webflow, ARIN `WEBFL`) | 300 | **Edit** at L7: **Points to** = the IP on the Vercel apex card. TTL 300 |
| `www` | CNAME | `cdn.webflow.com.` | 14400 | **Edit** TTL to 300 now; at L7 **Alias of (points to)** = the target on the Vercel www card, copied exactly |
| `@` | MX ×5 | `1 aspmx`, `5 alt1`, `5 alt2`, `10 alt3`, `10 alt4` (all `.aspmx.l.google.com.`) | 3600 | Keep: Google Workspace email |
| `@` | TXT | `v=spf1 include:_spf.google.com ~all` | 3600 | Keep: email |
| `@` | TXT | `google-site-verification=azRl…` | 3600 | Keep: Search Console Domain property |
| `@` | TXT | `openai-domain-verification=dv-…` | 3600 | Keep |
| `@` | TXT | `proxy-ssl.webflow.com.` (unused Webflow leftover) | 3600 | Keep until L+30, then delete |
| `_domainconnect` | TXT | `public-api.wordpress.com/rest/v1.3/domain-connect` | 3600 | Keep |
| `*` | CNAME | `thewireguyelectric.com.` (WordPress.com default) | 14400 | Keep; optionally delete at L+30 |
| `@` | NS | `ns1`, `ns2`, `ns3.wordpress.com.` | 86400 | Keep |
| `@` | AAAA, CAA, DS | none | | Add none (Vercel has no IPv6 for external DNS; no CAA means Let's Encrypt may issue) |
| `_vercel` | TXT | none | | Add only if Vercel asks (T-2) |
| `_acme-challenge` | TXT | none | | Only if pre-generating certificates; delete at L+30 |

**Click path:** https://my.wordpress.com/domains → **thewireguyelectric.com** → Settings → **DNS records** → on the row, **Actions** → three dots → **Edit** → change the field → **Update DNS record**. TTL accepts 300 to 86400; records with the same name and type share one TTL.

**Never:**
- use **Add record** for the apex A: two A records split visitors between Webflow and Vercel;
- use any **Restore default** item: it points the domain at WordPress.com or resets email;
- touch the MX, TXT, `_domainconnect` or `*` rows.

**Rollback values:** `@` A `198.202.211.1`; `www` CNAME `cdn.webflow.com.`; both TTL 300.

**Optional, L+7 or later: email authentication.** Google Admin → Apps → Google Workspace → Gmail → **Authenticate email** → Generate new record (selector `google`); add it as TXT at `google._domainkey`, then **Start authentication**. At least 48 hours later add TXT at `_dmarc`: `v=DMARC1; p=none; rua=mailto:office@thewireguyelectric.com`. Neither exists today, so the cutover can't break them.

## Forms

Full reference: [`FORMS.md`](FORMS.md). Formspark is the launch destination; until `FORMSPARK_FORM_ID` is set, every form answers 503 and tells the visitor to call.

### Formspark

Owner, T-3:
1. Sign up at https://formspark.io with office@thewireguyelectric.com.
2. **Create form**, name it `Website leads`. One form takes estimates and job applications; the email subject says which.
3. Copy the form ID: the part after `https://submit-form.com/` in the form's endpoint.
4. **Settings → Emails → Notifications:** keep office@thewireguyelectric.com on. Extra recipients are added as guests and must accept an email.
5. **Buy the Upgrade bundle** before launch: a one-time $25 for 50,000 submissions (formspark.io/pricing, 2026-10-17). The free workspace stops at 250.
6. Set `FORMSPARK_FORM_ID` in Vercel ([settings table](#vercel-settings)) and redeploy (the ignore step builds when a form destination is added; if you later change the ID, redeploy with the ignore step unchecked).

**The setup traps (forms-M1).** With Formspark as the only destination, each of these turns every lead into a failure, and the visitor is told to call:
- **Allowed domains:** leave it empty. Listing a domain makes Formspark reject submissions sent from a server, and every lead is sent from our Vercel function.
- **Spam filter:** it is on for every new form, and a flagged submission gets 403, lands in **Spam** and sends no notification. Check the Spam folder daily in week 1 and mark real leads as not spam.
- **Quota:** out of submissions means refused or held leads. Buy the bundle.
- The Vercel function log names the cause, e.g. `Formspark 402: …` or `Formspark 403: …`.

**Claude, T-3:** after the redeploy, submit /estimate on the preview as `QA test - ignore` and expect "Your request is in."; the owner confirms the inbox entry and the email, then deletes it. Soon after launch, add a second destination (`LEAD_WEBHOOK_URL` or Resend) so one provider's refusal can't lose a lead.

### FlowDrive (résumé upload)

The /careers form keeps the live site's résumé upload through the owner's FlowDrive widget (the same public widget key as the live page). Files go from the browser straight to FlowDrive; the form sends only the link, and only an `https` link on `tryflowdrive.com`.

Owner, by T-3, at https://tryflowdrive.com:
- **The account is active** and separate from the Webflow plan that will be cancelled. Note its plan and monthly quota.
- **Allowed sites include `thewireguyelectric.com`.** Uploads from `thewireguyelectric.vercel.app` are refused unless that host is added too, so the real upload test is on www at L10.

## Search engines and analytics

Owner, L12.

**Google Search Console** (https://search.google.com/search-console):
1. **Settings → Ownership verification** on both properties: the URL-prefix property (meta tag, which the new site serves from Site settings, value `mW1y…`) and the Domain property (the DNS TXT `azRl…`). Both must stay verified.
2. **Sitemaps** → add `sitemap.xml` → **Submit**. Expect 96 discovered URLs.
3. **URL inspection** → `https://www.thewireguyelectric.com/` → **Request indexing**. Repeat for the pages with the most clicks (16 months): `/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trip`, `/blog-posts/diy-electrical-work-in-arizona`, `/blog-posts/permit-for-electrical-work`, the 10 `/locations/*` pages, `/blog-posts/tesla-wall-connector-vs-chargepoint-home-flex-phoenix`, `/blog-posts/electrical-panel-upgrade-cost-arizona`, `/services/ev-charger-installation`, `/our-team`, `/contact-us` and `/estimate`. The daily quota is small; spread the rest over L+1.
4. **Pages** (indexing report): daily in week 1, then weekly. Watch Not found (404), Excluded by noindex and Duplicate without user-selected canonical.

**Bing Webmaster Tools** (https://www.bing.com/webmasters): the live site has no Bing verification today (no meta tag, no BingSiteAuth.xml, no TXT). **Add site → Import from Google Search Console**, then **Sitemaps → Submit sitemap** `https://www.thewireguyelectric.com/sitemap.xml`. IndexNow (L11) covers Bing too.

**GA4** (property with measurement ID `G-4ZYV7JMRJH`):
1. **Reports → Realtime:** visits from www appear within a minute of your own visit. The tag loads only on `www.thewireguyelectric.com`.
2. **Annotation:** on any report's line chart, right-click the launch date → add annotation "Site moved to new platform" ([how](https://support.google.com/analytics/answer/15884203)). The numbers will shift: the old site loaded GA twice, the new one once and slightly later, so judge SEO from Search Console, not GA.
3. **Admin → Data display → Events** (or **Key events**): mark `generate_lead` and `phone_call_click` as key events ([how](https://support.google.com/analytics/answer/13128484)). If a "Create event" rule already derives `phone_call_click`, remove it so calls aren't counted twice.

**Share previews:** re-scrape `https://www.thewireguyelectric.com/` in https://developers.facebook.com/tools/debug/.

## L+1 to L+7

| When | Who | Check |
|---|---|---|
| L+1 | Claude | `verify.mjs` on www; Vercel logs for 404s with a referrer, Googlebot 404s and `[contact]` errors |
| L+1 | Owner | Search Console: request indexing for the rest of the top pages; Formspark Spam folder |
| L+1 to L+7 | Owner | Search Console **Pages** report daily; add a Redirect document in Studio for any legitimate old URL that 404s (Claude can draft the list from the logs) |
| L+7 | Owner | Vercel → Deployment Protection → **Protection Bypass for Automation** → revoke the secret. After launch the ignore step reads `build-info.json` from the public custom domain, so it no longer needs it |
| L+7 | Owner | Start the P1 [off-site fixes](#off-site-fixes-for-the-owner) |
| L+7 | Both | Optional: second form destination; DKIM, then DMARC |

## Rollback

Any time until L+30, while Webflow still has the domains and a paid plan:
1. WordPress.com DNS records: edit `@` A back to `198.202.211.1` and the www CNAME back to `cdn.webflow.com.` (TTL 300).
2. Most visitors are back on Webflow within about 5 minutes. Webflow serves its 2026-09-24 publish.
3. Claude confirms with the L8 DoH queries.
4. Nothing is lost: Sanity keeps all content, Vercel keeps every deployment. Fix, then repeat L7–L15.

To roll back only the code (DNS stays on Vercel): project overview → Production Deployment tile → **Instant Rollback** → pick the last good deployment → **Continue** → **Confirm Rollback**. Pick one built after L3: anything older was built without `SITE_INDEXABLE` and is noindexed. A rollback stops new pushes from going live; when fixed, click **Undo Rollback** on the same tile.

## After launch

### Job posting expiry

The /careers job ("Residential Service Electrician") has `validThrough` **2026-11-18**. The site removes it, and its JobPosting markup, at the first build on or after 2026-11-19. The daily rebuild does that on 2026-11-19 at 00:17 Arizona time, once `VERCEL_DEPLOY_HOOK_URL` is set (L13). The Ignored Build Step always lets the first call of an Arizona day build, so the job leaves then even if the site was rebuilt on the 18th.
- **To keep it open:** before 2026-11-18, extend `validThrough` in Studio (Job openings). Studio isn't hosted yet, so either deploy it (MIGRATION_PLAN, Phase 1) or ask Claude to change it through the pipeline.
- **Pay range:** Google recommends one (`baseSalary`). The site shows none unless the owner gives one.

### Wave-2 city titles (L+28)

Thursday **2026-11-19**: Claude compares 4 weeks of Search Console click rates on each city's core searches, wave 1 (Gilbert, Tempe, Queen Creek, Apache Junction, Fountain Hills, changed at launch) against wave 2 (Chandler, Scottsdale, Ahwatukee, San Tan Valley, Phoenix, unchanged) at similar positions. If wave 1 is not worse, the approved wave-2 titles and metas ship that week. Details in [`SEO_STRATEGY.md`](SEO_STRATEGY.md#deferred-and-when).

### Webflow decommission (L+30)

Not before Saturday 2026-11-21, and only if no rollback is pending. Webflow site: "Wire Guy Electric" (short name `wire-guy`, id `66980076a856729471b47cbc`).
1. **Export form history:** Webflow → Site settings → **Forms** → download the CSV of past submissions.
2. **Keep subdomain indexing off:** Site settings → **SEO** → Indexing → **Disable Webflow subdomain indexing** stays on (https://wire-guy.webflow.io/robots.txt reads `Disallow: /` today).
3. **Remove both custom domains:** Site settings → **Publishing** → Production → ⋯ next to each domain → **Remove domain**.
4. **Unpublish the webflow.io site** (or archive it). The indexing toggle needs a paid plan, so do this before the plan ends.
5. Only then cancel or downgrade the Site plan. A downgraded site may no longer show its domains, so they can't be removed afterwards.

Then at WordPress.com: delete the TXT `proxy-ssl.webflow.com.` and any `_acme-challenge` TXT records; raise the apex A and www CNAME TTLs to 3600; optionally delete the `*` CNAME. Claude re-crawls production into a new `migration/seo-baseline.json` (`pnpm seo:baseline`) once wave 2 has shipped, so the parity gate protects the new values.

## Off-site fixes for the owner

From the citations review (verified 2026-10-17). Canonical details: **The Wire Guy Electric**, (602) 769-7892, https://www.thewireguyelectric.com/, Mon–Fri 9:00 AM–5:00 PM, Sat–Sun closed, ROC 365306 (pending question 1). Mesa: 1321 N 65th St, Mesa, AZ 85205 (or service area only, if you prefer not to show it). Scottsdale: **The Wire Guy Electric of Scottsdale**, 8555 E Raintree Dr, Unit 117, Scottsdale, AZ 85260, linking to https://www.thewireguyelectric.com/locations/scottsdale. Make the website edits only after L9 passes.

| Priority | Where | Fix |
|---|---|---|
| P1 | Licence number everywhere | Look up 365306 and 340400 at https://roc.az.gov/ and confirm which is active. If only 365306: replace 340400 in the Facebook intro, Instagram bio, Yelp "About the business" (Yahoo Local copies it), the claimed Manta listing, wisermap, BuildZoom (claim, add 365306) and the Thumbtack licence check. Decide on the van graphic. If both are active, tell us which number goes with which work |
| P1 | Apple Maps, through Apple Business (formerly Business Connect, https://business.apple.com) | Claim both places (Mesa `IC6DADD08E5FE580A`, Scottsdale `ICE005A362CD76F9B`). Names as above, category **Electrician**, phone, website (Scottsdale → its page), hours, address exactly as on Google |
| P1 | Yelp, Mesa (https://biz.yelp.com) | Phone (602) 769-7892; if (480) 908-0898 is Yelp call tracking, turn it off. Website as above; **Electricians** first; in "About the business" fix the ROC number and cut the stock lines ("unparalleled electrical services…") |
| P1 | Yelp, Scottsdale | Rename to "The Wire Guy Electric of Scottsdale"; website → /locations/scottsdale |
| P1 | BBB | Add website, hours, licence "AZ ROC 365306", alternate name "The Wire Guy Electric", optionally the Scottsdale address |
| P1 | Thumbtack | Name "The Wire Guy Electric", ZIP 85205, hours Mon–Fri 9–5 (it shows 8–4), website, re-verify the licence |
| P2 | Google Business Profile, Mesa (https://business.google.com) | Website `https://www.thewireguyelectric.com/` (L14). Optionally remove "Online service hours: Open 24 hours" |
| P2 | Nextdoor | Hours Mon–Fri 9–5 (shows 9–4), website as above, name without "LLC" if allowed |
| P2 | Bing Places (https://www.bing.com/forbusiness) | Website `https://www.thewireguyelectric.com/`, or re-sync from Google after the GBP change |
| P2 | Instagram | Check the profile shows when logged out; bio licence and link |
| P2 | Facebook | Intro: ROC, phone, website, address (or service area), hours |
| P2 | ZoomInfo, BuildZoom | Replace the old company name, the old 85204 address and (480) 789-9812 |
| P2 | Data aggregators | Push the details to Data Axle, Foursquare and Neustar Localeze, or use BrightLocal Citation Builder; search for "(480) 789-9812" and "Wire Guy Electric Co" |
| P3 | Google Business Profile, Scottsdale | Answer question 5 first. Google shows Mon–Fri 9–5 open; the site says "by appointment only". The two must agree |
| P3 | LinkedIn | Add Mesa, AZ 85205 and the phone |
| P3 | Angi | Free profile with the details above |
| P3 | Houzz | Optional free profile with project photos |
| P3 | Legal name | Check the entity holding ROC 365306 at https://ecorp.azcc.gov/. If it isn't "The Wire Guy Electric LLC", tell us (footer and schema use that) |
| P3 | ThreeBestRated | Ask them to remove "emergency and after-hours assistance" |
| P3 | Profile descriptions (Yelp, Manta, Bing, LinkedIn, Blogger) | Replace the stock marketing text with two or three plain sentences of fact |
| P3 | Mesa or Scottsdale chamber | Optional paid membership: a strong local citation |

## Owner questions

The full list, with what the site shows today and what we did, is in [`migration/content-data/CHANGES.md`](../migration/content-data/CHANGES.md#open-questions-before-launch-2026-10-17). In short:

| # | Question | If no answer |
|---|---|---|
| 1 | **ROC licence (D8).** The site, FAQ and Nextdoor show 365306; van photos, Facebook, Instagram, Yelp and BuildZoom show 340400. Which is active? Nine city meta descriptions name 365306 | 365306 stays |
| 2 | **Formspark:** create the form and buy the bundle (above) | No leads are delivered: blocks launch |
| 3 | **FlowDrive:** account active, separate from Webflow, `thewireguyelectric.com` allowed | Résumés can't be uploaded; applications still arrive |
| 4 | **"Trusted by 100+ Arizona businesses" (D3)** on /commercial-electrician: is the number right? The three starred quotes there were removed: no review says them | Line stays (the live page shows it) |
| 5 | **Scottsdale office:** staffed Mon–Fri 9–5, or by appointment only? | Schema keeps no hours for it; GBP and the site still disagree |
| 6 | **Home page hero quotes:** "Went above and beyond, great prices too!", "Could not be more pleased!", "Excellent, polite and timely service!" match no review | They stay (live copy) |
| 7 | **Promises in posts (D4):** "free post-storm safety inspections" and "free safety check" (monsoon post); "same-day service available" (surge-protection and breaker posts, and the breaker post's meta) | They stay |
| 8 | **Prices (D6):** the Level 1 vs Level 2 post prices a 200 A panel upgrade at $1,800–$2,500 (site figure $5,200–$6,500) and has two charger price tables that disagree | Left as is |
| 9 | **Claims in posts:** "#1 cause of summer tripping", "30–50° hotter", "53% return on investment", "can void your homeowner's insurance", "Phoenix has the strictest enforcement in the Valley", the City of Phoenix quote in the DIY post, "one of the most documented hazards", +15–20% home value and 50% return (landscape lighting), "September" for back to school | They stay |
| 10 | **Steven Taylor's quote** on /our-team is stock filler and may only lose words: approve, give his own words, or cut | Stays |
| 11 | **Hanging lights:** the published 2024 copy ships with its stock lines taken out (16 edits, no new facts: `slop-services-hl-*`). Its approved meta description still describes the unpublished draft ("hung on rated support with dimming that works"), which the published copy never mentions. Use this one instead: "Commercial hanging lights in Mesa and the Phoenix valley: pendants over dining areas, chandeliers in lobbies, track lighting in galleries. Free estimates." Or publish the 2026-08-18 rewrite? | Edited published copy and the approved meta stay |
| 12 | **Smaller copy points:** Emma named in the home team intro; "over 9 years" (stale in 2027); "Done right the first time." as both section heading and card title | Stay |
| 13 | **Job posting:** extend or close by 2026-11-18; publish a pay range? | Drops off on 2026-11-19 |
| 14 | **Legal name** on ecorp.azcc.gov (P3 above) | "The Wire Guy Electric LLC" stays |
| 15 | **Studio hosting:** create a "Deploy Studio" token (MIGRATION_PLAN, Phase 1) so you can edit content yourself | Content changes go through Claude |
