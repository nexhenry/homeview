# Changelog

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
