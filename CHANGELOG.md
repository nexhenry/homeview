# Changelog

## Unreleased

- **Edit the warnings in edit mode.** While editing, the Warnings pill always shows on Home ("Warnings ·
  4", or "+ Warnings" when there are none). Tap it (without dragging) for the list: each warning's
  level (Critical / Notice) and a remove button, and **+ Add** to make one from any entity. A
  switch or plug warns when it isn't on, with its power reading in the pop-up; a leak, smoke or
  problem sensor warns when it's on. Saved like every other edit.

## 0.8.17 — 2026-11-07

- **Energy History: the 10 biggest devices, and "More (41)".** The devices chart shows the top 10
  (`max_devices: 10`), so its pie view fits its card instead of keeping the height of ~40 bars. The
  button says how many devices you track ("More (41)") and lists them all as bars; "Top 10" goes
  back. The chart's own "More (4)" legend chip is hidden, so there's one way to see more. New
  card-tile options: `more:` (a button that switches a card to other settings), `{energy_devices}`
  in its labels, and `legend_more: false` (custom_pages/README.md).
- **Fix: a thermostat tile looked "working" while the HVAC was off.** The tile lit up whenever a
  mode was set (Heat/Cool), even while idle. It now lights up only while the system is actually
  heating, cooling, drying or running the fan (`hvac_action`), as the climate pill already did.
  Thermostats that don't report it behave as before.
- **Fix: the Widgets page's "Up next" said "Nothing planned" while Home's Next tile showed an
  event.** The Widgets agenda looked one week ahead, Home's Next tile two. Both now look two weeks
  ahead. An empty agenda now says how far it looked ("Nothing in the next 2 weeks").
- **A Warnings pill.** List the conditions that need attention under `warnings:` (a fridge plug
  switched off or offline, a valve shut …), with the same rules as a page's alerts: `not_on`, `on`,
  `off`, `all_off`. While any of them is true, a Warnings pill shows first on Home: red for a
  critical warning, amber for notices, with the warning itself or "2 warnings" as its text. Tap it
  for a pop-up with each warning's entities, to switch or open them straight away. No warnings, no
  pill. `pills:` can place it (`warnings`); otherwise it comes first.

## 0.8.16 — 2026-11-07

- **Pill pop-ups open at the top.** Locks, Lights, Doors & Windows and the other pill sheets now
  sit at the top of the screen on tablets and phones, near the pill that opened them. A short list
  (two locks) no longer floats mid-screen or sits at the bottom. Other sheets (edit mode, Settings)
  are unchanged.

## 0.8.15 — 2026-11-07

- **A font of your own.** `font: geist` (the whole dashboard) or `widgets: { font: geist }` (the
  Widgets page only) makes every screen use the same font, not each device's system font (SF Pro
  on Apple, Roboto on Android). Built in: `geist`, whose numbers are the closest free match for
  SF Pro's, and `inter`. The fonts are served from your Home Assistant (`/config/www/fonts/…`), so
  nothing comes from the internet. Any font: `font: { family, url, weight }`. The clock keeps the
  system font. README → Fonts.

## 0.8.14 — 2026-11-07

- **Widgets page: the weather is centred.** The location, temperature, condition and high / low
  were aligned left in their corner; now they're centred like the date. The ° no longer pulls the
  temperature off centre.
- **Fix: a hidden tile showed up anyway.** Hiding a tile (edit mode → eye, or
  `exclude_entities`) removed it only from what HomeView finds by itself. Tiles listed by name still
  showed it: a room's `entities:` list (person pages, Living, room pages), Home favourites, and
  custom pages. A hidden entity is now gone from every page; in edit mode it stays, faded, with
  the eye to show it again.
- **`from: <dashboard>`: a dashboard that mirrors another.** It shows that dashboard's settings,
  pages and on-screen edits, read each time it loads. Its own changes are kept in its config as
  `edits:` and never touch the original. Use it for a test copy or a kiosk.
