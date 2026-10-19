# Source map for the D18 copy (new service pages and the two retitles)

Every paragraph of new copy, with the existing site content it restates. The permit lines follow the posts' stance (a permit is talked through with the homeowner, and when one is pulled we pull it and schedule the inspection), not the /faq line "Permits are required for all major electrical work", so the new pages agree with the cost guides they link (fix round, 2026-10-19). Post blocks are named `post-slug#blockKey` (keys as in migration/sanity-import/production.ndjson). "/faq: Q" is the live /faq answer in migration/content-data/faqs.json. Local facts are migration/local-facts/*.json. The copy lives in migration/content-data/new-services.json (bodies, FAQs) and migration/content-data/cms-templates.json (quick answers, at-a-glance facts).

## /services/whole-home-rewiring

| Paragraph | Source |
|---|---|
| Short description (hero lede) | cost-to-rewire-house-arizona#k01z (partial rewire), #k02h (aluminum, cloth, knob-and-tube); #k01a (copper, current code) |
| Quick answer | the body below (cms-templates evidence phrases); no permit line (the permit stance follows the posts, see "Permits" below) |
| At a glance: Permits ("We walk you through it") | the body's permit paragraph below; cost-to-rewire-house-arizona#k01s ("We'll walk you through whether it makes sense") |
| At a glance: Typical timeline | cost-to-rewire-house-arizona#k035 |
| H2 intro ("Some mid-century and older homes…") | outdated-wiring-in-older-phoenix-homes#k003; cost-to-rewire-house-arizona#k02h; #k01z (partial rewire); #k03j ("We see single strand aluminum wiring constantly in older homes across Mesa, Tempe, Phoenix, and Scottsdale") |
| Single strand aluminum: 1965–1975, copper prices | aluminum-wiring-older-phoenix-homes#k003, #k012 (Scottsdale, Tempe, east Mesa, central Phoenix) |
| The trouble is at the connections | aluminum-wiring-older-phoenix-homes#k00f, #k00h, #k00k, #k00n, #k00q; /faq: "Is aluminum wiring dangerous?" |
| Not all aluminum is a problem | aluminum-wiring-older-phoenix-homes#k003, #k01c |
| Full rewire vs AlumiConn, purple wire nuts, CO/ALR, remediation report | /faq: "Is aluminum wiring dangerous? Should I replace it?" ("In most cases we recommend a full rewire… AlumiConn connectors at every connection point"); aluminum-wiring-older-phoenix-homes#k02m, #k036, #k039, #k042 |
| Cloth, knob-and-tube and ungrounded wiring (list) | outdated-wiring-in-older-phoenix-homes#k01l, #k01o–#k01u (knob-and-tube pre-1950s, fuse boxes, ungrounded subpanels, DIY from flips); cost-to-rewire-house-arizona#k02h (cloth); /services/fixture-replacements body ("Older two-wire circuits are common in homes wired before grounding was standard") |
| Attic heat, 60-amp service | /services/fixture-replacements body ("decades of heat in an attic makes conductor insulation crack right at the box"); outdated-wiring-in-older-phoenix-homes#k00s |
| Signs list | cost-to-rewire-house-arizona#k02h, #k02k, #k02n, #k02s, #k02y; aluminum-wiring-older-phoenix-homes#k03j–#k03s, #k040 |
| "A burning smell… are urgent" | cost-to-rewire-house-arizona#k02s |
| What a rewire involves (NEC, Romex, GFCI, AFCI, panel upgrade, labor overlap) | cost-to-rewire-house-arizona#k01a, #k01c, #k01f, #k01p, #k01k |
| Partial rewire, open walls | cost-to-rewire-house-arizona#k01z, #k02v |
| Start with an inspection | cost-to-rewire-house-arizona#k029 |
| Permits; Mesa permit office | cost-to-rewire-house-arizona#k01s ("the kind of major project where pulling a permit usually makes sense, especially if you plan to sell the home or want the work documented for insurance. We'll walk you through whether it makes sense for your specific situation and what it adds to the cost"); /faq: "Do I need a permit…" ("We pull the permit, schedule the inspection, and make sure everything passes"); migration/local-facts/mesa.json permitAuthority ("City of Mesa Development Services Department") |
| 3–5 days, process, drywall after | cost-to-rewire-house-arizona#k035, #k039, #k014 |
| Circuits kept live; meter pull with the utility | cost-to-rewire-house-arizona#k03b; /services/panels body ("A real panel replacement requires the utility to pull the meter… We coordinate that for you") |
| What it costs (drivers, no figures) + link to the cost guide; flat-rate | cost-to-rewire-house-arizona#k00p, #k014; /faq: "How much does an electrician cost per hour in Phoenix?" (flat-rate pricing) |
| Find out what wiring you have | cost-to-rewire-house-arizona#k03j, #k03x; ROC from Site settings |
| FAQ: aluminum, how to tell | aluminum-wiring-older-phoenix-homes#k012, #k016, #k01a; cost-to-rewire-house-arizona#k03j |
| FAQ: how long | cost-to-rewire-house-arizona#k035 |
| FAQ: power during the job | cost-to-rewire-house-arizona#k03b |
| FAQ: insurance | aluminum-wiring-older-phoenix-homes#k040, #k042 |

