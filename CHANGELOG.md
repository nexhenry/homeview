# Changelog

## 0.9.1 — 2026-11-13

- **Tap Next for the month ahead.** A tap on a Next tile, the Widgets page's Up next or an agenda
  opens a sheet with the next 30 days of its calendars, by day (Today, Tomorrow, then the date):
  times, all-day events and how long they run, where, and each member's colour (with several
  calendars, whose it is in words too). The tile's own filters apply (`match`, `all_day`, `strip`,
  `join_weekends`), and it never shows fewer days than the tile looks ahead. The events are fetched
  when the sheet opens, and kept for 5 minutes like the tiles'. Hold the tile, or give it
  `tap: more-info`, for Home Assistant's calendar dialog. `calendar_days: <days>` sets the length;
  `calendar_days: false` keeps the old tap (the dialog). Agenda tiles with `layout: list` stay as
  they are. The guest view has no calendar tiles, so no sheet either.
- **A full-screen button on the Widgets page**, bottom right, as quiet as the page dots and fading
  with them on tablets: the browser hides its own bars too. It shows only where that works and the
  page isn't full screen already: not in Fully Kiosk or another app's built-in browser (an Android
  WebView), not on an iPhone (Safari can't), not in a home-screen web app. `fullscreen_button: false`
  turns it off.
- **Power Flow Card Plus reads like HomeView's tiles:** "3.0 kW" instead of "3 kW"
  (`keep_trailing_zeros`), whole watts below 1 kW. HomeView now also passes these settings by the
  card's current names (`base_decimals`, `kilo_decimals`, `kilo_threshold`; the old ones it sent are
  read only by the card's editor since the card's 0.3.5) and keeps the old names for older versions.
- **The flow shows an outage:** while the grid-status entity reads down (`energy.grid_status`, or the
  one HomeView finds), Power Flow Card Plus shows the grid in red with "Grid down" and its tower-off
  icon. It follows the outage list's own reading: your `up` / `down` lists, a binary sensor either
  way round, any letter case, and every state that means down (the card itself compares one state,
  so HomeView hands it the one the entity is in).