- **`scripts/dev-build.sh`** makes a development copy (`custom:homeview-dev`, its own element
  names) that runs next to the HACS release. Point a test dashboard at your real one with
  `from:` to try changes on your own settings and pages.

## 0.8.13 — 2026-11-07

- **Control pages.** Custom pages can now be laid out like a hand-made control panel:
  - Sections: `layout: pills` (small pills in a row), `layout: keypad` with `columns:` (an icon
    grid, e.g. a TV remote; `.` = an empty key), `layout: faders`, `width: half` (two sections side
    by side on tablets), and `icon:` before the title.
  - `type: button`: runs a script or service (`action`, `data`, `target`), or toggles `toggle`.
    It's lit in `color` while `watch` is `when` (or its `attribute`). Also `dim`, `name_off` /
    `icon_off`, `confirm` and `hold`.
  - `type: fader`: slide to set an `input_number` / `number`; tap its icon to mute (`mute:`).
  - Entity tiles: `power:` shows "On · 0.72 kW"; `confirm: true` asks before switching; `unit: kW`
    in pill rows.
  - Page options: `columns:`, `show_room: false` (tiles show their state, not their room), and
    `alerts:`, warnings at the top of the page (critical red and pulsing, notice amber).
- **A page's pill warns.** A custom page's pill on Home turns red for a critical alert and amber
  for a notice, as the other pills do. `unit: kW` shows a power sensor in kW; `name: ''` shows only
  the icon and the value.
- **A sensor that isn't reporting** shows its name and "—", not "Unavailable" as its name.
- The sample `pond.yaml` and `media.yaml` use all of this.

## 0.8.12 — 2026-11-07