## /services/hot-tub-pool-spa-electrical

| Paragraph | Source |
|---|---|
| Short description, quick answer | the body below; pool-pump-electrical-requirements-arizona#k03d |
| At a glance: Permits ("We walk you through it") | the body's permit paragraph below; hot-tub-electrical-installation-cost-arizona#k01j ("We talk through the tradeoff with every homeowner before we start") |
| At a glance: Hot tub hookups | hot-tub-electrical-installation-cost-arizona#k02m |
| H2 intro | hot-tub-electrical-installation-cost-arizona#k007; pool-pump-electrical-requirements-arizona#k009, #k03d |
| Dedicated circuit, 40–60 amps | hot-tub-electrical-installation-cost-arizona#k00x |
| Hookup list (GFCI, disconnect, wire size, bonding, conduit) | hot-tub-electrical-installation-cost-arizona#k011, #k015, #k019, #k01f, #k020, #k01v |
| 120V plug-and-play vs 240V hardwired | hot-tub-electrical-installation-cost-arizona#k01p, #k01r |
| Equipment pad list | pool-pump-electrical-requirements-arizona#k01n, #k01q, #k01t, #k01w, #k01z, #k022 |
| Older pools, pump swap | pool-pump-electrical-requirements-arizona#k024 |
| Variable speed pumps (drive, surge, 240V, voltage drop) | pool-pump-electrical-requirements-arizona#k02e, #k02j, #k02m, #k039 ("converting to a variable speed pump and want the circuit checked") |
| Bonding vs grounding | pool-pump-electrical-requirements-arizona#k00z, #k011, #k013 |
| Loose bonding wire after a swap | pool-pump-electrical-requirements-arizona#k01h |
| Signs list | pool-pump-electrical-requirements-arizona#k00i, #k019, #k01b, #k01d, #k01w, #k039 |
| Tingle, never swap the GFCI, troubleshooting | pool-pump-electrical-requirements-arizona#k019, #k00r, #k033 |
| Panel capacity, load calculation, heat pump | hot-tub-electrical-installation-cost-arizona#k023, #k00k; pool-pump-electrical-requirements-arizona#k02r |
| Permits, one-day hookup, panel upgrade adds 2–3 days | hot-tub-electrical-installation-cost-arizona#k01j ("the kind of work most cities technically require a permit for … We talk through the tradeoff with every homeowner before we start"), #k00s ("Pulling a permit adds time and cost to the job"); /faq: "Do I need a permit…" ("We pull the permit, schedule the inspection, and make sure everything passes"); hot-tub-electrical-installation-cost-arizona#k02m |
| What it costs (drivers, no figures) + cost guide link | hot-tub-electrical-installation-cost-arizona#k00h, #k00k, #k00p; flat-rate from /faq |
| Closing CTA | hot-tub-electrical-installation-cost-arizona#k02q |
| FAQ: own circuit | hot-tub-electrical-installation-cost-arizona#k00x, #k011, #k015, #k01p |
| FAQ: pump trips the GFCI | pool-pump-electrical-requirements-arizona#k00d–#k00r |
| FAQ: what is bonding | pool-pump-electrical-requirements-arizona#k00z, #k011, #k013 |
| FAQ: how long | hot-tub-electrical-installation-cost-arizona#k02m |

