# Content edits: the launch copy pass

Copy changes made on top of the migrated content before launch (2026-10-17), applied by
`scripts/migrate/content/content-edits.mjs` every time `node scripts/migrate/webflow-to-sanity.mjs` runs. The
Webflow export, the live-copy files in `migration/page-content/` and `migration/content-data/faqs.json` stay as the
live site has them; these files hold what changes, edit by edit, so every change can be traced and undone.

| File | Edits | What |
|---|---|---|
| `pages.json` | 81 | Homepage and the 8 page-builder pages, shared FAQ answers, team bios, Site settings copy, shared template lines; the homepage and /blog guides lines (`review-pages-*`) |
| `services.json` | 104 | The 21 service bodies, the service template, service image alts; the hanging-lights de-slop (16) |
| `cities.json` | 59 | The 10 city bodies and the city template |
| `posts-a.json` | 257 | Blog posts 1–27 by slug; 6 excerpts (`excerpt-posts-a-*`) |
| `posts-b.json` | 185 | Blog posts 28–53 by slug; 6 excerpts (`excerpt-posts-b-*`) |
| `decisions.json` | | The lead's copy decisions (FIX_BRIEF D1, D6) and the Ahwatukee body split (D5); the owner's decisions of 2026-10-19 (D15 generator lines out, D16 conflicting prices to the higher figure, D17 the warranty line) |

The five slop files are the verified lists of the 2026-10-17 copy review: every edit was researched, then checked
by an adversarial verifier. Only verdicts `accept` and `amend` are here (for `amend`, `new_text` is the verifier's
text); no edit was rejected.

The exception is `slop-services-hl-001` … `-016` (verdict `lead`): the published hanging-lights copy only started
shipping after the review (D10), so it had no verified edits. They were written in the integration round from the
review's own guide and hard rules: stock lines deleted or cut down to their facts, no new facts, every keyword
heading and the call to action kept. The short description they change is card and hero text only: the page's meta
description is its `seo.description`, so the applier's guard lets it change.

## An edit

```json
{
  "id": "slop-services-039",
  "url": "/services/custom-lighting",
  "target": {"kind": "ndjson", "doc_id": "…", "field": "body[8]", "block_key": "k00t"},
  "old_text": "Seamless installation with hidden wiring and driver placement",
  "new_text": "Hidden wiring and driver placement",
  "tier": "normal",
  "verdict": "accept",
  "reason": "…",
  "format": {"strong": ["Hidden wiring"]}
}
```

- `target.doc_id` and `target.field` name the document and field in the generated dataset (`sections[3].services[1].text`,
  `valueProps[0].text`, `answer[0]`, `body`). For Portable Text, `block_key` or the field's index names the block.
