# Local facts for the city pages

Researched 2026-10-13 for the redesign. These are the county, electric utility, permit office, ZIP codes, city-center coordinates and neighborhoods for Mesa (the homepage) and the ten `/locations/*` pages, each with a source.

- Data: `migration/local-facts/locations.json` (the ten city documents) and `migration/local-facts/mesa.json` (Mesa). Every value carries source ids and a confidence.
- Applied by `scripts/migrate/content/local-facts.mjs` during the Webflow→Sanity migration. It writes only `high`-confidence values: `county`, `zipCodes`, `neighborhoods`, `utilityProviders`, `permitNotes` and `geo` on each location, and `county`, `neighborhoods` and `utilityProviders` on Site settings → Home city (Mesa). It stops the run if a utility is not in the schema's list, a ZIP is malformed, a coordinate is outside Arizona, or a neighborhood is not in the business's own copy.
- Titles, meta descriptions, H1s, slugs and body copy are unchanged.

## How each value was sourced

- **County**: U.S. Census Bureau 2020 place-by-county file. Queen Creek and Apache Junction each lie in both Maricopa and Pinal counties. The schema's `county` is a single string, so it keeps the county already used (Queen Creek: Maricopa; Apache Junction: Pinal), and the permit notes state the split.
- **Electric utility**: SRP's 2026 Electric Service Specifications include an "SRP Electric Service Area" map (drawn in 2010 and republished in the 2026 edition). Its insets draw each APS pocket inside SRP's area and the City of Mesa's service area. APS's Metro Phoenix territory map and the cities' own utility listings agree with it. Values use the schema list (`SRP`, `APS`, `City of Mesa`, `TEP`, `ED3`), and the split is described in words. TEP serves Tucson and does not apply here. ED3 serves western Pinal County and was not found to serve San Tan Valley. The utility for a given home depends on its address.
- **Permit authority**: the official city, town or county page. Several city sites block automated requests (mesaaz.gov, gilbertaz.gov, tempe.gov, queencreekaz.gov, explore.pinal.gov, azmag.gov). For those, the content was confirmed from search-engine extracts of the official pages, and each source note says so.
- **ZIP codes**: the Census 2020 ZCTA-to-place relationship file. A ZIP is listed when at least 40% of its land is inside city limits, or when it covers at least 5% of the city's land (with at least 0.25 sq mi of overlap). This is ZCTA level, which closely tracks USPS ZIP areas. USPS's own lookup blocks automated requests, so USPS city names were not checked. PO-box-only ZIPs have no ZCTA and are not listed. Ahwatukee is not a Census place. Its ZIPs come from intersecting the City of Phoenix's official Ahwatukee Foothills village boundary with the Census ZCTAs and dropping overlaps that are only South Mountain Park land.
- **City center**: the USGS GNIS populated-place point, which marks the traditional town center, rounded to 4 decimals. It is used for `geo` and the `areaServed` schema. The Census 2025 Gazetteer internal points were checked too. They mark each city's geometric middle instead, which for Phoenix is north Phoenix rather than downtown.
- **Neighborhoods**: only names the business already uses on its homepage city tiles or in the "Service Areas within {City} include" list on the location page. None were added. Three names could not be verified and are held back (see below).

## Summary

