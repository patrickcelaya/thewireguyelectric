# Lead forms

Every form on the site posts to `/api/contact` (`web/src/pages/api/contact.ts`, the only server-rendered route):

- **Estimate requests:** `EstimateForm` (the CTA band on most pages, the contact sections, /estimate), `formType: estimate`.
- **Job applications:** `ApplicationForm` on /careers, `formType: careers`, with the résumé upload.

The forms work without JavaScript (the API answers 303 back to the page's `#sent` or `#send-error`). With JavaScript, `web/src/scripts/site/forms.ts` sends them with `fetch` and reads the status code. Front-end details: `docs/DESIGN_SYSTEM.md` (EstimateForm, the `[data-est]` hooks).

## Destinations

Each submission goes to every destination that is configured. One success is enough; when all fail, the visitor is told to call.

| Env var (Vercel, Production and Preview) | Destination | What it receives |
|---|---|---|
| `FORMSPARK_FORM_ID` (the ID after `https://submit-form.com/`) | Formspark inbox and its notification email | The filled-in fields under readable labels (Name, Phone, Email, City or ZIP, Years of experience, Full-time, Start date, Message, Resume), plus Form and Page. `_email.subject` is "Estimate request: Name (ZIP)" or "Job application: Name" (the name and ZIP on one line, cut at 80 and 40 characters; the fields keep them whole); `_email.from` (the sender's name) is "Wire Guy website" |
| `LEAD_WEBHOOK_URL` | Any webhook, e.g. a Zapier catch hook to Housecall Pro | JSON with fixed keys: `name`, `phone`, `email`, `zip`, `experience`, `fullTime`, `startDate`, `message`, `file_url`, `formType`, `page`. Unused keys are empty strings |
| `RESEND_API_KEY` + `LEADS_TO_EMAIL` (+ `LEADS_FROM_EMAIL`) | A plain-text email via Resend | The same labels as Formspark, under "Form: Estimate request" or "Form: Job application". Reply-to is the visitor's email |

An empty message is sent as "No details given". A changed env var reaches the function only after a redeploy. The Ignored Build Step lets a redeploy through when one of these variables is added or removed, but not when only its value changes: then redeploy with **Use project's Ignore Build Step** unticked (README, "Ignored Build Step").

## Status codes

| Code | When | The visitor sees |
|---|---|---|
| 204 | Delivered to at least one destination | The confirmation. GA4 `generate_lead` fires only here, and only for estimate requests |
| 202 | Dropped as a bot: the hidden `company_website` field was filled, or the form was filled in under 2.5 s | The confirmation (bots move on). Logged as `[contact] dropped as bot` |
| 400 | No name, no phone, or no valid email (both forms require all three), or a body that isn't form data | Inline errors (with JS) |
| 403 | A cross-site POST (Astro's origin check) | — |
| 405 | Any method but POST (`Allow: POST`). A monitor can GET the URL to tell "deployed" from "missing" | — |
| 502 | Every destination failed or timed out. Logged as `[contact] delivery failed: …` with the provider's status and the start of its answer | "We couldn't send that. Please call …", scrolled into view and focused |
| 503 | No destination configured | The same failure line |

Without JavaScript the handler answers every success (204, 202) with a 303 to `?sent=1#sent`, and every failure (400, 502, 503) with a 303 to `?error=1#send-error`, on the page named by the Referer when it is on this site and not under `/api/`, otherwise on /estimate (a browser that sends no Referer lands there, not on the 405 that `/api/contact` gives a GET).

- **Fill time:** the browser measures it on one clock (`performance.now()` from page load to send) and posts it as `fillMs`. A visitor whose device clock is minutes off is never mistaken for a bot. A form posted without JavaScript sends no fill time and is accepted.
- **Timeouts:** each destination gets 8 s, and the browser gives up after 15 s and shows the failure line. Either way the visitor never waits on "Sending…" indefinitely.

## Formspark setup, and the settings that reject every lead

Formspark is the launch destination. When it is the only one configured, each of these turns **every** lead into a 502, and the visitor is told to call:

1. **Allowed domains: leave it empty.** Once a domain is listed, Formspark rejects submissions sent from a server. Every lead is sent from our Vercel function, not the visitor's browser. The setting is off by default.
2. **Spam filter: check the Spam folder.** The automatic filter is on for every new form. A submission it flags gets 403, goes to the Spam folder, and sends no notification. All our submissions come from Vercel's servers, so a false positive can't be ruled out. In the first weeks, check Spam and mark any real lead as not spam.
3. **Quota: don't run out.** A free workspace allows 250 submissions; after that Formspark answers 402 "out of submissions". Buy submissions before launch, or watch the count.
4. **Notifications:** keep office@thewireguyelectric.com on. Other recipients are added as guests, and each must accept a confirmation email. The sender's address can't be changed, only its name.

Telling them apart: the Vercel function log shows, for example, `Formspark 402: …` or `Formspark 403: {"error":"Rejected by spam protection"}`.

Add a second destination (`LEAD_WEBHOOK_URL` or Resend) soon after launch, so a single provider's refusal doesn't fail a lead.

Sources (read 2026-10-17): Formspark's [spam protection](https://documentation.formspark.io/setup/spam-protection.html), [limits and plans](https://documentation.formspark.io/troubleshooting/limits-and-plans.html), [AJAX](https://documentation.formspark.io/examples/ajax.html) and [notification email](https://documentation.formspark.io/customization/notification-email.html) pages.

## The notification email (Formspark custom template)

Formspark's notification email uses a custom template, edited in Postcraft (Formspark → the form → Settings → email notifications → customize). It reads the fields above by their labels (`data.Name`, `data.Phone`, `data.[City or ZIP]`, `data.Resume`, `data.Form`, `data.Page`) and `viewLink`:

- a white card with the logo, "New estimate request" or "New job application" (from `Form`), the name, City or ZIP, and Call / Email buttons (`tel:` and `mailto:` links);
- a Details card with each filled-in field (empty ones are left out), an "Open résumé" button and the page it was sent from;
- "View in Formspark" and the business line at the foot, on the site's bone background, copper and petrol.

The subject still comes from `_email.subject` (the template sets none). **Renaming a label in `LABELS` (`web/src/pages/api/contact.ts`) blanks that field in the email** until the template is updated to match. Button links take a whole-field binding with an ASCII name only, which is why the résumé label is `Resume`.

## The résumé upload (Vercel Blob)

The /careers form has a plain file field (`name="resume"`, in `ApplicationForm.astro`); the form posts as `multipart/form-data`.

- **Saving:** `/api/contact` puts the file in the project's Vercel Blob store (`wireguy-resumes`, connected to the project as `BLOB_READ_WRITE_TOKEN`) under `resumes/resume-<random>.<ext>`, and sends its link to every destination as `file_url` (labelled "Resume" in Formspark: the notification template links its button to that field, and its validator takes ASCII names only).
- **Limits:** 4 MB, and PDF, Word (doc/docx), RTF, ODT, TXT, Pages, JPEG, PNG or HEIC. Vercel refuses any request over 4.5 MB before the function runs, so the browser checks the size first (`forms.ts`) and says so inline. A file over the limit or of another type is logged and left out; the application is still delivered.
- **Without JavaScript:** the upload works the same (it is part of the normal form post). Only the size check is lost: a file over 4.5 MB gets Vercel's error page.
- **If Blob is down or the token is missing:** the application is delivered without the résumé, and the function log says why.
- **Privacy:** files sit at unguessable but public links. Delete old ones in Vercel → Storage → wireguy-resumes when they are no longer needed.
- **Cost:** Vercel's included Blob allowance covers thousands of résumés; expect $0.

## Testing after a change

- **Locally:** build with `PUBLIC_SANITY_PROJECT_ID= pnpm --filter web build`, then serve `web/.vercel/output` (the static files plus `functions/_render.func/entry.mjs`). Point `LEAD_WEBHOOK_URL` at a local catch server. Never post test leads to the real providers from a script.
- **On the preview, after setting `FORMSPARK_FORM_ID` and redeploying:**
  1. Submit /estimate with the name "QA test - ignore". Expect "Your request is in.".
  2. Confirm the entry in the Formspark inbox and that the notification email arrived (not in spam).
  3. Delete the test entry.
