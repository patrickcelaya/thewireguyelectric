# Content edits: the launch copy pass

Copy changes made on top of the migrated content before launch (2026-10-17), applied by
`scripts/migrate/content/content-edits.mjs` every time `node scripts/migrate/webflow-to-sanity.mjs` runs. The
Webflow export, the live-copy files in `migration/page-content/` and `migration/content-data/faqs.json` stay as the
live site has them; these files hold what changes, edit by edit, so every change can be traced and undone.

| File | Edits | What |
|---|---|---|
| `pages.json` | 78 | Homepage and the 8 page-builder pages, shared FAQ answers, team bios, Site settings copy, shared template lines |
| `services.json` | 88 | The 21 service bodies, the service template, service image alts |
| `cities.json` | 59 | The 10 city bodies and the city template |
| `posts-a.json` | 251 | Blog posts 1–27 by slug |
| `posts-b.json` | 179 | Blog posts 28–53 by slug |
| `decisions.json` | | The lead's copy decisions (FIX_BRIEF D1, D6) and the Ahwatukee body split (D5) |

The five slop files are the verified lists of the 2026-10-17 copy review: every edit was researched, then checked
by an adversarial verifier. Only verdicts `accept` and `amend` are here (for `amend`, `new_text` is the verifier's
text); no edit was rejected.

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

The module runs at three points of the migration, so each edit lands before the checks that read its text:

1. **early**, after `fixes`: FAQ answers and city bodies. `local-facts` then checks its neighbourhood quotes against the
   edited city bodies, and `cms-templates` checks the Panels at-a-glance evidence against the edited FAQ answers.
2. **service**, inside `cms-templates`, after the price edits and before the quick-answer and at-a-glance checks.
3. **late**, last: page sections and team members (made by `page-sections`), Site settings (after `page-sections` has
   compared its shared lists and CTA band with the live copy, so the pages keep using them) and post bodies (written
   against the bodies `cms-templates` leaves).

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
