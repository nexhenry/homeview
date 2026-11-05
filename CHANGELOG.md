# Changelog

## 0.6.0 — 2026-11-04

- **Tile sizes like a hand-made HomeView on every device:** Home is one screen — weather 2×2,
  air quality 2×1, two doors 1×1 (front lock, garage), camera 2×1, *Lights* for the two main
  rooms, clock 1×1, next event 2×1 — and the same tiles two across on a phone. Automatic
  favourites put doors first (the alarm and thermostat have pills); `home.max_favorites`,
  `home.max_light_rooms`. Member pages: next event 3×1. Edit mode sizes: 1×1 → 2×1 → 3×1 → 2×2.
- **The camera moved to Home;** Widgets always shows the photo slideshow (`widgets.camera`
  puts a camera there instead).
- **Sample photos** for the slideshow until you have a photo folder (or with
  `slideshow: samples`): twelve Unsplash photos via Lorem Picsum.
- **Control chips** under the Home title, like a hand-made HomeView: alarm, garage / gate,
  locks and the water shutoff valve (automatic) or your own (`home.chips`, any switch, input
  boolean or automation with `icon_on` / `icon_off`, `name`, `confirm`, `off_warn`). Icon only
  until something needs attention (red with a word), pulsing while moving / arming; tap acts,
  hold = details. The alarm pill is left out when the alarm has a chip.
- **Always opens full screen:** the Menu chip no longer remembers its choice per device — it
  shows HA's sidebar and header until the page is reloaded (a device left on "Menu" by 0.3–0.5
  goes back to full screen). The chip is a small round icon, no text.
- **Sample avatars** for people without a picture (DiceBear "Lorelei", CC0): on person tiles,
  under the Home title and in the page bar for each member's room. The seed is a hash of the
  entity id (no names are sent); `avatars: initials` for letters instead.

## 0.5.0 — 2026-11-04

- **Living** (was *Family*): the living spaces everyone shares, each room with its main
  devices — like a hand-made "family" page. Bedrooms, bathrooms, outdoor areas and family
  members' rooms are left out; living room, kitchen and dining come first. `living_rooms`
  picks them by hand (also in the settings editor). `family` / `pages_config.family` in an
  existing config still work and mean Living.
- **Rooms** now means one page per family member's room (Ben, Lucy, Hana …), as on a
  hand-made dashboard. Default order: Widgets · Home · Living · Rooms · Energy · Cameras.
  `members` in `pages` still works and means `rooms`.
- **All rooms**: the directory of every room (by floor), optional (`all_rooms`); `rooms`
  falls back to it in a home without member rooms.