## /services/whole-house-surge-protection

| Paragraph | Source |
|---|---|
| Offered at all | /faq: "What types of electrical services do you offer?" ("surge protection") |
| Short description, quick answer | whole-house-surge-protector-guide-arizona#k004, #k00a, #k026, #k00m |
| At a glance: Install time | whole-house-surge-protector-guide-arizona#k00m |
| At a glance: Lifespan | whole-house-surge-protector-guide-arizona#k01q, #k01u |
| H2 intro | whole-house-surge-protector-guide-arizona#k004, #k00a, #k026; /faq: "What is a whole house surge protector…" |
| How it works | whole-house-surge-protector-guide-arizona#k00a, #k00c, #k01y |
| Won't stop a direct strike | /faq: "What is a whole house surge protector…" |
| Arizona list (monsoon, AC cycling, grid stress, older lines) | whole-house-surge-protector-guide-arizona#k00s, #k00u, #k00x, #k010, #k013 |
| What it protects | whole-house-surge-protector-guide-arizona#k018, #k01a |
| Power strips as a second layer | whole-house-surge-protector-guide-arizona#k01g, #k01k |
| Installation, grounding check, tandem breaker | whole-house-surge-protector-guide-arizona#k00m, #k01y, #k020, #k022 |
| How long it lasts | whole-house-surge-protector-guide-arizona#k01o, #k01q, #k01u |
| What it costs (no figures) + guide link; flat-rate | whole-house-surge-protector-guide-arizona#k00i; /faq hourly answer |
| Closing CTA | whole-house-surge-protector-guide-arizona#k026 |
| FAQ: lightning | /faq surge answer; whole-house-surge-protector-guide-arizona#k00u |
| FAQ: power strips | whole-house-surge-protector-guide-arizona#k01g, #k01i, #k01k |
| FAQ: lifespan | whole-house-surge-protector-guide-arizona#k01q, #k01u |
| FAQ: install time | whole-house-surge-protector-guide-arizona#k00m, #k01y |

## /services/fixture-replacements (new "Ceiling Fan Installation" section)

| Paragraph | Source |
|---|---|
| Every week; fan-rated box on a joist; light box can fail; mounting | ceiling-fan-installation-cost-arizona#k00c, #k012, #k01t |
| Light to fan; new location (box, wiring, switch); vaulted ceilings | ceiling-fan-installation-cost-arizona#k00w, #k01k, #k00z |
| Recessed lights with the fan; patio fans; cost guide link | ceiling-fan-installation-cost-arizona#k02a, #k027 |

## /services/exterior-electrical (new "How We Install Landscape Lighting" section)

| Paragraph | Source |
|---|---|
| Low voltage vs line voltage | landscape-lighting-installation-cost-phoenix#k024, #k028, #k02b |
| Fixture types, UV rating, LED vs halogen, 150 degrees | landscape-lighting-installation-cost-phoenix#k018–#k01p, #k01a, #k01w |
| Four-step process, 1–2 days | landscape-lighting-installation-cost-phoenix#k02p, #k02s, #k02v, #k030 |

## Titles and meta descriptions

Each restates the page's own body: the rewiring meta (aluminum wiring replacement, AlumiConn, cloth wiring, two-prong outlets), the hot tub meta (dedicated circuits, GFCI, disconnects, bonding, pool pump wiring), the surge meta (mounted at the panel; AC, appliances, pool pump), the fixture meta (fan-rated boxes, bracing, chandeliers, pendants, dimmers: the existing body) and the exterior meta (low-voltage LED, path and uplights: the new section; patio power and outdoor outlets: the existing body). ROC #365306 is Site settings.