- **Edit a room's tiles.** In edit mode, Living, a person's page and a room's page get a dashed
  **+ Add** tile: search the devices and entities and add one to that room. Every tile gains
  **Change the icon** (HA's icon picker) and, in a room, **Remove from this room**. Both save the
  room's `rooms.<area>.entities` list.
- **A person's page follows the room's list.** It used to show the room's first seven devices, lights
  first, so a TV whose area came from its device could be left out. With `rooms.<area>.entities`
  set, the page shows that list.
- **Sizes in a room's lists.** A size set in edit mode was saved but ignored in a room page's device
  lists. It now spans the list's columns, and a tile two rows tall shows as a full tile.
- **List rows: one ⋯ button.** The six edit buttons covered a list row's name. A row now has one
  ⋯ that opens its actions in a sheet, each with its name.
- **Filtered calendars.** `agenda` and `next_event` take `match:` (only events whose title matches;
  text or a regex, case-insensitive), `all_day: true` and `strip:` (text removed from titles).
  `join_weekends: true` stretches a day off over the weekend right before or after it, and joins
  breaks that then touch (a Monday off: Sat–Mon; a Mon–Fri break: Sat–Sun, 9 days, "5 school
  days"). `next_event` also takes `days`, `title` and `icon`. `agenda` takes `layout: list`: one row per
  event with its dates and length, and the one under way marked "Now". New sample page:
  `custom_pages/days-off.yaml`, a popup with every school day off, opened by any tile's
  `tap: days-off`.
- **`size: … x auto` on HomeView widgets.** It used to measure only Lovelace cards; an agenda list
  now gets the rows it needs.
- **Move pills and chips.** In edit mode, drag a status pill or a chip to a new place (mouse or
  touch). Saved as `pills:` / `home.chips:`. `pills:` takes `{ page_pill: <path> }` to place a
  custom page's pill.
- **Rename a page.** In edit mode, ✎ next to the title: a room's page renames the room; any other
  page sets `pages_config.<page>.title`, the title and its page-bar name. Person and custom pages
  are keyed by their path (`member-zoe`, `pond`).

## 0.8.11 — 2026-11-06

- **Edit a YAML dashboard on screen.** A dashboard in YAML mode (e.g. for page files in
  `custom_pages/`) used to answer every edit with "paste this YAML". Now edit mode and Settings save
  to a hidden companion UI dashboard, `<dashboard>-edits`, made on the first save (out of the
  sidebar, admin-only to change). HomeView lays it over the YAML on every screen.
  - Only the differences are kept, per entity, room or setting, so the rest of the YAML stays in
    charge. Custom pages always come from the files.
  - `ui_edits: false` brings back the YAML sheet.

## 0.8.10 — 2026-11-06

- **Edit mode is one state for the whole dashboard.** Start it on one page and every page is in
  edit mode, with the edit bar. Widgets has the bar too. Tap Done anywhere and it ends everywhere.
- **"On" is amber/orange on every page:** switches, fans and other devices that are on use the
  shared "on" colour instead of the page's tint.
- **`icon_on` / `icon_off`** for tiles on your own pages and in `customize`, e.g. a valve that shows
  open or closed.
- **Water valves:** a switch named like a shut-off (`…shut…`) means on = water off. Any other water
  valve switch (e.g. a template "Water Valve" over a normally-open shut-off) means on = water
  flowing.
- **Home Assistant's cards on your pages** (glance, tile, button …) use HomeView's icon and text
  colours, font and header size.
- **The ✕ on a page opened from a pill or a hold floats** top right, so you don't have to scroll
  up to close it.
- **No person tile on person pages:** the room summary at the top already says who's home.
- Developer: `scripts/check.sh` also checks the file as an ES module (how browsers load it).
- **Tiles fit the screen on every tablet and browser.**
  - **Columns:** the page's own count, kept between 110 and 300 px wide.
  - **Rows:** sized so 4 rows fit on one screen, each tile between square and 1.35 : 1. Before, the
    shapes were fixed per screen shape, so a landscape iPad showed about 3.6 rows and a Pixel Tablet
    3.4. Portrait screens keep square tiles.
  - **New option** `rows_on_screen`.
  - **Phones and the Energy page** are unchanged.
- **Widgets fills the screen, edge to edge**, in a hand-made HomeView's proportions: the date
  top-left (a big numeral, sunrise / sunset), the clock filling its area, the photo, Up next and the
  weather (a large temperature) sized to their space. The sizes scale with the screen. On a portrait
  tablet the board is two columns: date and clock, the photo across, then Up next and the weather.
- **Home: the clock and the next event come before Scenes**, in the row with the Lights tiles
  (which they fill on tablets). Before, they were at the bottom of the page.
- **Home: the pills stay right of the weather tile.** On tablets and in a browser they use only
  the width above the tiles beside the weather (air quality, doors), in more lines if needed,
  instead of reaching over the weather tile.

## 0.8.9 — 2026-11-05

- **No pencil button:** double-tap a page's title to start edit mode (admins), for a cleaner
  header. Holding the title still opens its `hold:` page. `edit_button: false` turns the double tap
  off.
- **Status pills on Home only, top right:** they're no longer on Living or Rooms. On tablets and
  in a browser they sit beside the title (in several lines if needed) instead of under the chips;
  on phones they stay under the chips.
- **A page's own pill:** a custom page with `pill: { entity, name, icon, alert }` (or
  `pill: true`) adds its pill to Home for everyone who gets the page. Tap opens the page; hold
  shows the entity's details. The Pond template now uses it, so `dashboard.yaml` needs no Pond entry.
- **Energy as a popup page:** `pages_config.energy.popup: true` (any built-in page) takes it out of
  the page bar and the swipe order. The Energy pill opens it, and a ✕ top right goes back. Custom
  pages with `subview: true` (opened by a hold) also get the ✕ now, instead of a back arrow.
- **Energy fits every screen:** its rows stay between 176 and 210 px on tablets and in a
  browser. On a portrait iPad the flow, Right now and Today tiles were clipped, and on wide screens
  they were stretched. The off-grid tiles use their compact look only when they're narrow (two to a
  row on a phone), and the outage header gets two rows when its text wraps.
- **Widgets fills the screen:** a thin edge instead of the page padding, and no empty header above
  the board.
- **Comfort colours on a person's page** match the room tiles (Warm in amber, not cyan).
- **Reload pages** is in edit mode on every dashboard (admins). On a UI dashboard it re-reads the
  saved config, so other open screens pick up a raw-editor change.
