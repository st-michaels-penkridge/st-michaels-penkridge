# St Michael's Penkridge - Church Site & Grave Finder

## V1 revision preview

### Selected design

The active pairing is **Cormorant Garamond + Source Sans 3**, shared by all 14 public and members pages through `chosen-type.css`. Font comparison controls now appear only with `?design=1`; old `?type=...` links do not override the chosen pairing. The What's on page has a compact heading and puts its date cards before notices.

The active hero is the **4032 × 3024 original** of *Church of St. Michael and All Angels, Penkridge*, by [Ajay Tegala / Geograph, photo 6651755](https://www.geograph.org.uk/photo/6651755), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), retrieved from Wikimedia Commons. It replaces the low-resolution blossom preview; the image is cropped in CSS and credited in the footer.

### Second design pass

- On localhost, the bottom-right font comparison offers four full-page treatments. Direct links use `?type=classic`, `?type=literary`, `?type=warm` or `?type=modern`. Add `&design=1` to expose the comparison control on a hosted preview. The default stays classic.
- History and giving share the same background; the repeated giving photo and hard crimson boundary have been removed.
- The churchyard photograph has three subtle keyboard/touch-accessible SVG hotspots leading to a real Gravefindr name search. **These are an interaction study, not identified stones.** No names are attached: matching these photographed stones requires verified records and ground/photo references first. Gravefindr's public page provides burial records but no verified mapping from this photograph to burial IDs.
- Donation checkout remains blocked on the treasurer's provider and church-specific payment link. The generic parish finder was removed as a misleading checkout destination. Current links describe the actual visit/phone options. Once the verified payment link is supplied, connect the home-page button directly to that checkout.
- Blossom hero: Mike Searle, *St Michael & All Angels Church, Penkridge (2)*, 30 April 2015, [Geograph 4461800](https://www.geograph.org.uk/photo/4461800), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). Retrieved from Wikimedia Commons original image, displayed with a CSS crop. **Available source is only 640 × 447, not high resolution.** Geograph's reuse/download page could not be accessed due to a browser challenge; a higher-resolution photographer original remains outstanding. The image has not been AI-upscaled or reconstructed.

`codex/v1-revision` starts from `main-with-data-collection`. It revises the home page with a warm stone palette, integrated photographs and a public notice board. Home-specific styling is in `home-v1.css`.

The existing members Page editor manages notices for both Home (latest three) and What's on (latest five). Publish and date controls determine what appears. On localhost only, saved members-demo notices can be previewed on the public pages; these are made-up data. A configured Supabase project supplies real published notices. No connection means an honest placeholder, not sample announcements presented as real news.

AV remains the pilot for a wider church team system. Future teams may include readers, welcoming, refreshments and flowers; occasional jobs should be considered alongside regular rotas. This revision does not add those teams or change their permissions.

To try it: open the members demo, choose Alex (admin), sign in and enter any six numbers for the demo two-step check. Save a notice in Page editor, then open the home page notice board in the same browser. No real personal data should be entered in this preview.

Website for St Michael and All Angels, Penkridge, with a searchable churchyard grave finder. Built by Will King and Tobi Hussey.

## PRIORITY: members area, rotas and easy page updates

> **Note for AI coding agents working in this repo:** at the start of every session, tell Will about this section and check he has read it. It is the next big piece of work and needs his agreement before anything is built.

The aim is for the site to become a working tool for the church, not just a set of pages. There are three parts, all behind a sign-in for church members.

### 1. Sign-in for church members

- **Invite-only.** People are invited, or request access and an admin (for example Greg or the parish office) approves them. Nobody outside the church can sign themselves up
- **Sign in with a link sent by email**, so there are no passwords to forget
- **Three levels:** member (sees rotas and notices), rota lead (edits their own rota), admin (manages people, rotas and page content). Admins use two-step login
- A "Members area" link in the footer leads to it for now. Add it to the main menu when it goes live

### 2. Rotas and availability

- Rotas for AV, readers, coffee, flowers and welcomers
- Members see who is on when, mark the dates they are not available, request swaps, and get an email reminder the week before
- **Start with the AV rota as the pilot.** The AV team runs the service words on the screens (PowerPoint), so they are the obvious first users. Add the other rotas once it works

### 3. Easy page updates

- What's on, the seasons, Coming up dates and notices should come from a simple edit screen instead of being written into the HTML, so Greg or the office can change a date without touching code
- Two ways to do it: keep the content in the same database as the rotas and show it on the public pages, or use a Git-based editor (for example Pages CMS or Decap CMS) that edits a data file in this repo

### Backend

- **Supabase** for sign-in and the database (the free tier covers a church this size). Use the London or EU region, and row-level security so each person only sees what they should
- Build everything else ourselves: rota pages, swaps, availability, reminders and the page editor. **Do not build the login system from scratch** - homemade logins are where most security problems come from
- Email reminders: a scheduled Supabase function plus an email sending service
- The public site stays as static pages. The members area talks to Supabase from the browser

### Data protection (must be agreed before launch)

- The PCC is responsible for the data (the data controller) under UK GDPR
- Rotas and group contact lists can be held under "legitimate interests", so signed consent is not needed just to be on a rota. Consent is needed for extras like a members' directory or newsletters. Source: [Parish Resources GDPR guide for PCCs](https://www.parishresources.org.uk/wp-content/uploads/GDPR-Short-PCC-Guide.pdf), which also says PCCs should stay exempt from the ICO data protection fee
- Publish a privacy notice (Parish Resources has guides and templates)
- **Store the minimum:** name, email and optionally a phone number. No addresses, dates of birth, health details, anything about children (including Messy Church), or safeguarding information, which stays with the Parish Safeguarding Officer
- Remove people when they leave, and let people see or delete their own data
- **No real data goes in until the PCC has agreed**

### Order of work

1. Will and Tobi agree the plan
2. Build a clickable prototype with made-up names (sign-in, AV rota, swaps, the What's on editor) to show Greg and the PCC
3. PCC approval and a privacy notice
4. Set up Supabase and build the AV rota for real
5. Add the other rotas and the page editor

### Where the members area stands

Built on the `members-area` branch and tested against a local Supabase. Setup steps and details are in [`supabase/README.md`](supabase/README.md).

- **Done:** invite-only sign-in by email link or code, two-step sign-in for admins, the AV rota with swaps, away dates and daily reminder emails, rota lead tools, the page editor for Coming up, notices and the Messy Church, coffee morning and third Sunday details, the People page (invite, approve, remove, admins), download and delete your own data, and a draft privacy notice
- **Demo mode:** while `members/config.js` is empty the members area runs with made-up names in the browser. This is the clickable prototype for step 2
- **Waiting on:** PCC approval, the privacy notice finished, the Supabase project and email sending set up, and the real jobs on the AV rota

This could also be offered to other churches alongside Gravefindr (see Open decision below).

## Where it stands

- Pages: Home, Sundays, Find a grave, History, Visit, Life events (baptisms, weddings and funerals), What's on, Donate. Every menu item is its own page; the home page is a short tour that links into each one
- Members area in `members/` (see the PRIORITY section above)
- The redesign (crimson colours, Castoro and Josefin Sans fonts, full-width layout) is on the `crimson-colours` branch
- Grave finder: the Churchyard page embeds Gravefindr (https://gravefindr.co.uk/graveyards/st-michaels-penkridge), with a link out to the full site. The old built-in finder (`churchyard.js`, `graveyard/graves.json`, the map images and the legacy `graveyard/churchyard.html`) has been removed now that Gravefindr is the grave finder

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
- **Funding:** ask the church to put part of its £1,500 website budget towards it, or self-fund

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

## Website improvements

Ordered roughly by what matters most before the site goes live.

### 1. Get the real details in

The home page still has placeholder contact details (office@example.org and 01902 000 000). The address also needs checking: this site says Church Lane, ST19 5DJ, but A Church Near You lists Church Road, ST19 5AW. Service times need confirming too, as A Church Near You lists Holy Communion at 10:30 on the 1st, 2nd, 4th and 5th Sundays, which suggests the 3rd Sunday is different. Check all of this with Greg.

### 2. Finish the Donate page

The regular giving button currently goes to the general Parish Giving Scheme finder. Ask the treasurer for the parish's own Parish Giving link and swap it in (marked TODO in `donate.html`). The PCC also needs to decide whether to offer online one-off giving (for example a card or contactless link) and, if so, which provider.

### 3. Safeguarding page

Church of England parishes are expected to publish their safeguarding statement and contacts. A Church Near You already has the wording and the Parish Safeguarding Officer's details, so add a short Safeguarding page and link it from the footer of every page.

### 4. Make the Gravefindr embed seamless

At the moment the Churchyard page shows the whole Gravefindr page in a frame, including its own header. Because we run Gravefindr, we can add an embed view (no header, matching colours, and a frame that grows to fit its results instead of scrolling inside the page). The same approach then works for any other church that wants the finder on its own site.

Later, not yet: an email sign-up popup on the Gravefindr site, for families who want updates when records or photos are added.

### 5. Pick the colours

Done: crimson, black and white was chosen, and it is on the `crimson-colours` branch. Check it with Greg before merging.

### 6. Speed and tidying

The `images` folder is about 44MB, with several photos close to 1MB each. Compress them for the web so pages load quickly on phones. Done: the old built-in finder (`churchyard.js`, `graveyard/graves.json`, the map images and its styles) has been removed now that Gravefindr is the grave finder. Gallery photo credits still need adding before launch.

### 7. Content people look for

Done on `crimson-colours`: a real map on the Visit section and a Life events page for baptisms, weddings and funerals. Still to do: a news or notices area for the weekly notice sheet, which fits the page editor in the priority section above.

### 8. Launch

Host it (for example on Netlify, as with the other sites), point the church's domain at it, get PCC sign-off, and then update the "Our website" button on A Church Near You, which currently goes to the parish Facebook page.

## Open decision

Is this just St Michael's, or a multi-church platform (free church sign-up, paid drone/photo service, add-ons like gravestone cleaning, and the members area with rotas)? This decides how everything gets built.

## Next steps

1. Launch the grave finder with the current data
2. Phone test on 20 stones in Section A
3. Speak to a drone expert (including hire vs buy)
4. PCC: permission, funding and insurance
5. Flyer IDs for Tobi and Will, and a church volunteer for the Operator ID
6. Test flight on Section A
7. Decide: St Michael's only vs multi-church platform