- The old people + calendar page is still there as an optional **People** page.
- **Photo slideshow** on Widgets (in the camera's place): a Home Assistant media folder,
  albums included, shuffled, cross-fading, portrait photos over a blurred fill, tap for the
  next one. Found automatically (a folder named Photos / Pictures / Slideshow …) or set with
  `widgets.slideshow`; `slideshow_interval`, `slideshow_thumbnail` (NAS thumbnails) and
  `widgets.camera`, also in the settings editor.
- **Widgets fits one screen** on tablets and desktops: the board fills the space below the
  page bar with three equal rows (no more cut-off agenda / forecast); the weather switches
  to a compact high / low when its cell is short, and the agenda fades out instead of being
  cut mid-line.
- **Tile grid like a hand-made HomeView:** phones 2 square tiles across (14 px padding, 10 px
  gap); tablets and browsers 5 across (Home, member rooms, your pages) or 6 (Living, all rooms,
  room pages, energy, cameras), 2.5 vw padding, 16 px gap; square tiles, or 1.28 : 1 / 1.1 : 1 on
  screens wider than 3:2 (Pixel Tablet, laptops) so a page fits the screen; more columns on
  very wide screens (tiles ≤ ~300 px). `tile_size` / `max_columns` still override.
- Home's "Lights" no longer count rooms like "Garden" as main rooms.

## 0.4.0 — 2026-11-04

A redesign, closer to a hand-made dashboard:

- **New page order:** Widgets → Home → Family → Rooms → one page per family member →
  Cameras → Energy, wrapping back to Widgets.
- **Family member pages:** for each person with a room named after them (or set in
  `members`): a hero with the room's temperature, comfort, humidity, doors and windows; the
  room's devices; their next event (a calendar with their name); where they are. Member
  initials in the page bar.
- **Widgets** is one tinted board: big date, big clock, forecast, agenda, camera.
- **Home:** air quality tile (AQI / PM2.5 / CO₂ / VOC), a camera, *Lights* tiles for the main
  rooms (tap = all on / off, hold = the room); rooms moved to the Rooms page
  (`home.rooms: true` brings them back); scenes as compact tiles.
- **Room pages:** 24-hour charts for temperature, humidity and light level; everything else
  as compact one-line tiles.
- **Energy:** live flow diagram (solar, grid, battery, home) with animated flows; today's
  numbers in one card; devices as a compact list.
- **Cameras:** a clean 16:9 grid. Pill sheets use compact tiles.
- Rooms with nothing to control (only a plug's sensors) are left out.
- Fixes: weather high / low late in the day; full screen survives an iPad turning (HA
  rebuilds its sidebar at its phone / tablet breakpoint); no sideways scrolling on phones;
  people who never reported a location are left out.

### Also in 0.4.0 (the unreleased 0.3.1)

- **"Finish the update" banner:** after updating in HACS, a screen that still runs the old
  HomeView from the browser cache (Home Assistant caches `/hacsfiles/` for a month, and YAML
  resources keep the same URL) shows a banner to admins; tap it to re-download HomeView and
  reload.

## 0.3.0 — 2026-11-04

- **Full screen by default (kiosk mode):** Home Assistant's header and sidebar are hidden while
  HomeView is open and come back when you leave it. HomeView's own top bar switches pages.
- **Menu / Full screen chip** in the top bar brings the sidebar and header back (or hides
  them) on this device; `?kiosk=off|on` in the URL does the same. Options: `kiosk: false`,
  `kiosk_chip: false`, both also in the settings editor.

## 0.2.1 — 2026-11-04

- **Update notice:** when HACS has a newer HomeView, admins see a banner at the top of the
  dashboard; tap it for the release notes and the Update button. Turn it off with
  `update_notice: false` (or in the settings editor).

## 0.2.0 — 2026-11-04

Make it yours — three ways that edit the same settings:

- **Edit mode on the dashboard** (admins): the pencil next to the page title. Per tile: put
  on Home (★), resize (1×1 → 2×1 → 2×2), rename, hide; rooms: colour, hide. Hidden things
  wait faded at the bottom of the page to be brought back. Saved straight away.
- **Settings editor**: a visual editor in HA's own *Edit dashboard* dialog and behind
  Settings in edit mode — pages, theme, Home, people / calendars / weather / cameras, rooms
  (order, hide, each room's name, icon, colour, first entities, sensors), hiding, pills,
  energy sensors, layout. A YAML button shows the config.
- **YAML**: `customize` (per-entity name, icon, size, tap, hidden); your own sections on any
  page (`pages_config.<page>.sections`, `rooms.<area>.sections`, `position: top`); your own
  pages (`custom_pages`); tiles can be entities, rooms, HomeView widgets or **any Lovelace
  card**; sizes as `2x1`.
- YAML-mode dashboards: the pencil and editor show the YAML to paste instead of failing.
- Admins see a note for unknown options (typos).
- Fixes: weather high / low with providers that only have twice-daily or hourly forecasts
  (e.g. NWS); idle speakers no longer look "on"; only people with a tracker on Family;
  energy devices sorted by today's use; taps on icons inside buttons.
- Docs: credits, disclaimer, issue forms; new issues are acknowledged and assigned
  automatically.

## 0.1.0

First preview.

- Dashboard strategy `custom:homeview`: Home, Widgets, Family, Rooms, a page per room, Energy
  and Cameras, generated from areas, floors, devices and entities.
- Self-contained tiles (no other custom cards needed): entities by domain, rooms, weather,
  forecast, analog clock, date, next event, agenda, people, cameras, energy now / today /
  devices.
- Status pills with sheets: alarm, climate, lights, locks, doors & windows, leaks / smoke / gas,
  batteries, now playing.
- Responsive grid (2–8 columns), light / dark, per-page and per-room tints, swipe between
  pages, tap / hold with pointer events (works on iOS).
