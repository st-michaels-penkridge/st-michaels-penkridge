# St Michael's Penkridge - Church Site & Grave Finder

Website for St Michael and All Angels, Penkridge, with a searchable churchyard grave finder. Built by Will King and Tobi Hussey.

## Where it stands

- Pages: Home, Gallery, Churchyard, Events
- Grave finder: name search, a map dot for every grave, memorial details, gravestone photos, and next/previous through nearby graves
- Data: 2,130 stones and 3,576 people, from the 2000 survey updated to about 2019 (`graveyard/graves.json`, source spreadsheet `graveyard/St Michaels Churchyard - Grave Records.xlsx`)

### Known gaps

- 881 stones are not marked on the old map, so their positions are estimates
- 0 positions have been checked on the ground
- 144 issues still flagged in the spreadsheet
- Tomb photos (`graveyard/LoRes10Tombs/`, about 1GB) are not in git - get the folder from Tobi (shared link)
- Gallery photos from Wikimedia Commons / Geograph need credits on the page before going live

## Running it locally

1. Get the `LoRes10Tombs/` folder from Tobi (shared link) and put it in `graveyard/`
2. The churchyard page loads its data with `fetch`, so it must run through a local web server, not by double-clicking the HTML file. From the repo folder:

```
python -m http.server 8000
```

3. Open http://localhost:8000

## Working together

- Pull before you start
- Split work by page or file so you are not editing the same lines
- Commit and push little and often

## Plan

### Phase 1 - launch with current data

The grave finder goes live with the current data set while the survey is planned.

### Phase 2 - drone survey

1. **High grid pass** - a stitched top-down map with an accurate position for every stone. Replaces the 2019 plan and fixes the 881 unplotted graves
2. **AI plans the low route** from that map, flying along the rows on the inscription side (most headstones face east)
3. **Low pass** - a close-up photo of every inscription plus a walk-through view, including graves off the paths
4. **AI reads the inscriptions** and matches them to the 2000 records, flagging anything that does not line up for checking by hand
5. Results update `graves.json`, which the site already reads

Notes:

- An RTK drone is probably not needed - the site plots graves on an image, not GPS, and a stitched drone map is accurate relative to itself. Phone GPS is only accurate to about 5m anyway
- Fly early morning or evening - low side-on light makes worn inscriptions readable
- Plan for several batteries (about 20-30 min each) and more than one session
- **Test on Section A (95 stones) first** before doing the whole churchyard

### Before spending any money

- **Phone test:** photograph 20 stones in Section A and check AI can read the inscriptions. This is the real risk, not the flying
- **Drone expert:** neither Tobi nor Will has flown before, so get expert advice first, including whether hiring a drone surveyor for a day is cheaper than buying
- **Funding:** ask the church to put part of its £1,000 website budget towards it, or self-fund

## Legal (UK CAA)

- **Operator ID:** a church volunteer (18+) holds it (£12.34 a year) until Will turns 18 on 2 December 2026, then Will takes over
- **Flyer IDs:** Tobi and Will - online CAA test, valid 5 years
- Get PCC permission before flying
- Insurance - the church will likely want liability cover for anyone flying over its land
- Fly when nobody is visiting graves
- A person must always be supervising and able to take control, even when the AI is flying

## Finishing the site

- Proper photo hosting (not GitHub), compressed so pages load fast on phones
- Smarter search: misspellings, dates, sections, and "walk me to this grave" on mobile
- A corrections form for families and the parish office
- Hosting, domain, PCC sign-off, and gallery photo credits

## Open decision

Is this just St Michael's, or a multi-church platform (free church sign-up, paid drone/photo service, add-ons like gravestone cleaning)? This decides how everything gets built.

## Next steps

1. Launch the grave finder with the current data
2. Phone test on 20 stones in Section A
3. Speak to a drone expert (including hire vs buy)
4. PCC: permission, funding and insurance
5. Flyer IDs for Tobi and Will, and a church volunteer for the Operator ID
6. Test flight on Section A
7. Decide: St Michael's only vs multi-church platform