- **`phone_size`** for tiles and cards on your own pages: their size on phones (2 columns, rows of
  64 px), e.g. `phone_size: 2x5`. Before, a card always got three phone rows per tablet row.
- **A card taller than its tile** now starts at its top and scrolls. Before, it was centred, so
  its first lines were cut off.
- **`admin_only` follows `access`:** an admin-only page is for viewers who see every page: admins
  without an `access` list, and logins with `access: all`. An admin limited by `access` (a child
  with an admin login) no longer gets it.

- **One size for the round buttons on Home:** the Menu / Full screen, update, back and pencil
  buttons by the title and the control chips under it are all 40 px, with 22 px icons. Before,
  they were 36, 32 and 38 px with 18–22 px icons. The icons are now centred in their circles,
  instead of sitting a little low on the text baseline.

## 0.8.8 — 2026-11-05

- **Page files, ready to share:** a new [`custom_pages/`](custom_pages/README.md) folder in the
  repo has a fully explained `sample.yaml`, four ready-made pages and a `dashboard.yaml` that
  loads them. The pages are *Media*, *Energy History*, *Pond* and *Admin*. Keep yours in
  `/config/homeview/custom_pages/`, one file per page, with
  `custom_pages: !include_dir_list custom_pages` in a YAML dashboard. The guide covers the setup.
- **`vars:` in a custom page:** the entities a page uses go in a block at the top, and `$name`
  anywhere below is replaced by them. A shared page then works after you change only that block.
  Admins see a note naming any entity a custom page uses that Home Assistant doesn't have.
- **Reload pages:** in edit mode on a YAML dashboard, this button makes Home Assistant read the
  dashboard's files again. Its own ⋮ → Refresh is hidden in full screen. A new or edited page file
  shows up on every screen, with no restart.
- **Hold to open a page:** `hold:` (or `tap:`) can name a page. It works on a tile, on every tile
  of an entity (`customize.<entity>.hold`), on a pill and on a page's title
  (`pages_config.<page>.hold`). Examples: hold the TV tile → Media, hold the Home title → Admin.
- **Pages off the page bar:** a custom page with `subview: true` is opened only by such a hold,
  and has a back arrow. `admin_only: true` limits a page to admins.
- **Energy pill:** a new status pill shows your home's live power, and what goes to the grid when
  you export. Tap it for the Energy page. It's on by default when HomeView finds power sensors.
- **Pills of your own:** `pills:` items can be `{ entity, name, icon, alert: [states], hold }`,
  such as a pond's water temperature that opens the Pond page. Built-in pills take a `hold:`
  through `{ pill: energy, hold: energy-history }`.
- **One colour code everywhere**, as on a hand-made HomeView. Green means secured or fine
  (locked, closed, water on, all clear). Amber means needs a look: offline, arming, moving, getting
  low, heating. Filled red means act now (unlocked, open, leak, water off, triggered), and a red
  icon means the alarm is armed. Orange means on or in use, and blue means climate.
  - Control chips, status pills, entity tiles and their sheets now all follow it. Before, a locked
    door and a closed garage were grey, an offline lock or sensor looked fine, and an armed alarm
    was orange.
  - Pills show **"N offline"** in amber for locks, doors & windows and leak sensors that aren't
    reporting.
  - Chips take `color: security | light | climate` for a switch while it's on.
  - README → *Colours*.
- **Comfort in five grades**, the same words and colours on every room tile, room page and
  person page:
  - Temperature: *Too cold · Cold · Comfy · Warm · Hot*. *Hot* is new, above 83 °F / 28 °C.
  - Humidity: *Too dry · Dry · Comfy · Humid · Too humid*, below 30 / 40 % and above 55 / 65 %.
    Before, it was only Dry below 30 % and Humid above 55 %. A room says *Comfy* only when its
    temperature and humidity both are. Otherwise it shows only what's off: "Warm", "Dry",
    "Warm · Dry".
  - The new `comfort_limits` option sets the outer grades. `comfort` and `comfort_margin` also
    accept entities, so a home that keeps these as `input_number` helpers can point HomeView at
    them.