| City | County | Electric utility | Permit authority | ZIP codes | City center (lat, lng) |
|---|---|---|---|---|---|
| Mesa (homepage) | Maricopa County [2] | SRP, City of Mesa [33][34][5] | [City of Mesa Development Services Department](https://www.mesaaz.gov/business/development-services/residential-construction) [35] | 85201, 85202, 85203, 85204, 85205, 85206, 85207, 85208, 85209, 85210, 85212, 85213, 85215* [1] | 33.4223, -111.8226 ([GNIS 7890](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/7890)) |
| Gilbert | Maricopa County [2] | SRP, APS [5][7][9] | [Town of Gilbert Development Services (Plan Review & Inspection)](https://www.gilbertaz.gov/departments/development-services/plan-review-inspection/permits-applications) [8] | 85233, 85234, 85295, 85296, 85297, 85298 [1] | 33.3528, -111.789 ([GNIS 5032](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/5032)) |
| Chandler | Maricopa County [2] | SRP, APS [5][7][12] | [City of Chandler Development Services Department, Building Safety (plan review, permits and inspections)](https://www.chandleraz.gov/government/departments/development-services/building-safety-plan-review-permits-and-inspections) [10][11] | 85224, 85225, 85226*, 85248*, 85249, 85286 [1] | 33.3062, -111.8413 ([GNIS 2748](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/2748)) |
| Scottsdale | Maricopa County [2] | SRP, APS [5][7] | [City of Scottsdale Planning & Development (Permit Services, One Stop Shop, 7447 E. Indian School Road)](https://www.scottsdaleaz.gov/planning-development/permit-services) [13][14] | 85250*, 85251, 85255, 85257, 85258, 85259, 85260, 85262*, 85266 [1] | 33.5092, -111.899 ([GNIS 11029](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/11029)) |
| Tempe | Maricopa County [2] | SRP, APS [5][7][16] | [City of Tempe Community Development Department, Building Safety Division (Permit Center)](https://www.tempe.gov/government/community-development/building-safety) [15] | 85281, 85282, 85283, 85284 [1] | 33.4148, -111.9093 ([GNIS 12233](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/12233)) |
| Phoenix | Maricopa County [2] | APS, SRP [5][7] | [City of Phoenix Planning and Development Department (PDD)](https://www.phoenix.gov/administration/departments/pdd/residential-building.html) [17][18] | 85003, 85004, 85006, 85007, 85008, 85009, 85012, 85013, 85014, 85015, 85016, 85017, 85018, 85019, 85020, 85021, 85022, 85023, 85024, 85027, 85028, 85029, 85031, 85032, 85033, 85034, 85035, 85037, 85040, 85041, 85042, 85043, 85044, 85045, 85048, 85050, 85051, 85053, 85054, 85083, 85085, 85086*, 85254, 85310, 85353* [1] | 33.4484, -112.074 ([GNIS 44784](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/44784)) |
| Ahwatukee | Maricopa County [2] | SRP [5][7] | [City of Phoenix Planning and Development Department (PDD) — Ahwatukee Foothills is one of Phoenix’s 15 urban villages](https://www.phoenix.gov/administration/departments/pdd/residential-building.html) [19][17][18] | 85044, 85045, 85048 [19][3][20] | 33.3417, -111.984 ([GNIS 24705](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/24705)) |
| Queen Creek | Maricopa County (also Pinal County) [2] | SRP [22][5] | [Town of Queen Creek Development Services Department, Building Safety Division](https://www.queencreekaz.gov/government/development-services/building-safety) [21] | 85140*, 85142* [1] | 33.2487, -111.6343 ([GNIS 9868](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/9868)) |
| San Tan Valley | Pinal County [2] | SRP [5][26] | [Pinal County Community Development, Building Safety — handling plan review, permits and inspections for the Town of San Tan Valley under an intergovernmental agreement (currently scheduled through 2026-12-31)](https://www.pinal.gov/189/Building-Safety) [24][23] | 85140*, 85142*, 85143 [1] | 33.1911, -111.528 ([GNIS 2576311](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/2576311)) |
| Apache Junction | Pinal County (also Maricopa County) [2] | SRP [28][5] | [City of Apache Junction Development Services Department, Division of Building Safety and Inspection](https://www.apachejunctionaz.gov/85/Building-Safety-and-Inspection) [27] | 85119*, 85120 [1] | 33.415, -111.5496 ([GNIS 25702](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/25702)) |
| Fountain Hills | Maricopa County [2] | SRP [30][5] | [Town of Fountain Hills Development Services, Building Safety Division](https://www.fountainhillsaz.gov/204/Building-Safety) [29] | 85268 [1] | 33.6117, -111.7174 ([GNIS 36980](https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/36980)) |

`*` = less than half of the ZIP’s land is inside the city (listed because it covers a large part of the city, or 40–50% of it is inside).

## Utility territory detail

| City | Detail |
|---|---|
| Mesa (homepage) | The City of Mesa delivers electric service within a 5.5-square-mile Electric Service Area centered on and including downtown Mesa (more than 18,000 homes and businesses); SRP serves the rest of the city. [33][34][5] |
| Gilbert | Most of Gilbert is in SRP’s electric service area. APS serves a pocket between Guadalupe and Warner roads, from Cooper Road to Lindsay Road. [5][7][9] |
| Chandler | Most of Chandler is in SRP’s electric service area. APS serves parts of the city, including the area between Ray and Pecos roads from Alma School Road to McQueen Road, and a second small pocket near Arizona Avenue shown in a separate inset of the SRP map. [5][7][12] |
| Scottsdale | SRP serves much of central and south Scottsdale. APS serves most of north Scottsdale and a pocket of south Scottsdale between Thomas and Chaparral roads, from 64th Street to Hayden Road. [5][7] |
| Tempe | Most of Tempe is in SRP’s electric service area. APS serves an area around downtown Tempe, roughly Broadway Road north to Weber Drive, between Beck Avenue and Dorsey Lane (SRP map inset; the inset labels the north edge "Weber Rd."). [5][7][16] |
| Phoenix | Phoenix is split between APS and SRP. APS serves much of central and north Phoenix; SRP serves other parts of the city, including Ahwatukee. [5][7] |
| Ahwatukee | Ahwatukee lies inside SRP’s electric service area and outside APS’s. [5][7] |
| Queen Creek | The Town lists Salt River Project for electric service, and the town is inside SRP’s service area. [22][5] |
| San Tan Valley | San Tan Valley lies inside SRP’s service area in northern Pinal County. ED3 (Electrical District No. 3) serves western Pinal County and was not found to serve San Tan Valley. [5][26] |
| Apache Junction | The City says utility poles and power lines in Apache Junction are owned by SRP; the city is inside SRP’s service area. [28][5] |
| Fountain Hills | The Town lists SRP for power emergencies, and the town is inside SRP’s service area. [30][5] |

## Neighborhoods

Only names the business already uses: the homepage city tiles (“tile”) or the “Service Areas within {City} include” list in the location body (“body”). The migration module re-checks each quote against that copy.

| City | Applied | Held back (confirm with owner) |
|---|---|---|
| Mesa (homepage) | Eastmark (tile), Las Sendas (tile), Red Mountain Ranch (tile), Dobson Ranch (tile) | – |
| Gilbert | Power Ranch (tile), Val Vista Lakes (tile), Seville (tile), Morrison Ranch (tile), Agritopia (tile), The Islands (body) | – |
| Chandler | Ocotillo (tile), Fulton Ranch (tile), Downtown Chandler (tile), Sun Groves (body), Andersen Springs (body) | – |
| Scottsdale | North Scottsdale (tile), DC Ranch (tile), McCormick Ranch (tile), Gainey Ranch (tile), Old Town Scottsdale (body) | – |
| Tempe | Downtown Tempe (tile), South Tempe (tile), The Lakes (tile), North Tempe (body), Maple-Ash (body) | – |
| Phoenix | Arcadia (tile), Biltmore (tile), Ahwatukee (tile), North Phoenix (tile), Central City (tile), Downtown Phoenix (body) | – |
| Ahwatukee | Foothills Club West (body), Mountain Park Ranch (body), Lakewood (body), Desert Foothills (body) | Center Court |
| Queen Creek | Queen Creek Marketplace Area (body), Sossaman Estates (body), Montelena (body), Ironwood Crossing (body), Hastings Farms (body) | – |
| San Tan Valley | Johnson Ranch (body), San Tan Heights (body), Copper Basin (body), Morning Sun Farms (body), Pecan Creek (body) | – |
| Apache Junction | Superstition Foothills (body), Ironwood Estates (body), Jacobs Ranch (body) | Cimmarron; Renaissance Point |
| Fountain Hills | Fountain Park District (body), SunRidge Canyon (body), Eagle Mountain (body), North Heights (body), Firerock (body) | – |

## Permit notes (as written to `permitNotes`)

**Mesa (homepage)** (stored in mesa.json; Home city has no permitNotes field yet) [35][33][5]

> Residential electrical permits in Mesa are issued by the City of Mesa Development Services Department, which handles plan review, permits and inspections. Installing or modifying electrical systems is on the city’s list of work that needs a construction permit.
>
> Mesa has two electric utilities: the City of Mesa serves a 5.5-square-mile area centered on downtown, and SRP serves the rest of the city. In SRP’s area, SRP’s service specifications say to contact both SRP and the permitting authority before a panel upgrade, and SRP reconnects power once both approve the work.

**Gilbert** [8][5][6]

> Residential electrical permits in Gilbert are issued by the Town of Gilbert’s Development Services department (Plan Review & Inspection). Applications, fees and inspection requests go through the Town’s OneStopShop portal.
>
> Most of Gilbert is in SRP’s electric service area; APS serves a pocket between Guadalupe and Warner roads, from Cooper Road to Lindsay Road. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work; APS energizes a new, relocated or replaced meter only after the inspection authority approves the wiring. An EV charger that needs a larger service or a new panel follows the same steps.

**Chandler** [10][11][5][6]

> Residential electrical permits in Chandler are issued by the City of Chandler Development Services Department (Building Safety: plan review, permits and inspections). Plans submitted on or after July 1, 2025 are reviewed under the 2024 International Codes and the 2023 National Electrical Code, as amended by the city.
>
> For an electrical permit, the city’s homeowner permit manual asks for a panel schedule showing existing and new breakers, and load calculations may also be required.
>
> Most of Chandler is in SRP’s electric service area; APS serves parts of the city, including the area between Ray and Pecos roads from Alma School Road to McQueen Road. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work; APS energizes a new, relocated or replaced meter only after the inspection authority approves the wiring. An EV charger that needs a larger service or a new panel follows the same steps.

**Scottsdale** [13][5][6]

> Residential electrical permits in Scottsdale are issued by the City of Scottsdale Planning & Development department (Permit Services and the One Stop Shop at 7447 E. Indian School Road). Applications go through the city’s Scottsdale SPUR portal. The city fines work completed without a permit an amount equal to double the permit fee.
>
> Scottsdale is split between two utilities: SRP serves much of central and south Scottsdale, and APS serves most of north Scottsdale plus a pocket of south Scottsdale between Thomas and Chaparral roads, from 64th Street to Hayden Road. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work; APS energizes a new, relocated or replaced meter only after the inspection authority approves the wiring. An EV charger that needs a larger service or a new panel follows the same steps.

**Tempe** [15][5][6]

> Residential electrical permits in Tempe are issued by the City of Tempe Community Development Department’s Building Safety Division (Permit Center). Applications are submitted, and inspections requested, through the Tempe Citizen Access Portal.
>
> Most of Tempe is in SRP’s electric service area; APS serves an area around downtown Tempe, roughly Broadway Road north to Weber Drive, between Beck Avenue and Dorsey Lane. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work; APS energizes a new, relocated or replaced meter only after the inspection authority approves the wiring. An EV charger that needs a larger service or a new panel follows the same steps.

**Phoenix** [17][18][5][6]

> Residential electrical permits in Phoenix are issued by the City of Phoenix Planning and Development Department (PDD). Under the Planning and Development Department’s EV charger guidance, a home charger can be reviewed and permitted over the counter when the existing electrical service is 200 amps single-phase or less and does not need an upgrade; a charger that requires upgrading the service beyond 200 amps single-phase goes to formal plan review.
>
> Phoenix is split between APS and SRP: APS serves much of central and north Phoenix, and SRP serves other parts of the city, including Ahwatukee. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work; APS energizes a new, relocated or replaced meter only after the inspection authority approves the wiring.

**Ahwatukee** [19][17][18][5]

> Ahwatukee Foothills is one of the City of Phoenix’s 15 urban villages, so residential electrical permits come from the City of Phoenix Planning and Development Department (PDD). Under the Planning and Development Department’s EV charger guidance, a home charger can be reviewed and permitted over the counter when the existing electrical service is 200 amps single-phase or less and does not need an upgrade; a charger that requires upgrading the service beyond 200 amps single-phase goes to formal plan review.
>
> Ahwatukee is in SRP’s electric service area. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work.

**Queen Creek** [21][2][22][5]

> Residential electrical permits in Queen Creek are issued by the Town of Queen Creek Development Services Department’s Building Safety Division, which reviews plans against the town’s adopted building and electrical codes. Applications and inspections run through the Town’s Development Nexus portal. Queen Creek lies in both Maricopa and Pinal counties.
>
> The Town lists SRP as its electric utility. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work. An EV charger that needs a larger service or a new panel follows the same steps.

**San Tan Valley** [24][25][5]

> San Tan Valley voted to incorporate as a town in 2025. During the transition, Pinal County Building Safety has handled building plan review, permits and inspections for the new Town of San Tan Valley under an intergovernmental agreement, so confirm which office is accepting applications before applying.
>
> San Tan Valley is in Pinal County and inside SRP’s electric service area. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work. An EV charger that needs a larger service or a new panel follows the same steps.

**Apache Junction** [27][2][28][5]

> Residential electrical permits in Apache Junction are issued by the City of Apache Junction Development Services Department’s Division of Building Safety and Inspection, which takes permit applications and handles plan review and inspections online through MyGovernmentOnline (MGO). The city lies in both Pinal and Maricopa counties.
>
> The city’s utility poles and power lines are owned by SRP. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work. An EV charger that needs a larger service or a new panel follows the same steps.

**Fountain Hills** [29][30][5]

> Residential electrical permits in Fountain Hills are issued by the Town of Fountain Hills Development Services Building Safety Division. Applications, review status and inspection scheduling go through the Town’s Online Permitting and Planning System (TOPPS).
>
> Fountain Hills is in SRP’s electric service area. For a panel upgrade, SRP’s service specifications say to contact both SRP and the permitting authority first, and SRP reconnects power once both approve the work. An EV charger that needs a larger service or a new panel follows the same steps.



## Confirm with owner

1. **Held-back neighborhood names.** These are in the business's own copy, but no neighborhood by these names could be found, so they were not written to Sanity:
   - Apache Junction: **"Cimmarron"**. GNIS's only "Cimarron" is in Tempe. Is the spelling or the name different?
   - Apache Junction: **"Renaissance Point"**.
   - Ahwatukee: **"Center Court"**. The only match found is Center Court Villas in Fountain Hills.
2. **Neighborhoods with search demand that the business does not name yet** (from Google Search Console; not added):
   - Mesa: Superstition Springs, Leisure World, Alta Mesa ("electrician alta mesa, az", 62 impressions), Cadence at Gateway, "East Mesa".
   - Gilbert: Higley ("electrician higley az", 53 impressions at position 4.5).
   - Chandler: Chandler Heights (unincorporated, next to the city) and Sun Lakes (unincorporated; a query for it lands on the Tempe page).
   - Scottsdale: Kierland and Grayhawk (both recommended in the GSC report). Paradise Valley, Carefree and Cave Creek have demand but are separate towns, so each would be a service-area decision, not a Scottsdale neighborhood.
   - Phoenix: Desert Ridge (named in the body only as "Desert Ridge Marketplace") and Laveen (an official Phoenix village).
   - Fountain Hills: Fort McDowell (60 impressions; this is the Fort McDowell Yavapai Nation, not part of the town) and Hidden Hills (46 impressions; location not verified).
   - Apache Junction: Gold Canyon (an unincorporated community east of the city, ZIP 85118) and Mountain Brook.
3. **San Tan Valley permitting.** Voters approved incorporating the Town of San Tan Valley in 2025. Under an intergovernmental agreement scheduled to run through **2026-12-31**, Pinal County currently takes the town's building permit applications. The permit note is worded to stay true after the agreement ends, but after January 2027 it should be updated to name whichever office then issues permits.
4. **Spelling and labels.** "Jacobs Ranch": listing data spells it "Jacob's Ranch". "Fountain Park District" is the business's name for the area around Fountain Park (the town center), not a subdivision. "Andersen Springs" appears as a Chandler subdivision only in listing data. The Phoenix tile says "Biltmore" and the body says "Biltmore Area"; `neighborhoods` uses "Biltmore".
5. **Phoenix ZIP list.** It has 45 ZIPs, including some whose USPS city name is not Phoenix but where at least 40% of the ZIP is inside Phoenix (85310 Glendale, 85353 Tolleson, 85086 Anthem area). Confirm the owner wants all of them shown, or show only part of the list on the page.
6. **Landmarks in the existing body copy that may be outside the city** (copy not changed; check before reusing):
   - Fountain Hills mentions Desert Botanical Garden, which is in Phoenix's Papago Park.
   - San Tan Valley mentions Schnepf Farms, which is in Queen Creek.
   - Apache Junction mentions Gold Canyon Golf Resort, which is in Gold Canyon.
   - Scottsdale mentions Talking Stick Resort, which is on Salt River Pima-Maricopa Indian Community land.

## Notes for the other workstreams

- **Home city (Mesa).** The schema's `homeCity` object has no `zipCodes`, `geo` or `permitNotes` fields. Those Mesa values are in `migration/local-facts/mesa.json`, ready to add if the schema gains the fields. `local-facts.mjs` merges into `siteSettings.homeCity` and keeps any existing `name`, `cardBlurb` and `image`. `page-sections.mjs` runs after it, so it should merge into `homeCity` rather than replace it.
- **Multi-county cities.** Queen Creek and Apache Junction each span two counties, but `county` is a single string. The JSON has a `counties` array for both if the schema ever takes a list.
- **Utility values.** These mirror `UTILITY_PROVIDERS` in `studio/schemaTypes/shared/fields.ts`. If that list changes, update the `UTILITIES` constant in `local-facts.mjs` too.

## Sources

1. [2020 Census ZCTA to Place Relationship File (tab20_zcta520_place20_natl.txt)](https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_place20_natl.txt). U.S. Census Bureau, accessed 2026-10-13.
2. [2020 Census Place by County reference file, Arizona (st04_az_place_by_county2020.txt)](https://www2.census.gov/geo/docs/reference/codes2020/place_by_cou/st04_az_place_by_county2020.txt). U.S. Census Bureau, accessed 2026-10-13.
3. [TIGERweb 2020 Census ZIP Code Tabulation Areas (layer 1), queried for the Ahwatukee Foothills village overlap](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1). U.S. Census Bureau, accessed 2026-10-13.
4. [GNIS Domestic Names, Arizona (populated-place coordinates)](https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/DomesticNames/DomesticNames_AZ_Text.zip). U.S. Geological Survey, accessed 2026-10-13.
5. [SRP Electric Service Specifications (2026 republication, revised through 2026-08): section 1-1-1 "SRP Electric Service Area" map with "APS Boundaries within the Salt River Project Valley Service Area" and "City of Mesa Boundary" insets; section 1-3 items 4 and 6](https://azure-na-assets.contentstack.com/v3/assets/bltefc1fc708dcc94e7/blt87e6290270102348/6a85de4fc0f001dc63fe7495/Electric_Service_Specifications.pdf). Salt River Project, accessed 2026-10-13.
6. [APS Electric Service Requirements Manual, section 100 (General Information), 100.9 Inspection Approval and Permits](https://www.aps.com/-/media/APS/APSCOM-PDFs/About/Construction-and-Power-Line-Siting/Construction-Services/Electric-Service-Requirements-Manual/100.pdf). Arizona Public Service, accessed 2026-10-13.
7. [APS Service Territory, Metro Phoenix map (dated 2013-09-17; white = APS service area)](https://www.aps.com/-/media/APS/APSCOM-PDFs/Residential/Service-Plans/Service-Territory-Map/APS_Service_Territory_Phoenix_Metro.pdf). Arizona Public Service, accessed 2026-10-13.
8. [Town of Gilbert Development Services: Permits, Applications & Checklists (Plan Review & Inspection)](https://www.gilbertaz.gov/departments/development-services/plan-review-inspection/permits-applications). Town of Gilbert, accessed 2026-10-13. Note: gilbertaz.gov returns 403 to automated fetches; content confirmed through search-engine extracts (applications, payments and inspection scheduling run through the OneStopShop portal).
9. [Town of Gilbert Emergency Management: Power Outage](https://www.gilbertaz.gov/departments/emergency-management/hazards-emergency-situations/power-outage). Town of Gilbert, accessed 2026-10-13. Note: Search-engine extract: the Town of Gilbert has two utility companies operating within the Town, SRP and APS.
10. [City of Chandler Development Services: Building Safety — Plan Review, Permits and Inspections](https://www.chandleraz.gov/government/departments/development-services/building-safety-plan-review-permits-and-inspections). City of Chandler, accessed 2026-10-13.
11. [City of Chandler Homeowner’s Building Permit Manual (Development Services Department), "Electrical Permits"](https://www.chandleraz.gov/government/departments/development-services/building-safety-plan-review-permits-and-inspections). City of Chandler, accessed 2026-10-13. Note: Linked from the Building Safety page ("Homeowner's Building Permit Manual"); PDF modified 2026-10-09.
12. [City of Chandler Utility Services ("Other Utility Services: APS, SRP, Southwest Gas")](https://www.chandleraz.gov/residents/utility-services). City of Chandler, accessed 2026-10-13.
13. [City of Scottsdale Planning & Development: Permit Services](https://www.scottsdaleaz.gov/planning-development/permit-services). City of Scottsdale, accessed 2026-10-13.
14. [City of Scottsdale Planning & Development: Home Improvement](https://www.scottsdaleaz.gov/planning-development/home-improvement). City of Scottsdale, accessed 2026-10-13.
15. [City of Tempe Community Development: Building Safety (Permit Center)](https://www.tempe.gov/government/community-development/building-safety). City of Tempe, accessed 2026-10-13. Note: tempe.gov returns 403 to automated fetches; content confirmed through search-engine extracts (Building Safety Division of Community Development; applications through the Tempe Citizen Access Portal; Permit Center 480-350-4311).
16. [City of Tempe New Community Member Directory (lists APS and SRP for electricity)](https://www.tempe.gov/government/city-manager-s-office/neighborhood-services/new-community-member-directory). City of Tempe, accessed 2026-10-13. Note: Search-engine extract (direct fetch returns 403).
17. [City of Phoenix Planning and Development: Residential Building](https://www.phoenix.gov/administration/departments/pdd/residential-building.html). City of Phoenix, accessed 2026-10-13.
18. [City of Phoenix PDD, "Electric Vehicle Chargers – Residential Permitting" (TRT/DOC/00311, new 05/23)](https://www.phoenix.gov/content/dam/phoenix/pddsite/documents/trt/external/dsd_trt_pdf_00311.pdf). City of Phoenix, accessed 2026-10-13.
19. [City of Phoenix GIS, Villages map service (15 urban villages, including "Ahwatukee Foothills" and "Central City")](https://maps.phoenix.gov/pub/rest/services/Public/Villages/MapServer/0). City of Phoenix, accessed 2026-10-13.
20. [City of Phoenix GIS, Park Boundaries (South Mountain), used to exclude park-only ZIP overlap from Ahwatukee](https://maps.phoenix.gov/pub/rest/services/Public/ParksOpenData/MapServer/10). City of Phoenix, accessed 2026-10-13.
21. [Town of Queen Creek Development Services: Building Safety](https://www.queencreekaz.gov/government/development-services/building-safety). Town of Queen Creek, accessed 2026-10-13. Note: queencreekaz.gov returns 403 to automated fetches; content confirmed through search-engine extracts (Building Safety Division enforces the adopted building, plumbing, mechanical and electrical codes; plan review, permit issuance and inspection; Development Nexus online portal).
22. [Town of Queen Creek Resident Resources (lists Salt River Project for electric service)](https://queencreekaz.gov/residents/resident-resources). Town of Queen Creek, accessed 2026-10-13. Note: Search-engine extract (direct fetch returns 403).
23. [Pinal County Community Development: Building Safety](https://www.pinal.gov/189/Building-Safety). Pinal County, accessed 2026-10-13.
24. [Pinal County, applicant information for permitting in the Town of San Tan Valley (Document Center 30892) and news flash 2439 (2026-06-10)](https://explore.pinal.gov/DocumentCenter/View/30892). Pinal County, accessed 2026-10-13. Note: explore.pinal.gov returns 403 to automated fetches; content confirmed through two independent search-engine extracts: the Town has an IGA with Pinal County for building plan review, permitting, inspections and certificates of occupancy, currently scheduled to run through 2026-12-31; applicants submit building permit applications to Pinal County. The banner "Important Permitting Information for the Town of San Tan Valley" appears on https://www.pinal.gov/191/Applications-Information-Bulletins.
25. [Maricopa Association of Governments: Town of San Tan Valley Becomes Newest MAG Member Agency](https://azmag.gov/Newsroom/News-Releases/town-of-san-tan-valley-becomes-newest-mag-member-agency). Maricopa Association of Governments, accessed 2026-10-13. Note: Search-engine extract (direct fetch returns 403): incorporation approved by voters (Proposition 495, 2025-08-05); Town officially incorporated 2025-09-17. GNIS also lists "Town of San Tan Valley" as a civil feature (ID 2833010, added 2025-09-23).
26. [Electrical District No. 3 of Pinal County: History](https://www.ed3online.org/about-us/history). Electrical District No. 3, accessed 2026-10-13. Note: ed3online.org returns 403 to automated fetches; search-engine extract: territory described as south of the Gila River Indian Community, north of the Tohono O’odham Nation, east of the Pinal-Maricopa county line and west of the City of Casa Grande (i.e. western Pinal County, not San Tan Valley).
27. [City of Apache Junction Development Services: Division of Building Safety and Inspection](https://www.apachejunctionaz.gov/85/Building-Safety-and-Inspection). City of Apache Junction, accessed 2026-10-13.
28. [City of Apache Junction: Overhead Lines](https://www.apachejunctionaz.gov/1118/Utility-Poles-and-Overhead-Lines). City of Apache Junction, accessed 2026-10-13.
29. [Town of Fountain Hills Development Services: Building Safety](https://www.fountainhillsaz.gov/204/Building-Safety). Town of Fountain Hills, accessed 2026-10-13.
30. [Town of Fountain Hills: Important Numbers and Utility Contact Information](https://www.fountainhillsaz.gov/741/Utility-Contact-Information). Town of Fountain Hills, accessed 2026-10-13.
31. [The Wire Guy Electric homepage, service-area tiles (live snapshot migration/live-snapshots/index.html)](https://www.thewireguyelectric.com/). The Wire Guy Electric, accessed 2026-10-13.
32. [The Wire Guy Electric location page body, "Service Areas within {City} include" list (Sanity location.body)](https://www.thewireguyelectric.com/locations/{slug}). The Wire Guy Electric, accessed 2026-10-13.
33. [Select Mesa (City of Mesa Office of Economic Development): Infrastructure](https://selectmesa.com/business-environment/infrastructure/). City of Mesa, accessed 2026-10-13.
34. [City of Mesa Electric Service Area map ("Total Service Area: 5.5 Sq. Miles")](https://gis.mesaaz.gov/energy/serviceareas/Electric_Service_Area.pdf). City of Mesa, accessed 2026-10-13.
35. [City of Mesa Development Services: Residential Construction](https://www.mesaaz.gov/business/development-services/residential-construction). City of Mesa, accessed 2026-10-13. Note: mesaaz.gov returns 403 to automated fetches; content confirmed through search-engine extracts of the official page (Development Services issues construction permits, conducts plan reviews and performs inspections; installing or modifying electrical systems needs a construction permit; 2023 NEC adopted).