- `old_text` must occur exactly once: in the string, or in the whole Portable Text field, inside the named block (a
  block's text is its spans joined). Anything else stops the migration.
- In Portable Text the change happens inside the spans. Words that stay keep their bold, italic and links; new words
  take the bold or italic of the words they replace; linked words (links, team mentions) can never change; a block
  the edits leave empty is dropped. `format` overrides the bold or italic of the new words where the verifier's note
  asked for it (`{"strong": ["Hidden wiring"]}`: exactly those words are bold; `{"em": []}`: no italic).
- An emptied string field is removed (empty means nothing).
- `skip` keeps an edit on record without applying it, with the reason. `adapted` explains a mechanical change to
  `old_text`. `kind: "file"` edits were made in the named file itself (page-sections.mjs, a template, content-data/);
  they are listed so the record is complete.
- `applier_note`, `formatting` and `verifier_note` are the reviewers' notes, kept as written.

## When each edit applies

The module runs at four points of the migration, so each edit lands before the checks that read its text:

1. **early**, after `fixes`: FAQ answers and city bodies. `local-facts` then checks its neighbourhood quotes against the
   edited city bodies, and `cms-templates` checks the Panels at-a-glance evidence against the edited FAQ answers.
2. **service**, inside `cms-templates`, after the price edits and before the quick-answer and at-a-glance checks.
3. **late**: page sections and team members (made by `page-sections`), Site settings (after `page-sections` has
   compared its shared lists and CTA band with the live copy, so the pages keep using them) and post bodies (written
   against the bodies `cms-templates` leaves).
4. **final**, last, after `titles-meta`: post excerpts (`excerpt-posts-*`). An excerpt is the post's meta description
   until `titles-meta` sets `seo.description`; after that it is card and quick-answer text, which an edit may change.

Every replaced live string on the 9 static pages has a `copy` entry in `migration/page-content/_omissions.json`, so
`verify-content.mjs` still accounts for all live copy. Titles, H1s, meta descriptions and slugs never change; the
module checks that after every run.

## Not applied

| Edit | Why |
|---|---|
| slop-pages-022 | D2: Steven Taylor's quote on /our-team may only lose words. Every sentence is filler, so nothing meaningful is left after deletions; the original stays for the owner to confirm or cut. |
| slop-services-065, -066, -067 | D10: written against the unpublished hanging-lights draft. The page now ships its published copy. |
| slop-services-084, -085 | The same template lines as slop-pages-072 and -073, which are applied. |

Eight city closing paragraphs (slop-cities-012, -023, -029, -034, -040, -045, -051, -057) are `adapted`: the converter now trims the line break at the
end of every block, so their `old_text` ends at the full stop.

## Decisions applied with this pass (FIX_BRIEF, 2026-10-17)

- **D1** homepage headings, the capability and card titles and the shared CTA band heading: `decisions.json` D1-01 … D1-11.
- **D2** Steven Taylor's /our-team quote keeps its words (slop-pages-022 skipped).
- **D3** the /commercial-electrician hero loses its three starred one-liners (they match no review); its
  "Trusted by 100+ Arizona businesses" line stays, since the live page shows it word for word (`page-sections.mjs`).
- **D4** "Emergency troubleshooting" becomes "Electrical troubleshooting" (slop-posts-b-085).
- **D5** estimate CTAs that linked to "/" or to /contact-us now go to /estimate, and five typing slips are fixed
  (`linkFixes` and `textFixes` in `migration/content-data/cms-templates.json`); the converter trims line breaks at
  block edges and drops Webflow's `__wf_reserved_inherit` alt; emptied blocks are dropped; the Ahwatukee body is
  split into paragraphs and a list (`decisions.json` D5-01).
- **D6** Mountain America Stadium, the onboard charger's AC-to-DC conversion and "line-voltage (120 V)"
  (`decisions.json` D6-01 … D6-04); the NFPA citation links nfpa.org instead of a Google search (`linkFixes`).
- **D15** (owner, 2026-10-19: "remove generator"): the two generator posts are removed and 301 to /services/panels
  (`migration/content-data/removed-posts.json`, README §13 there); their twelve slop edits are kept with `skip`. D15-01 …
  D15-06 take generator lines out of the monsoon, permit and Scottsdale posts.
- **D16** (owner, 2026-10-19: "Always go with the higher amounts"): every price the site gave two ways now reads the
  higher range: surge protector and recessed lighting on /faq, the Level 1 vs Level 2 post (Level 2 installed, Level 1,
  200-amp panel), the ceiling fan post, the rewire guide (full rewire, AlumiConn remediation) and the recessed service's
  priceRange (D16-01 … D16-11, each with its old and new figure). In the rewire guide the full-rewire line follows its
  source ("$12,000 to $25,000 or more", no "single-story" claim) and the size breakdown, which priced most homes below
  it, is removed (D16-12 … D16-14): no figures were invented.
- **D17** (owner, 2026-10-19: "lets not talk about warranty but just say work comes w/ a warranty"): the FAQ "Do you
  warranty your work?" answers "Yes. Our work comes with a warranty." (D17-01; `drop_links` lets it delete the "Contact
  us" link with its sentence), and the homepage card "We come back if anything's wrong" gains that line (D17-02). The
  service at-a-glance facts and /estimate show it from `WARRANTY_LINE` in `web/src/lib/site.ts`.
- **D18** (owner, 2026-10-19): the two retitled services' first body H2 follows the new H1 (D18-01 fixture
  replacements, D18-02 exterior electrical). The new pages themselves are data in `migration/content-data/new-services.json`.
- **D10** /services/hanging-lights ships its published copy (`webflow-to-sanity.mjs`, live snapshot
  `migration/live-snapshots/services_hanging-lights.html`), with a quick answer rewritten from that copy.

## Owner to confirm

1. **Steven Taylor's quote on /our-team** is still the stock paragraph ("the name you can trust … your dependable
   partner in all things electrical"). It may only lose words, and nothing meaningful is left if it does: approve
   it, give us his own words, or cut the quote.
2. **/commercial-electrician hero:** the quotes "On time and stayed on schedule", "Clear pricing and communication"
   and "Reliable electricians for our business" were removed because no review says them. "Trusted by 100+ Arizona
   businesses" stays: please confirm the number.
3. **Promises in posts:** "free post-storm safety inspections" and "free safety check" (monsoon post) and
   "same-day service available" (surge-protection and breaker posts; also the breaker post's meta description).
4. ~~**Level 1 vs Level 2 post:** its 200 A panel upgrade price ($1,800–$2,500) disagrees with the site's panel
   figures ($5,200–$6,500).~~ Answered (D16-07): it reads $5,200–$6,500. The rewire cost guide's size breakdown, which sat below
   its new headline range, is removed (D16-12, D16-13); give us real figures by home size to bring it back.
5. **/services/hanging-lights** shows the published 2024 copy with its stock lines taken out (`slop-services-hl-*`:
   "perfect for businesses looking to enhance their ambiance", "meticulous attention to detail", "bespoke … not only
   meet but exceed expectations" and the "Why Choose" list are gone; the fixtures, steps and call to action stay). The
   meta description approved from the unpublished draft ("hung on rated support with dimming that works") was
   replaced with one this copy supports: "Commercial hanging lights in Mesa and the Phoenix valley: pendants over
   dining areas, chandeliers in lobbies, track lighting in galleries. Free estimates." Approve it, or publish the
   2026-08-18 rewrite held as a draft in Webflow. The quick answer only restates the edited copy.
6. **Homepage team intro** still names Emma with her photo and link (live copy).
7. **"Over 9 years"** in the business FAQ goes stale in 2027.