- **`size: full` / `half`** (with an optional height, `full x 3`) for tiles and cards on your own
  pages: the page's width, or half of it.

## 0.8.7 — 2026-11-05

- **Menu mode without the duplicate header:** leaving full screen now shows Home Assistant's
  sidebar and HomeView's own page bar, but not HA's header, whose page tabs repeated the page bar.
  On phones and iPads, where HA keeps its sidebar in a drawer behind that header's ☰, the page bar
  gets a sidebar button. `kiosk: false` still gives HA's normal header.
- **Settings shows what HomeView uses:** fields that were blank because HomeView picks them by
  itself now show its current pick — title, people, calendars, weather, cameras, status pills,
  Home favourites and chips, room order, the Living rooms, each room's icon and sensors, the photo
  folder and the energy sensors. Leave a field as it is (or clear it) and it stays automatic: only
  what you change is saved (Save with no change leaves the config exactly as it was).
- **Battery list by urgency:** the Batteries pill's list is grouped: Low (below your threshold, in
  red), Offline (faded), Getting low (below twice the threshold, amber), OK.
- **Colour for a person's page:** in edit mode the room summary on a person's page has the 🎨
  button too (as room tiles do). It sets that room's colour, which tints the person's page.
- **Editing keeps your place:** changing a tile's size, colour, name or favourite (and turning
  edit mode on or off) no longer jumps back to the top of the page.
- **Hide is a toggle, in place:** while editing, a hidden tile or room stays where it is, faded,
  with an eye to show it again. Only when you tap **Done** does it leave the page. Hiding a Home
  favourite keeps it in the favourites, so showing it again puts it back where it was. (The
  "Hidden" list at the bottom of some pages is gone; hidden things were lost on the others.)
- **Menu and update icons on the Home page only**, so every other page stays clean. Swipe to Home
  to leave full screen.

## 0.8.6 — 2026-11-05

- **Fixed "Page isn't responding"** (seen on the Energy page, after a minute or two). Every time
  a tile drew, it registered one more "refresh me" callback with the data it waits for; when that
  data arrived, each callback redrew the tile, which registered more callbacks on the other data,
  so redraws multiplied until the browser froze. Each tile and page now hands over one callback,
  the same every time, and a tile redraws at most once per frame however often it's asked.
  Tested: the Energy page ran 7 minutes without a freeze (0.8.5 froze after about 99 s).
- Full screen re-applies itself quietly when Home Assistant rebuilds its sidebar (no resize
  event, at most 5 times a second).
- **Screensaver on a portrait screen:** the clock was drawn for landscape and cropped at the
  sides on a portrait iPad (the 9 and 3 cut off, the weekday missing). It now fits either way up.

## 0.8.5 — 2026-11-05

- **Menu and update icons in front of the page title** (top right on Widgets, which has no
  title). The update banner is now a small icon for admins: ⬆ a new release (tap: what's new
  and Update, through HACS), ↻ HACS installed a newer HomeView than this screen runs (tap:
  Reload now).
- **Screensaver:** a big analog clock fills the screen after 2 minutes without a touch, on wall
  tablets and iPads. Built in, with no plugin. Any touch closes it without pressing what's
  underneath. Not on phones or desktops (`screensaver: auto`), not on Cameras or while editing.
  `screensaver: false` / `true` / `{ idle: 120, color: '#4D7DB8', pages: [...] }`.
- **A switch's status LED is not a room light:** lights named LED / indicator / status / ring
  on a device that also has a real load (a switch, another light, a speaker …) are shown under
  Devices instead. They no longer make a room's Lights tile, its on-count or the lights pill read
  "on" while every lamp is off.
- **Menu opens the sidebar in one tap** on phones and iPads, where Home Assistant keeps its
  sidebar in a drawer behind its own ☰: Settings, your integrations' panels and the profile are
  one tap away from full screen.