- **When was that location reported?** A person's page shows, under Home / Away, when their tracker
  last reported a location ("located 2:12 AM", "located yesterday 6:40 PM"); older than an hour it
  turns amber, "location from 2:12 AM", so a phone stuck on an old fix (location permission "While
  using") no longer passes for a fresh "Home". On phones the person's page starts with their row
  (where, and when located). Person tiles elsewhere say it only once it's old.
  `location_stale_minutes: <minutes>` sets the hour, `false` never turns it amber. It redraws when
  the tracker reports, with the tiles' existing minute tick; no new timers.
- **Cleaner names in the pills, their pop-ups and the "are you sure?" sheets.** A sensor or lock whose
  own name is only its kind ("Moisture", "Battery", "Door", "Problem" …) is called by its device:
  "Basement Water Leak Moisture" → "Basement Water Leak" (from Home Assistant's own entity and
  device names; older versions: the registry, else the name as it was). No state word twice: "Garage
  Door Open", not "Garage Door Open open". The doors pill drops a last "Sensor" or "Contact" and the
  locks pill a last "Lock" ("Front Door open", "Unlock Back Door?"), when something is left. Names
  you give in `customize` stay as you wrote them. The battery pop-up lists devices by name too, and the
  night face's Tonight lines follow the pills.
- **Living opens faster:** a room's tint (its tiles and its section) is made once per colour and no
  longer repeats the text shades every tile already gets from the page (a page of rooms built a
  full palette of about 50 colour settings for every room tile). Nothing looks different.
- **`energy.flow_card_options` is laid over HomeView's settings block by block,** so
  `entities: { grid: { power_outage: { label_alert: Outage } } }` changes only that, and `null`
  removes a setting (before, a block replaced HomeView's whole block). A `power_outage` with its own
  `entity` or `state_alert` is passed as it is.

## 0.9.0 — 2026-11-13

**A new foundation.** One bad tile or setting can no longer take a page down; on-screen edits can't
be lost to a failed read; a registry change rebuilds only what it affects and keeps open sheets and
your scroll; every option lives in one schema (`schema/options.json`) that the README, the full
example and the tests are built from; and CI runs a syntax check, 116 tests and a privacy gate
before any release. On top: conditions (`show_when`), confirm everywhere, patterns, time pills and
section defaults; a night face and a guest view; Home Assistant's own cards follow HomeView's light,
dark and night look; offline devices stay in place with a badge; brighter "on" vs quieter "off"
tiles with WCAG contrast in light mode; problems-first pills; page dots; an in-app confirm and
rename sheet; and the Energy page's outage list on one Home Assistant label, run through your own
script if you like.

- **`show_when:` on tiles, sections and pills.** A tile, a section, a pill of your own or a page's
  pill shows only while a condition holds, and follows the state live (no page reload): an entity
  that's on, `{ entity, state / state_not }`, `{ entity, above / below }` (numbers or entities), an
  `attribute:`, `{ user: [...] }`, `{ admin: true }`, combined with `or:` / `and:` / `not:`. Home
  Assistant's own visibility conditions (`condition: state | numeric_state | user | screen | and | or |
  not`) work too. A section whose tiles are all hidden hides as well; edit mode shows everything,
  the hidden ones faded. Example: a forecast only on a rainy day, a vacuum's controls only while it
  cleans.
- **Patterns instead of long lists.** `exclude_entities` and a section's tiles take globs
  (`sensor.*_linkquality`, `light.kids_room_*`) and filters (`{ domain, area, label, device_class,
  integration, entity_id, not }`; area and label by id or name, a device's label counts). In tiles,
  `{ match: <pattern>, …options }` makes one tile per entity, and `state:` in its filter shows each
  only while it's in that state (a live "open doors" list). Entities hidden in Home Assistant never
  match; diagnostic ones only when named by id.
- **Times and attributes on tiles and pills.** `format: time | date | datetime | relative | until |
  since` for `input_datetime` helpers, date / time entities, timestamp sensors and attributes ("Wake
  in 9 h 20 min", "5 minutes ago"); `relative` / `until` / `since` update every 30 s.
  `attribute: battery_level` (any attribute, or `last_changed`) shows an attribute instead of the
  state. `input_datetime` helpers are value pills in `layout: pills` (they showed only their name).
- **`confirm:` everywhere an entity is switched.** `customize.<entity>.confirm` asks wherever that
  entity can be switched (its tiles on every page, the pills' pop-ups, a chip, a button that toggles
  it); a tile's own `confirm:` wins. `confirm:` takes `true`, `turn_on` / `turn_off` (only before
  that, e.g. before sounding a siren but not before stopping it), your question, or `{ text, only,
  action }`, in HomeView's own sheet. Locks and garage doors still ask every time; a `confirm:` gives
  them your words. `hold: toggle` on an entity tile now switches it on a hold (it
  opened the details), so `tap: more-info` + `hold: toggle` keeps a stray tap from setting something
  off; `confirm:` follows the gesture that switches.
- **Section `defaults:`**: tile options every tile of a section gets (a tile's own keys win), e.g. a
  remote's `{ type: button, action: remote.send_command, target: … }` once. The Media page file's
  remote uses it.
- Admins get a note for typos in these: an unknown key in a section, a `customize` entry, a
  condition, a filter or `confirm:`, an unknown `format:`, a pattern that matches nothing, a
  `show_when` entity Home Assistant doesn't have. The settings editor keeps patterns in
  `exclude_entities` as they are (its entity picker shows the plain ids).

- **One bad tile no longer takes a page down.** A tile that can't be drawn (odd data, a renderer
  error) shows a small "Tile error" placeholder (admins see why) and the rest of the page keeps
  working. If rebuilding a page fails, the page on screen stays and keeps updating instead of
  freezing or being replaced by Home Assistant's error card; a page's own tiles failing still leaves
  its header and your sections.
- **Page files accept only the tile types meant for them** (entity, room, clock, weather, forecast,
  date, next_event, agenda, camera, person, chart, button, fader, air, energy_now, energy_flow, and
  `card:`). HomeView's internal types used to be accepted and could throw. An unknown type, or a room
  tile for an area that doesn't exist, is left out with a note for admins instead of vanishing.
  `energy_now` / `energy_flow` on a page find the live power sensors themselves.
- **On-screen edits can't be wiped by a dropped connection.** Saving reads the dashboard's saved
  edits first; if that read fails for any reason but "there are none yet", nothing is saved and a
  message says so. Before, a failed read counted as "no edits" and the save overwrote every earlier
  edit.
- **The Settings sheet on a YAML dashboard starts from what the dashboard shows** (the YAML plus
  the on-screen edits). Before, it started from the YAML alone, and saving it dropped the edits made
  in edit mode.
- **Alerts and warnings never fail silently.** New rule `none_on: [ids]`: none of them is on (off,
  offline and missing all count), e.g. "both pumps off". A rule that can't be checked because its
  entity is offline shows "<name> not reporting" in amber, a missing one "Can't check: <text>" (or
  `text_offline`), instead of nothing. A bare YAML `on:` / `off:` key works too. Admins' missing-entity note now also covers a
  page's `pill:` and `alerts:`.
- **Tiles away from their room say the state and the room**: on Home, in the pills' sheets and in
  the phone favourites the front lock reads "Locked · Entry" (it used to show only the room, never
  "Locked"); two "Leak Battery" rows become "Leak Battery · Kitchen" / "· Bathroom"; a name that
  says nothing on its own ("Light") gets its full name there. The Lights tile reads "2 on · Kitchen".
  Inside a room nothing changes.
- **Offline devices keep their place.** They used to vanish from Home's chips and favourites, Living,
  person pages and the phone favourites, or fade like "off". Now they stay, at full strength, with
  an amber "!" on the icon and the word "Offline" (one word everywhere); a tap opens the details. A
  scene or button that has never run isn't offline any more.
- **Readable colours in light mode.** Comfort words, "Offline", an open door's "Open", Live and
  similar words use darker shades of the same colours (4.5 : 1 on every room tint, also on lit
  tiles); grey state words and the Widgets board's text are darker; the weekday on Widgets is a
  deeper orange; red pills and chips are a deeper red for their white text. Icons, fills and dark
  mode are unchanged.
- **Desktop browser windows taller than wide** (no touch screen, at least 1000 px wide) lay out like
  a landscape tablet: a 1280 × 1350 window gets the same columns and tile shape as a 1280 × 800
  tablet, and Widgets keeps its landscape board at the top. `desktop_layout: fill` keeps the old
  behaviour. Touch screens are unchanged.
- **HomeView's own "are you sure?" sheet** for locks, garage doors, `confirm:` tiles, buttons and
  chips, and the outage list, instead of the browser's dialog (which a kiosk browser can block): it
  says what the device is doing now ("Locked · Entry · since 7:12 PM", or what a pump draws), with
  48 px buttons; Esc cancels, Enter confirms.
- **Bigger touch targets:** pills, chips, avatars, the page bar, sheet buttons, edit-mode buttons,
  thermostat −/+, fader mute and the outage list's buttons respond to at least 44 × 44 px.
- **Widgets' "Up next" fits its space:** it shows the events that fit, keeps its title, never ends on
  a lone day heading, and says "+2 more".
- **Status pills: problems first on every screen.** The pills that need attention come first — red,
  then amber — and the rest keep their order, on tablets and in a browser too (it was phones only;
  edit mode keeps the saved order, to drag). A pill names the one thing that needs a look
  ("Back Door open", "Side Door offline", "Kitchen Leak") and counts several ("2 open", "2 locks
  offline", "1 battery low · 1 offline"); the thermostat's pill is "70° · Heating" while it runs and
  "70°" otherwise. Pills are 40 px tall on tablets. The Locks, Doors & Windows and Leaks sheets list
  what needs a look first, in groups, as Batteries did.
- **Guest view** (`guest: input_boolean.guests_here`): while the helper is on, shared screens leave out the
  person pages, People, Cameras and admin-only pages (swipe order, page dots, page bar; a link to one
  goes to Home), the people on Home, and every camera, person and calendar tile; Widgets drops the
  agenda and shows the sample photos (or `guest.slideshow`). Controls, scenes, weather and the Energy
  pill stay, and a "Guest" label says why. Every screen but admins', or `screens:` names the logins
  (no entity: always for those); `hide:` adds pages. It hides, it doesn't secure.
- **Renaming a tile or a page uses HomeView's own sheet** (a text field, Save / Cancel, Enter / Esc)
  instead of the browser's prompt, which some kiosk browsers block. In edit mode the edit bar is a row
  of its own under the title and the pills, so the pills no longer squeeze into one column.
- **Cameras: up to nine on one screen** on tablets and in a browser (up to 3 across, 16:9, no
  scrolling), like Apple's camera face; an offline camera shows an amber badge and "Offline".
- **Who's home, without colour alone:** someone away is faded with a location pin under Home's title;
  a person's page says where they are by its title ("● Home", "Away · 2 h"). A room summary shows the
  temperature once, big, and below it how the room feels and its humidity. Home's weather tile names
  the home instead of repeating the time and date. The next event reads "Up next · <calendar>".
- **Rooms:** a small › on a room's tile and phone bar opens its details page (a tap elsewhere still
  switches its lights). **Chips:** `label:` puts a word beside a chip's icon on tablets ("Auto
  lights"); a `'|'` in `home.chips` starts a new group.
- **Values that didn't refresh now do:** a room page's temperature by its title; comfort words when
  the comfort band comes from entities (`comfort: { cold, warm }`, `comfort_margin`, `comfort_limits`);
  picks that depend on a state — people with a location, the thermostat comfort follows, Home's
  camera, a room page's live tiles — follow a device going offline or coming back (after 2 s), not the
  next registry change.
- **Lighter while it runs:** the clock tile is drawn once a minute and its hands turn by themselves (it
  redrew about 75 parts every second); the full-screen check no longer fires a resize event every
  2.5 s; the Energy page reads today's statistics in two requests a minute instead of one per meter,
  finds each device's sensors in an index instead of scanning every entity, and the Energy settings
  are read once for everything; the slideshow and the data cache no longer grow for weeks on a tablet
  that's always on.
- **Page files:** `$$` is a plain `$` in a page's text ("Price: $$5"), never an unset var; a page
  without `path:` gets a note for admins (its address is its place in the list).
- Smaller: with reduce motion the screensaver's hands move on the minute and it appears without a
  fade; Widgets without an agenda (no calendars, or the guest view) gives the photo its place; the
  energy and reading colours come from one place.
- **Reduce motion and keyboards:** with reduce motion set, nothing wiggles, pulses or flows (a
  critical banner gets a steady ring). Tiles, pills and chips work with a keyboard (Enter / Space;
  Shift+Enter holds) and tiles are named for screen readers.
- **Power outages: one list, your own script, and nothing switched without asking.** The ticks on
  the Energy page are an HA label ("Outage: turn off", or `energy.outage.label`), the one list that
  HomeView, the blueprint and your own automations read. New `energy.outage` options:
  `off_action` / `on_action` run your script for **Turn off ticked** / **Turn back on** (it gets
  `entities`, the ticked switches, and `on_entities`) instead of a plain turn off / on — so a script
  that keeps a pump running is the one that runs; `on_label` adds a second tick, "turn on in an
  outage"; `switches` pairs a device by hand; `outage: false` keeps only the devices list. Both buttons
  and each row's On / Off now ask first (what it switches, what it draws) and are for admins only;
  a row's button turns off what it said rather than toggling.
- **The grid's state in plain words.** The outage header said "grid on" when the grid-status sensor
  was unknown, unavailable or reported a battery's "Inactive". Now "grid on" only when the sensor says
  so, "GRID DOWN" for the usual down words (Inactive, off_grid, islanded, on_battery …), "grid status
  unknown" in amber, and any other state as it is. `grid_status: { entity, up: [...] }` or
  `{ entity, down: [...] }` names your sensor's states. The blueprint's default down states include
  `inactive` too.
- **Each outage row switches the right device.** A row used the first switch on the energy meter's
  device, which on a multi-channel plug (or one with a "metering only" switch) was the wrong one. Now
  the switch named like the energy sensor (`sensor.pump_energy` → `switch.pump`, also on another
  device), else the device's only switch, else none (no button); power and current the same way.
  Rows line up: a row without a tick (no switch; for everyone but admins, one that isn't ticked)
  keeps an empty slot, so icons and names stay in one column.
- **No more "-0.00 kWh" or "-0 W":** a number that rounds to zero shows without a minus sign (a meter
  that stepped back a little, a plug idling just below zero), and negative kW values show two
  decimals like positive ones.
- **A little less work on slow tablets:** the first page no longer forces the browser to lay out the
  whole dashboard while it is being put on screen (asking where the window is scrolled did; about
  0.15 s of a wall tablet's first load), the check for devices that went offline runs at most once a
  second instead of on every state change, and rooms' comfort keys read the comfort settings once
  per update instead of once per room.
- **On and off at a glance (light mode):** a tile that's on is bright, almost white with a soft
  shadow; one that's off is recessed into the room's tint (they were nearly the same colour in some
  rooms). An alert tile is tinted red instead. Dark mode is unchanged.
- **"On" and "needs a look" no longer look alike:** "on" icons are a warm yellow, "needs a look" a
  deeper amber in light mode (the two were the same orange), and an offline chip keeps its own icon
  with the amber "!" badge instead of looking lit.
- **Page dots in full screen:** a row of dots at the bottom says there are other pages and which
  one you're on; tap a dot to go there, the current one (on a phone, the dots) for the pages by name.
  The page's name shows for a moment when you arrive; on Widgets the dots fade after 5 s. `page_dots:
  false` turns them off.
- **Phones: the controls first, and they open on Home.** Home on a phone starts with the favourites
  and Lights, then the scenes two to a row, then a one-line weather, the camera, the next event and air
  quality (the weather and air used to fill the first screen). The status pills wrap onto more lines
  with problems first, and chips and people share a row (the chips wrap too): nothing on Home scrolls
  sideways, so a sideways swipe there always changes the page. Phones open on Home, tablets on
  the first page (Widgets); a link to a page is kept. `start: { phone: …, tablet: … }` changes it.
- **A night face** (`night: <entity> | auto | { from, to }`): the dark look in warm, quiet colours,
  photos dimmed, a black screensaver with a dim clock and no seconds hand, and on Widgets "Tonight"
  (the alarm, locks, doors and windows, tomorrow's first event) instead of Up next. With reduce
  motion, the screensaver's hands move once a minute.
- **Swipes between pages aren't lost.** A swipe was timed by when the page got round to it, so a
  page busy for a moment (a camera still, a rebuild) took a quick swipe for a slow drag; and when the
  tile under the finger redrew mid-swipe (the clock does every second), the swipe never reached the
  page. Now the touch's own time counts (up to a second), and the end of a swipe is heard on the
  element it started on too. A slider, a fader, an edit-mode drag or a card's own content that scrolls
  sideways keeps its drag instead of changing the page.
- **Room details pages close with ✕** (hold a room's tile, bar or title): the same floating ✕ as the
  pop-up pages, top right and clear of the notch, and Esc; it goes back to where you opened the page
  (else Living). The ‹ before the title is gone.
- **A registry change no longer rebuilds the dashboard under you.** Home Assistant built a HomeView
  dashboard again whenever anything in its entity, device, area or floor registry changed, also what
  HomeView doesn't use (a label, a device's firmware version), and HomeView rebuilt the page on top of
  that: an open sheet closed, the page jumped to the top and every other page was built again on its
  next visit. Now a page rebuilds only when something it reads changed (an entity's room, device, name
  or icon, a room's name, icon or floor …), and the dashboard is built again only when the pages
  themselves change (a room or a person's page comes or goes, a page's name or icon; Home Assistant
  2026.7 or newer), once. Neither happens while a sheet is open or a tile is being dragged: it waits
  until that's done. Every rebuild keeps the scroll position, also when Home Assistant replaces a page,
  and ticking an outage row only redraws the row.
- **Home Assistant's cards follow HomeView's look: light, dark or night.** With HomeView dark (the night
  face, `theme: dark`) and Home Assistant light, the Energy cards' table was white with grey text, a
  chart's legend dark on the dark card, its grid lines invisible and the "Now" chip light blue; in
  plain dark mode the table rows were a different grey than the card. HomeView now sets Home
  Assistant's theme variables on its pages from its own colours (backgrounds, text, dividers, tables,
  text fields, HA's newer colour tokens for buttons and chips, in the page's accent) and gives
  embedded cards its mode, so charts, tables, buttons and the settings form match the page. Table
  rows are the card's own colour.
- Smaller: the Air tile's temperature is plain text (it was green because the air was good), a room's
  temperature chart is orange, the weather tile's 💧 is an icon, "Favourites" on phones, and switch-like
  tiles and chips tell screen readers whether they're on (`aria-pressed`).
- **Every option documented, from one table.** README → All options is now a table per topic with
  each option's type, default and the version it came in, nested keys included (`home.chips`,
  `energy.outage`, `warnings` rules …); `custom_pages/README.md` → Every key lists every key of a
  page file, a section and a tile; `examples/full.yaml` has every option with an example value (it
  had 20). All three are generated from `schema/options.json`, and the tests fail when an option has
  no row there. `scripts/check-config.mjs` lists a config's unknown or misspelt keys at any depth.
- Development: `scripts/test.sh` (headless tests in Node, no dependencies) and
  `scripts/privacy-check.sh` (a privacy gate for this public repository); CI now runs
  `scripts/check.sh` (the file as an ES module, as browsers load it), the tests and the gate, and a
  release is only published when they pass. A development copy (`scripts/dev-build.sh`) no longer
  shows admins the "an older copy is cached" icon all the time.

## 0.8.20 — 2026-11-07

- **Move tiles in edit mode.** Drag a favourite on Home, or a device tile in a room (Living, a
  person's page, a room's page), to a new place. Mouse: drag; touch: hold a moment, then drag, so a
  quick swipe still scrolls. Saved as `home.favorites` or the room's `entities:` list.
- **Add a favourite in edit mode:** a dashed **+ Add a favourite** tile after Home's favourites
  (search any entity); the filled ★ takes one off.
- Personal details removed from the README, a code comment and the screenshots' file names.

## 0.8.19 — 2026-11-07

- **Faster swiping.** Measured on a phone-speed CPU: first visits to a page are 13–54% quicker
  (Cameras 1.0 → 0.47 s, a person's page 1.0 → 0.76 s, Widgets 1.4 → 1.1 s, Living 1.6 → 1.3 s), and
  HomeView does about 40% less work while a page sits idle.
  - All pages share one model of the house (entities, rooms, people), built once instead of per
    page. Rebuilding a page takes 28–80 ms instead of 100–170 ms.
  - Icons are reused when a tile or the header redraws, instead of making new ones. A new icon
    looks itself up again in Home Assistant's icon store; tiles redraw on every change of their
    entity, and the header on every pill change.
  - Number formats are made once (they were built on every redraw).
  - Layout runs when the width changes, not every time the page grows as tiles fill in, and only
    reads a list's columns when a tile there needs them (each read forced the browser to lay the
    page out).
  - Several Home Assistant updates within one frame redraw the header once; a page that isn't on
    screen waits and catches up when it's shown; states are counted at most once a second.

## 0.8.18 — 2026-11-07

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
