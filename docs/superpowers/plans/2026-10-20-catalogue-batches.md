# Catalogue batches implementation plan

> Implement inline using executing-plans; verify in the running browser.

**Goal:** Show 24 matching offers initially and append up to 24 per click.

**Architecture:** Keep the existing full-catalogue filtering and sorting, then slice the resulting list. Store browsing settings in the URL and the last catalogue position in session storage for returning from details.

**Tech stack:** Existing Next.js App Router, React, TypeScript.

**Spec:** User approval in this chat: “load 24 then have a button to load more”, following the agreed filter reset and browsing restoration behaviour.

## Constraints

- Preserve separate seller offers and existing colour deduplication.
- Reset batches when search, category, seller, sorting, location or demo time changes.
- Polling and basket updates must not reset batches.
- Use the already loaded demo catalogue: no fake loading delay or additional requests.
- Do not modify saved orders or locations.

## Tasks

- [x] Add validated URL settings and a browsing hook. Check malformed counts, query round-trip, and defaults.
- [x] Connect catalogue controls, slice after sorting, add count and accessible load-more control. Restore keyboard focus to the first newly revealed offer.
- [x] Preserve filters, batch size and scroll when returning from details or refreshing.
- [x] Run tests/build and browser checks: 24→48→all, global sorting, filter reset, no matches, seller selection, details/Back and refresh.
- [x] Review the change and leave the app running.

## Review focus

Malformed URL parameters; changing location/time after loading; background polling; returning after a product route remount; keyboard access to appended offers.

## Verification and review

- URL regression checks failed before the new module existed, then passed; full suite: 23 tests.
- Browser: 24→48→62, final button removed; Cheapest resets to 24 and finds the global 6 lei offer; category/seller/search resets and empty results verified.
- Browser: details return, native Back and refresh restored 48 offers, Cheapest and the saved position.
- Browser: time 19:30→21:30 resets 48→24 with the new total; original 19:30 time restored.
- Independent review identified an invisible invalid-seller filter and retained `#discover` preventing scroll restoration. Both were reproduced in the browser, fixed, and verified against the same steps.
- Existing state refreshes do not change the browsing settings. No saved orders were modified.