- **Comfort follows your thermostat:** *Cold* / *Comfy* / *Warm* now use what the room's
  thermostat (or the house's) is set to right now, ± 1 °F (0.5 °C). Heat-cool: heat − 1 …
  cool + 1; heat or cool only: that setting on one side and the fixed band on the other; off or
  no thermostat: the fixed 66–77 °F (19–25 °C). A schedule that sets a cooler night reads *Comfy*
  at night instead of *Cold*. New options: `comfort` (`thermostat` | `fixed` | `{cold, warm}`),
  `comfort_thermostat`, `comfort_margin`.
- **Comfort words on every room tile:** tablets and desktops now show *Comfy* / *Cold* / *Warm*
  (and *Humid* / *Dry*) under a room's temperature on Living and the room directory, coloured.
  Before, only phones' room bars and a person's room summary had them. All three use the same
  rule now (Dry under 30 %, Humid over 55 %; temperature: see below).

## 0.8.4 — 2026-11-05

- **Room details page:** hold a room's tile, its bar on phones or its title to open it. New
  at the top: *Right now* (temperature, comfort, humidity, the room's doors and locks), then
  quick tiles — all its lights on / off, presence, and the room's power now (its power
  sensors added up, one per device) — and the 24-hour charts, shorter on phones. Holding a
  room used to open its temperature; that's the chart on the page now.
- **Home:** Scenes sit above the clock and the next event.
- **README:** page names and order brought up to date (Widgets, Home, Living, Rooms …), and a
  *A real home, fine-tuned* gallery: seven screenshots of the hand-made dashboard HomeView is
  modelled on, including its admin page (cameras and calendar blurred, names changed).
- **Tap a room = its lights:** a room's tile, phone bar or title toggles its "all lights"
  entity — a light group, or a light named as all of them ("Bedroom Bulbs", "Main
  Lights") — else its main light (main, ceiling / overhead, or named after the room, "Porch
  Light"), else its only light. A room of separate fixtures (two floodlights) opens its page.
  Hold opens the room's details page. The same on every room tile: Living, the Rooms
  directory, a person's room bar (phones) and room summary (tablets), section titles. A
  person's room on the Rooms directory no longer opens their page on tap; the "Lights" tile
  (Home, a room's page) still switches all of the room's lights.

## 0.8.3 — 2026-11-05

- **Accurate power flow:** the live power sensors were guessed by name and the first match
  won, so with both net and split sensors (`grid_power` + `grid_import_power` /
  `grid_export_power`) the flow and *Right now* could show the export side (0 W) as the grid
  and battery *charging* as *discharging*. HomeView now prefers a net sensor on the energy
  meter's own device, never takes an average or statistic (`…_24h_mean`), and uses a split
  pair only when there's no net sensor (as `consumption` / `production` in Power Flow Card
  Plus). The live kWh estimate between meter readings uses the same sensors.
- **Home battery %:** taken from the battery meter's device or a sensor named like it
  (`sensor.tesla_energy_…`), no longer any gadget's `…_battery_level`.
- New energy options for split sensors: `grid_import_power`, `grid_export_power`,
  `battery_discharge_power`, `battery_charge_power`.
- Docs and examples use made-up family names.
- **Tighter energy tiles on phones:** *Right now* is a row shorter, its cells fit their content
  and "Charging 5.3 kW" wraps instead of being cut off; the time windows (*Peak* /
  *Partial-peak off-grid*) sit two to a row in compact tiles (an odd last one full width).

## 0.8.2 — 2026-11-05

- **Swiping no longer skips pages** when the HACS *swipe-navigation* plugin is installed: it
  acts on every dashboard, so one swipe moved two pages (its and HomeView's). HomeView's
  dashboard now turns it off while HomeView swipes itself (`swipe: false` hands swiping
  back to the plugin).
- **Pages per person:** admins see every page; everyone else the shared pages plus only their
  own person page (the person linked to their login). `access: { <person or login>: all |
  [pages] }` sets it per person — `rooms` = their own person page, `all_members` = every one.
  The dashboard is built per viewer, so hidden pages aren't in their page bar or swipe order.
- **Member pages in your order:** `members: [person.mia, person.alex, person.zoe]` (a plain
  list; rooms are still found from the area names).
- **Power Flow Card Plus** draws the Energy page's flow when it's installed (HACS): grid,
  solar, battery with its level and home (the home sensor's own value) — the flow stops at the
  house. `energy.flow_card: homeview` keeps HomeView's own diagram; `energy.flow_devices: N`
  adds the N devices using the most power as their own circles (default none);
  `energy.flow_card_options` is passed to the card.

## 0.8.1 — 2026-11-05

**Live energy numbers.** Energy meters only report every few minutes (polled integrations,
Zigbee reporting), so totals built from them jumped in steps:

- Today's totals, device kWh, Home used and self-sufficiency now move every minute: the
  recorder's change since midnight (re-read every minute) + what the meter has counted since,
  + an estimate between meter readings from its power sensor (grid import / export, solar,
  battery discharge / charge, each device's own power sensor), capped at 15 minutes and
  replaced by the real number at the next reading. Wh / MWh meters are converted.
- Peak-hour windows and solar self-sufficiency include the hour that's still running (from
  the 5-minute statistics), updated every minute.
- **Live** indicator in *Right now* with the time of the latest reading; *no new reading for
  N min* (amber) when the power sensors stop updating.
- The outage list re-sorts only when the order changes (no page rebuild every minute).

## 0.8.0 — 2026-11-04

The Energy page gets the features of a hand-made energy dashboard, from generic entities:

- **Right now** beside the flow: solar (producing / not), home (with **A at V** when the
  home power sensor's device has current / voltage sensors), grid (importing / exporting),
  battery (charging / discharging).
- **Backup time** on battery: energy left (an energy-storage sensor, or the capacity × level)
  at the 24 h average load and at the load now.
- **Time windows** (`energy.windows`): the share of house use *not* from the grid in your
  peak hours, partial-peak … — several spans, each with its own days.
- **Solar self-sufficiency:** house use that came straight from solar, hour by hour.
- **Power outage list:** every Energy-settings device with W · A · kWh today and an On / Off
  button, top 10 with *Show all*; admins tick devices to turn off in an outage (HA label
  "Outage: turn off"); *Turn off ticked* / *Turn back on*; grid status shown. New
  **blueprint** `blueprints/homeview_outage.yaml` does it automatically when the grid goes down
  and comes back.

## 0.7.0 — 2026-11-04

**Phones get the layout of a hand-made iPhone HomeView** (tablets and browsers unchanged):

- Big title; *Hi <name>* on Living and each person's page, with a **favourites strip** (six,
  three per row: `phone_favorites`, a list or one per person; default the main rooms'
  lights, then the locks).
- **Compact one-line tiles** (64 px, icon left, name and state), two across.
- Each room starts with a **slim section bar** — icon, name, comfort (Cold / Comfy / Warm,
  Dry / Humid, lights on), temperature · humidity; a person's page shows their room's bar
  instead of the big hero.
- Wide tiles across the full width: weather, air quality, camera, next event, person, charts,
  energy flow and today, photos. No clock; status pills on Home only, left-aligned.
- Turning a phone / resizing across 600 px switches layouts on the fly.

## 0.6.1 — 2026-11-04

- **Anime avatars** for people without a picture (DiceBear "Adventurer", CC BY 4.0), with
  gender: `avatars: { person.alex: man, person.zoe: woman }` gives short / long hair (also
  boy / girl), or a picture URL per person. Same face every time; no names are sent.
- **Widgets on a phone** is one screen, like a hand-made iPhone HomeView: date | clock, the
  photo across, up next across (rows 1 : 1.3 : 0.85; the weather is on Home).
- **Clean full screen:** the page bar is hidden too; it comes back with HA's sidebar and
  header when you tap the Menu icon. In full screen: swipe, or the ← / → keys.

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
- **Rooms** now means one page per family member's room (Alex, Zoe, Mia …), as on a
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
