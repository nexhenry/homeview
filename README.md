# HomeView

An Apple-Home-style dashboard for Home Assistant that **builds itself from your home**.

HomeView reads your areas, floors, devices and entities and generates a complete dashboard —
Widgets, Home, Living, Rooms (plus a page for every room), Energy and Cameras — that works on
an iPhone, an iPad, a wall tablet and a desktop browser. Add a device to an area and it shows up;
no YAML per tile.

- **Zero setup:** one line of config. Rooms, people (and a page for each, from their
  `person` entities), calendars, weather, cameras and energy are found automatically.
- **Easy to make your own:** double-tap a page's title to rename, resize, hide or pin tiles right on the
  dashboard, use the settings editor for everything else, or YAML if you prefer.
- **No other cards needed:** HomeView draws its own tiles. You don't need button-card,
  card-mod, layout-card or anything else from HACS.
- **One dashboard for every screen:** 2 square tiles across on a phone; 5 across on an iPad,
  a tablet and a browser (6 on the room-list pages), square on an iPad and a little wider than
  tall (1.28 : 1, or 1.1 : 1 with 6 across) on screens wider than 3:2 — like the Pixel Tablet — so
  a page fits the screen. Very wide screens get more columns.
- **Light and dark:** follows your Home Assistant theme, each page and room with its own tint.
- **Full screen like an app:** HA's header and sidebar are always hidden when HomeView opens; a small Menu icon in front of the Home title brings them back (on phones and iPads it opens the sidebar too, so Settings is one tap away).
- **Touch-first:** tap toggles, hold opens the details — a room's tile toggles its lights and
  holding it opens the room's page. Swipe left / right between pages, one page per swipe.

> Status: **0.8 (preview)**. The layout and config keys may still change before 1.0.
> Use at your own risk — see [Disclaimer](#disclaimer).

## Contents

- [Pages](#pages) · [A real home, fine-tuned](#a-real-home-fine-tuned) · [What you need](#what-you-need) · [Install](#install) · [Create the dashboard](#create-the-dashboard) · [Full screen](#full-screen-kiosk-mode)
- [Make it yours](#make-it-yours): [on the dashboard](#1-on-the-dashboard-double-tap-the-title) ·
  [settings editor](#2-the-settings-editor) · [YAML](#3-yaml)
- [Your own tiles, cards and pages](#your-own-tiles-cards-and-pages) · [All options](#all-options)
- [Taps](#taps) · [Report a problem](#report-a-problem) · [Credits](#credits) · [Disclaimer](#disclaimer)

## Pages

| Page | What's on it |
|---|---|
| **Widgets** | One tinted panel that fills the screen: a big date with sunrise / sunset, a big analog clock, the forecast, the week's agenda and a **photo slideshow** from a media folder (sample photos until you add your own). On a phone: date and clock side by side, the photo, then up next |
| **Home** | One screen, like a hand-made dashboard: date, title, **control chips** (alarm, garage, locks, water valve — red with a word when something needs attention), people, and the **status pills** top right (alarm, climate, power now, lights on, locks, doors & windows, leaks / smoke, batteries, now playing, plus your pages' own pills); weather (2×2), air quality (2×1), two doors (front lock, garage), a camera (2×1), *Lights* for the two main rooms (tap = all on / off, hold = the room); your scenes; then a clock and the next event (2×1) |
| **Living** | The living spaces everyone shares — living room, kitchen, dining, family room, garage … — each in its own colour with its lights, climate, locks, covers, fans and media. Bedrooms, bathrooms and outdoor areas are left out (they have their own pages). Choose the rooms with `living_rooms` |
| **Rooms** — a page per person | One page for each family member (Alex, Zoe, Mia …), found from your `person` entities: their room's temperature, comfort, humidity, doors and windows, its devices, their next event and where they are. Automatic for everyone with a room named after them ("Bedroom Zoe"); `members` sets who and in what order. Each person sees only their own page unless `access` says otherwise (admins see all) |
| **Room pages** | A room's details — hold a room's tile or title: *Right now* (temperature, comfort, humidity, its doors and locks), quick tiles (all its lights on / off, presence, power now), 24-hour charts (temperature, humidity, light level), then everything in the room: lights, climate, doors & security, media, devices, scenes, cameras, sensors |
| **Energy** | Opened from the Energy pill (or in the page bar). A live flow diagram; *right now* (solar, home with amps · volts, grid importing / exporting, battery charging / discharging); **backup time** on battery; **off-grid share in your peak hours** (optional time windows); **solar self-sufficiency**; today's totals; and a **power-outage list** of every device with W · A · kWh today and an on / off button — tick what to turn off when the grid goes down. The flow is [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus) when it's installed (HomeView's own otherwise); the numbers are live between meter readings |
| **Cameras** | Every camera in a 16:9 grid, refreshed every 10 s while on screen. Tap for the live stream |
| **All rooms** *(optional)* | A directory of every room (by floor). Add `all_rooms` to `pages`. It's also what `rooms` shows in a home without member rooms |
| **People** *(optional)* | Everyone with home / away, since when and phone battery, plus the family calendar. Add `people` to `pages` to use it |
| **Your pages** | As many as you like, with your own tiles and any Home Assistant card |

The pages come in this order, and swiping past the last one wraps back to Widgets.
**On a phone** every page follows a hand-made iPhone HomeView: a big title (*Hi <your name>* on
Living and each person's page, with a strip of six favourites), compact one-line tiles two
across, each room starting with a slim bar (name, comfort, temperature · humidity), wide tiles
(weather, air, camera, next event) across the full width, no clock. Status pills are on Home only, under the chips
(top right on tablets and in a browser).
Favourites: `phone_favorites: [light.kitchen, …]` or per person
`{ alex: [...], zoe: [...] }` (default: the main rooms' lights, then the locks).

Pages that have nothing to show (no cameras, no energy set up …) are left out.

The pills open a sheet with the matching devices, for example every light that's on or every
open door, and you can control them right there. Energy opens the Energy page; a page's own pill
(Pond, …) opens that page.

**Tile shapes fit the screen.** Phones get two columns of 64 px rows. On tablets and in a browser:
- **Columns:** a page's own count (5 or 6), but tiles stay between 110 and 300 px wide.
- **Row height:** 4 rows fit on one screen, keeping each tile between square and 1.35 : 1. A tall
  screen (a portrait iPad) gets square tiles and scrolls. A wide one (Pixel Tablet, landscape iPad,
  laptop) gets wider tiles, so the 4 rows fit. A row is never under 88 px, two touch targets.
- **Inside a tile,** text and icons scale with its size.
- **Energy** keeps rows of 176–210 px for its text-heavy tiles.
- **Widgets** fills the screen edge to edge.

`rows_on_screen: 5` (or `{ home: 4, living: 5 }`) changes how many rows should fit;
`tile_size` / `max_columns` still override the columns.

## A real home, fine-tuned

What one family's wall tablet looks like after taking the same design further by hand: the
dashboard that HomeView is modelled on, on a Pixel Tablet (1280 × 800, full screen). HomeView builds this kind of page from your home automatically. Use these as ideas
for your own fine-tuning: favourites, `customize`, your own sections and pages (a pond, a
media room), energy time windows. Camera pictures, photos, calendar and school details and the town are blurred, and family names are changed, for privacy.

**Widgets**, the wall tablet's resting page: a big date, a clock, the family photo slideshow,
what's next and the weather.

![Widgets: big date with sunrise / sunset, analog clock, photo slideshow, up next and the weather](docs/screenshots/home-widgets.png)

| Home | Living |
|---|---|
| ![Home: control chips, status pills, weather, air quality, camera, doors, lights, clock and the next event](docs/screenshots/home-home.png) | ![Living: every shared room in its own colour, with its devices](docs/screenshots/home-living.png) |
| **A person's page** (their room, devices and next event) | **Another person's page** (with a school-day tile) |
| ![A person's page: their room's temperature, comfort and doors, their lights and devices, the next family event](docs/screenshots/home-person-mia.png) | ![A person's page: their room, TV, fan, window and door, the next school event and whether today is a school day](docs/screenshots/home-person-zoe.png) |
| **A room's page** (hold the room) | **Energy** (full screen) |
| ![Living Room: 24-hour charts against outdoor, then every device grouped](docs/screenshots/home-room.png) | ![Energy: live flow, Powerwall, backup time, peak / partial-peak off-grid, solar self-sufficiency and the power-outage list](docs/screenshots/home-energy.png) |
| **Your own page: a pond** | **Your own page: media** |
| ![Pond: pumps, air, UV, valves and garden with live power](docs/screenshots/home-pond.png) | ![Media: karaoke controls, TV remote, effect presets and mixer levels](docs/screenshots/home-media.png) |

**An admin page** of the home's own settings (modes, comfort thresholds, light and fan timing,
climate periods, vacation, the photobeam and the security messages), each a tap or slider on
an HA helper. In HomeView you'd make a page like this with `custom_pages` and your own tiles.
Family names are changed here and the hub's address is hidden.

![Admin: modes, climate thresholds and periods, light and fan timing, vacation, photobeam and security messages](docs/screenshots/home-admin.png)

## What you need

**Required:** Home Assistant and [HACS](https://hacs.xyz) (or a manual install, below). That's
all: HomeView draws every tile itself, so there are **no other cards** to install.

**Optional, from HACS:**

| HACS | Type | What it adds |
|---|---|---|
| [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus) | Dashboard | The animated energy flow on the Energy page. Without it HomeView draws its own (`energy.flow_card: homeview` keeps HomeView's even when it's installed) |

**Don't combine with** (HomeView already does these):

| HACS | Why |
|---|---|
| [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) | HomeView hides the header and sidebar itself. If you keep kiosk-mode, set `kiosk: false` so the two don't fight |
| [swipe-navigation](https://github.com/zanna-37/hass-swipe-navigation) | HomeView swipes between its own pages and turns the plugin off on its dashboard (one swipe = one page). `swipe: false` hands swiping back to the plugin |

**Home Assistant features each page uses.** All of these are built into HA and work with any
brand. A page with nothing to show is simply left out.

| Page / tile | Uses | Set it up in |
|---|---|---|
| Rooms, Living, room pages | **Areas** (and floors, for the order) | Settings → Areas, labels & zones |
| People, person pages, who sees what | **People** with a phone tracker (the [Companion app](https://companion.home-assistant.io)) and, for `access`, the person's login | Settings → People |
| Next event, agenda | Any **calendar** (Google, CalDAV / iCloud, Local calendar …) | Settings → Devices & services |
| Weather, forecast | Any **weather** entity (Met.no, NWS …) | Settings → Devices & services |
| Cameras, the Home camera | Any **camera** (Frigate, Reolink, Generic camera …) | Settings → Devices & services |
| Energy | The **Energy** settings (grid, solar, battery, individual devices) and the **recorder** (on by default). Power sensors make the numbers live | Settings → Dashboards → Energy |
| Power-outage list | A **switch** for each device in *Individual devices*, and a grid-status sensor. Plus the optional [blueprint](#power-outages) | Settings → Dashboards → Energy |
| Alarm chip and pill | Any **alarm panel** (e.g. [Alarmo](https://github.com/nielsfaber/alarmo) from HACS, or your alarm's integration) | Settings → Devices & services |
| Air quality tile | An AQI / PM2.5 / CO₂ / VOC **sensor** | — |
| Photo slideshow | A folder of photos in **Media** (My media, or a network share) | Media → My media |
| Update icon | HACS's update entity for HomeView (automatic once installed through HACS) | — |

**Internet:** until you add your own, the slideshow shows sample photos from
[picsum.photos](https://picsum.photos), and people without a picture get avatars from
[DiceBear](https://www.dicebear.com). `widgets: { slideshow: false }` and `avatars: initials`
turn those requests off. Nothing else leaves your network.

## Install

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/nexhenry/homeview`, type
   **Dashboard**.
2. Install **HomeView** and reload the browser.

### Updates

HACS checks for new versions by itself. When one is out you'll see it in three places:
Home Assistant's **Settings** (a badge, and the update under *Updates*), **HACS**, and — for
admins — a small ⬆ icon in front of the Home page's title. Tap it for what's new and the
**Update** button. Don't want it? `update_notice: false`.

After updating, each screen has to load the new file. If a screen still runs the old version
(Home Assistant lets browsers cache it), HomeView shows *"… is installed, but this screen
still runs …"* behind a ↻ icon — tap it to reload. Otherwise: hard reload (Ctrl/Cmd+Shift+R), or in the
Companion app Settings → Companion App → Debugging → **Reset frontend cache**.

**Behind Cloudflare or another caching proxy?** Home Assistant lets caches keep
`/hacsfiles/` files for a month, so the proxy can keep handing out the old HomeView (and old
versions of every other HACS card) on your external address even after a hard reload, while
the local address shows the new one. Purge the file once in the proxy, and add a rule so it
never caches card files. On Cloudflare: Caching → Cache Rules → *URI Path starts with*
`/hacsfiles/` **or** `/local/` → **Bypass cache**.

### Manual

1. Copy `dist/homeview.js` to `<config>/www/homeview/homeview.js`.
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/homeview/homeview.js` as a
   *JavaScript module*. (With `lovelace: resource_mode: yaml`, add it under
   `lovelace: resources:` in `configuration.yaml` and restart Home Assistant.)

## Create the dashboard

1. Settings → Dashboards → **Add dashboard** → *New dashboard from scratch*, name it, open it.
2. ⋮ → **Edit dashboard** → ⋮ → **Raw configuration editor**, replace everything with:

   ```yaml
   strategy:
     type: custom:homeview
   ```

3. Save. That's it — HomeView builds the pages.

HomeView generates the pages each time the dashboard opens, so it follows your home as it
changes: a new light in the kitchen appears on the Kitchen page by itself.

### Full screen (kiosk mode)

HomeView opens **full screen**: Home Assistant's header and sidebar are hidden, and so is the
page bar — move between pages by swiping (or with the ← / → keys). Tap the round **Menu** icon
in front of the Home page's title (it's on Home only, for a clean look elsewhere) and Home Assistant's
sidebar and HomeView's page bar come back (HA's own header stays hidden: its tabs would repeat the
page bar). On phones and iPads the sidebar opens in the same tap, and the page bar has a button to
open it again.
Leave HomeView for another dashboard and the header and sidebar come back by themselves.

- The round **Menu** icon brings the sidebar and header back until the page is
  reloaded or the app reopened — HomeView always opens full screen. Tap it again (now a
  full-screen icon) to hide them.
- Add `?kiosk=off` to the URL to open with them shown.
- `kiosk_chip: false` hides the chip, so nobody leaves full screen by accident.
- `kiosk: false` turns full screen off for everyone (HA's normal header and tabs).

No other kiosk card is needed. (If you use [kiosk-mode](https://github.com/NemesisRE/kiosk-mode)
already, set `kiosk: false` so the two don't fight.)

## Make it yours

There are three ways to change HomeView. They all edit the same settings, so you can mix them.

### 1. On the dashboard (double-tap the title)

The quickest way, for the tiles you see. Admins **double-tap the page title** (on Home: "Home" or
your home's name). There's no button for it, so the header stays clean. Every tile then shows its
buttons:

| Button | What it does |
|---|---|
| ★ | Put the tile on the Home page (or take it off). Filled = it's on Home |
| ⤢ | Change the size: 1×1 → 2×1 → 3×1 → 2×2. In a room's lists too (a size two rows tall shows as a full tile) |
| ✎ | Rename the tile (empty = the automatic name) |
| ◇ | Change the icon (Home Assistant's icon picker; **Automatic** = the entity's own icon) |
| ⊖ | Living, a person's page, a room's page: take the tile off this room (saved as the room's `entities:` list) |
| 👁 | Hide it everywhere. While you edit, a hidden tile stays in its place, faded — tap the eye again to show it. It leaves the page when you tap **Done** |
| 🎨 | Rooms and a person's room summary: change the room's colour (it tints that person's page too) |
| ⋯ | A room's lists (one row per device): the same actions, in a sheet |

**+ Add** (a dashed tile on Living, a person's page and a room's page, in edit mode): search
Home Assistant's devices and entities and add one to that room. That's how a device whose area
comes from its device, or one past the first few, gets a tile, e.g. a TV on a child's page.
A room you've added or removed tiles in keeps that list (`rooms.<area>.entities`); a person's page
shows it too.

**Move tiles:** drag a favourite on Home, or a device tile in a room (Living, a person's page, a
room's page), to a new place. With a mouse, just drag; on a touch screen, hold the tile a moment,
then drag (a quick swipe still scrolls the page). The new order is saved as `home.favorites` or the
room's `entities:` list.

**Favourites:** the dashed **+ Add a favourite** tile after Home's favourites searches any entity
and adds it; the filled ★ on a favourite takes it off.

**The Warnings pill** shows in edit mode even when nothing is wrong ("Warnings · 4", or
"+ Warnings"). Tap it (without dragging) to list the warnings: change each one's level (Critical /
Notice) or remove it, and **+ Add** one from any entity. A switch or plug warns when it isn't on, with
its power reading in the pop-up; a leak, smoke or problem sensor warns when it's on. Saved as
`warnings:`.

**Drag a pill or chip** to move it (they wiggle in edit mode; a tap doesn't act while you edit).
The new order is saved as `pills:` or `home.chips:`. A custom page's own pill (e.g. Pond) can move
too: it's saved as `{ page_pill: pond }`, and its look still comes from the page file. Pills that
aren't showing right now (nothing playing, the alarm pill beside an alarm chip) keep their place.

**✎ next to the page title** renames the page: on a room's page the room itself (`rooms.<area>.name`,
everywhere), on any other page its title and its name in the page bar (`pages_config.<page>.title`,
e.g. `pages_config: { member-zoe: { title: Zoe's room } }`). Empty = the automatic title.

Each change is saved straight away, and the page stays where you scrolled to. **Settings** opens the settings editor, **Done** leaves
edit mode. Turn the double tap off with `edit_button: false`.

### 2. The settings editor

Everything else, without YAML: page order, theme, favourites, people, calendars, rooms
(order, names, icons, colours, what to show first), entities to hide, status pills, energy
sensors and the tile size. Open it from edit mode → **Settings**, or from Home Assistant's own
⋮ → **Edit dashboard**. The **YAML** button shows the configuration it writes.

### 3. YAML

The raw configuration editor (⋮ → Edit dashboard → ⋮ → Raw configuration editor) takes every
option, including the ones the editor doesn't show: per-tile overrides (`customize`), your own
sections, tiles and cards, and your own pages. A typical small config:

```yaml
strategy:
  type: custom:homeview
  title: The Smiths
  room_order: [living_room, kitchen, kids_room]
  rooms:
    kitchen: { color: green, entities: [light.island, light.pendants, switch.coffee] }
  exclude_entities: [light.router_led]
  customize:
    climate.hallway: { name: Heating, size: 2x1 }
    light.lamp_3: { name: Reading lamp, icon: mdi:floor-lamp }
  home:
    favorites: [lock.front_door, cover.garage, climate.hallway, scene.movie_night]
```

**A YAML dashboard** (`mode: yaml` in `configuration.yaml`, e.g. to load page files from
`custom_pages/`) can still be edited on screen:
- Home Assistant can't save a YAML dashboard, so HomeView keeps what you change in edit mode and in
  Settings in a hidden companion dashboard, `<dashboard>-edits`. It's made on the first save, out of
  the sidebar and admin-only.
- HomeView lays those changes over the YAML each time it loads, and everyone sees them.
- Only what differs from the YAML is kept, per entity, room or setting, so the rest of your YAML
  stays in charge. Custom pages always come from the files.
- To start over, delete that dashboard (Settings → Dashboards).
- `ui_edits: false` turns this off: HomeView then shows the YAML to paste into the file instead.
- Note: the companion's name follows the dashboard's address. If you rename the dashboard, copy
  the old `<dashboard>-edits` into the new one, or the edits stay behind.

**A second dashboard that mirrors the first** (a test copy, a kiosk): make a dashboard in the UI
and set its raw config to

```yaml
strategy:
  type: custom:homeview
  from: home-view          # the other dashboard's address
```

It shows that dashboard's settings, pages and on-screen edits, read each time it loads. Changes you
make on the copy (edit mode, Settings) are kept in its own config as `edits:` and never touch the
original.

Admins see a note on the page when the config has an option HomeView doesn't know — usually
a typo.

## Your own tiles, cards and pages

Add a section to any page with `pages_config.<page>.sections`, to a room's page with
`rooms.<area>.sections`, or make whole new pages with `custom_pages`:

```yaml
strategy:
  type: custom:homeview
  pages_config:
    home:
      sections:
        - title: Good morning
          position: top              # top = above HomeView's own tiles (default: below)
          tiles:
            - scene.morning
            - { entity: cover.blinds, name: Blinds, size: 2x1 }
            - { type: agenda, size: 2x2 }
  rooms:
    garden:
      sections:
        - title: Watering
          tiles:
            - switch.sprinkler_front
            - { card: { type: history-graph, entities: [sensor.soil_moisture] }, size: 4x2 }
  custom_pages:
    - path: kids
      title: Kids
      icon: mdi:teddy-bear
      color: pink
      sections:
        - title: Bedtime
          tiles:
            - light.kids_room
            - media_player.kids_speaker
            - { type: person, entity: person.emma }
        - title: Cameras
          tiles:
            - { type: camera, entity: camera.nursery, size: 4x2 }
```

A **tile** is one of:

| Tile | Example |
|---|---|
| An entity | `light.kitchen` or `{ entity: light.kitchen, name: Island, icon: mdi:x, size: 2x1, tap: more-info }` |
| A room | `{ type: room, area: kitchen }` |
| A HomeView widget | `{ type: clock }` · `weather` · `forecast` · `date` · `next_event` · `agenda` (`calendars`, `days`) · `camera` (`entity`) · `person` (`entity`) |
| **Any Home Assistant card** | `{ card: { type: thermostat, entity: climate.hallway }, size: 2x2 }` — anything you'd put in a normal dashboard, including HACS cards |

`size` is `WxH` in grid cells (`1x1`, `2x1`, `2x2`, `4x2` …), or `full` / `half` the page's width
with a height (`full x 3`); it shrinks on narrow screens. `phone_size: 2x5` sets the size on phones
(2 columns, rows of 64 px) for a card that would otherwise be too tall or too short there.
`tap: more-info` makes a tap open the details instead of toggling.

Custom pages come after HomeView's pages unless you list their `path` in `pages:`.

**Page files you can keep and share.** The [`custom_pages/`](custom_pages/) folder has a starter
([`sample.yaml`](custom_pages/sample.yaml)) and four ready-made pages: *Media*, *Energy History*,
*Pond* and *Admin*. Each opens by a hold: the TV tile, the Energy pill, a Pond pill, the Home
title. Each has a `vars:` block at the top, so a shared page works after you change only that.
They live in `/config/homeview/custom_pages/`, one file per page, loaded with
`!include_dir_list`. Edit mode → **Reload pages** picks up a new or edited file with no restart.
The guide, [`custom_pages/README.md`](custom_pages/README.md), covers writing a page and setting
up Home Assistant for it.

**Hold to open a page.** `tap:` / `hold:` can name a page path:

```yaml
  pages_config:
    home: { hold: admin }                             # hold the Home title
  pills: [alarm, climate, { pill: energy, hold: energy-history }, lights, locks, openings, safety, batteries, media,
          { entity: sensor.water_heater_temp, name: Hot water, hold: water }]   # a pill of your own
  customize:
    media_player.living_room_tv: { hold: media }      # the TV tile, wherever it appears
```

A custom page with `subview: true` stays out of the page bar and gets a ✕ that goes back. The
same for a built-in page with `pages_config: { energy: { popup: true } }`: the Energy pill opens it.
A page file with `pill: { entity, name, icon }` adds its own pill to Home.
`admin_only: true` limits it to viewers who see every page: admins, unless `access` gives them a list, and logins with `access: all`.

## All options

Everything is optional.

```yaml
strategy:
  type: custom:homeview
  title: Our Home                 # Home page title (default: your location name)
  theme: auto                     # auto | light | dark
  pages: [widgets, home, living, rooms, energy, cameras]   # which pages, in this order
                                  # rooms = a page per family member's room
                                  # optional: all_rooms, people, custom page paths
                                  # old names: family = living, members = rooms
  pages_config:                   # per page: title, icon, color, sections, hold, popup
    home: { color: orange, hold: admin }   # hold: hold the page title to open that page
    energy: { popup: true }       # popup: not in the page bar / swipe order, opened from its pill, ✕ goes back
    rooms: { title: House, icon: mdi:floor-plan }

  # rooms (areas)
  room_order: [living_room, kitchen, bedroom]   # area ids first, the rest after
  living_rooms: [living_room, kitchen, dining_room, garage]   # the Living page (default: shared indoor rooms)
  hide_rooms: [garage_attic]
  rooms:
    living_room:
      name: Lounge
      icon: mdi:sofa
      color: blue                 # a colour name (red orange amber yellow lime green teal cyan
                                  # blue indigo purple pink brown grey …) or a hue 0-360
      temperature: sensor.living_room_temperature
      humidity: sensor.living_room_humidity
      entities: [light.lounge, media_player.tv]   # show these (in this order) first
      sections: []                # your own sections on this room's page
    shed: { hidden: true }

  # what to show
  exclude_entities: [switch.child_lock, light.status_led]
  customize:                      # per entity: name, icon, size, tap, hidden
    light.lamp_3: { name: Reading lamp, size: 2x1 }
    switch.old_plug: { hidden: true }
  people: [person.sam, person.alex]              # default: everyone with a phone / tracker
  calendars: [calendar.family]                   # default: all calendars
  weather: weather.home                          # default: the first weather entity
  cameras: [camera.front_door, camera.garden]    # default: all cameras

  access:                         # who sees which pages (default: admins all pages; everyone else the
                                  # shared pages + only their own person page)
    person.alex: [widgets, home, living, rooms, energy, cameras]   # rooms = their own person page
    person.wall_tablet: all       # all pages, every person page included (also: all_members)
    guest: [widgets, home]        # a login name works too
  members: [person.mia, person.alex, person.zoe]   # their pages, in this order (default: everyone
                                  # whose name is in a room's name, alphabetically); false = none
  # members: { person.zoe: { area: bedroom_zoe, calendars: [calendar.zoe_school] } }   by hand
  widgets:
    slideshow: media-source://media_source/local/Photos   # photo folder, or samples (default: the
                                  # first media folder named Photos / Pictures / Slideshow …, else
                                  # sample photos; false = none)
    slideshow_interval: 60        # seconds per photo
    slideshow_thumbnail: '{dir}/.@__thumb/s800{name}'     # optional smaller copy to try first (QNAP NAS)
    camera: camera.front_door     # a camera here instead of the photos (the camera is on Home)
    font: geist                   # the Widgets page in a font of your own (see "Fonts"); the clock
                                  # keeps the system font
  home:
    favorites: [alarm_control_panel.home, lock.front_door, cover.garage, climate.hallway]
                                  # default: automatic; [] = none
    light_rooms: [living_room, kitchen]   # rooms with a "Lights" tile (default: the 2 main rooms)
    max_light_rooms: 2
    max_favorites: 2              # automatic favourites (doors first)
    chips:                        # round control chips under the title (default: alarm, garage /
                                  # gate, locks, water shutoff valve; false = none)
      - alarm_control_panel.house
      - { entity: cover.garage_door, confirm: true }
      - { entity: input_boolean.auto_lights, color: light, icon_on: mdi:lightbulb-auto, icon_off: mdi:lightbulb-auto-outline }
                                  # color: the icon while on: security (green, default), light, climate or a CSS colour
      - { entity: automation.night_alert, name: Night alert, off_warn: true, confirm: true }
    camera: camera.front_door     # the camera on Home (default: the first one; false = none)
    air: true                     # the air quality tile, when you have an AQI / PM2.5 / CO2 / VOC sensor
    rooms: false                  # room tiles on Home (they're on Living and each room's page)
    scenes: true
    max_scenes: 8

  pills: [alarm, climate, energy, lights, locks, openings, safety, batteries, media]   # or false; items can also be
                                  # { pill: energy, hold: <page> } or { entity, name, icon, alert: [states], hold: <page> }
  warnings:                       # a Warnings pill, first on Home, only while one of these is true:
    - { text: Kitchen fridge off, text_offline: Kitchen fridge offline, level: critical,
        not_on: switch.kitchen_fridge, entities: [switch.kitchen_fridge, sensor.kitchen_fridge_power] }
    - { text: Water shut off, level: notice, off: switch.water_valve }
                                  # rules: not_on / on / off / all_off: [ids]; critical = red, notice = amber;
                                  # tap = a pop-up with each warning's entities (default: the ones in its rule);
                                  # edit mode: tap the Warnings pill to add / remove them (see "On the dashboard")
  battery_low: 20                 # % under which a battery counts as low
  screensaver: auto               # big clock after 2 min idle: auto = touch tablets only; true; false;
                                  # or { idle: 120, color: '#4D7DB8', pages: [home, living] }
  comfort: thermostat             # Too cold / Cold / Comfy / Warm / Hot on room tiles. Comfy: thermostat
                                  # (default) follows the room's thermostat (its own, else the house's):
                                  # heat setting − margin … cool setting + margin; fixed = 66–77 °F
                                  # (19–25 °C); or { cold: 68, warm: 76 } — numbers or entities
                                  # (e.g. { cold: sensor.comfort_low, warm: sensor.comfort_high })
  comfort_thermostat: climate.hallway   # the house thermostat (default: the first one with a setting)
  comfort_margin: 1               # °F / °C either side of the settings (default 1 °F, 0.5 °C); or an entity
  comfort_limits:                 # the outer grades — numbers or entities (input_number helpers)
    too_cold: 65                  # Too cold below (°F; 18 °C) — never closer than 3 °F to Comfy
    hot: 83                       # Hot above (°F; 28 °C); Cold below / Warm above come from comfort
    too_dry: 30                   # humidity %: Too dry below
    dry: 40                       #   Dry below (a room is Comfy only when temperature and humidity both are)
    humid: 55                     #   Humid above
    too_humid: 65                 #   Too humid above
  people_chips: true              # the avatars under the Home title
  phone_favorites: [light.kitchen, light.living_room, lock.front_door]   # or { alex: [...], zoe: [...] }
  avatars: samples                # people without a picture: samples (anime avatars) | initials
  # avatars: { person.alex: man, person.zoe: woman, person.kai: /local/kai.jpg }   per person

  energy:                         # live power, when the Energy settings don't say
    windows:                      # off-grid share in time windows (peak hours …), from hourly statistics
      - { name: Peak, start: '16:00', end: '21:00', days: weekdays }
      - name: Partial-peak
        hours:                    # several spans, each with its own days
          - { start: '15:00', end: '16:00', days: weekdays }
          - { start: '21:00', end: '24:00', days: weekdays }
          - { start: '15:00', end: '24:00', days: weekends }
    battery_energy: sensor.battery_remaining   # kWh left (default: an energy-storage sensor)
    battery_capacity: 13.5        # kWh, when there's no energy-left sensor (× the battery level)
    grid_status: binary_sensor.grid_status     # power-outage list (default: a sensor named like grid status)
    home_current: sensor.mains_current         # the "A at V" line (default: on the home power sensor's device)
    flow_card: auto               # auto = Power Flow Card Plus when it's installed (HACS), else HomeView's own; homeview
    flow_devices: 0               # devices shown as their own circles in Power Flow Card Plus (default none)
    flow_card_options: {}         # anything else for Power Flow Card Plus
    voltage: sensor.mains_voltage
    solar_power: sensor.solar_power
    grid_power: sensor.grid_power         # + import / − export (a net sensor)
    # grid_import_power / grid_export_power: a split pair (both positive) when there's no net one
    battery_power: sensor.battery_power   # + discharge / − charge (a net sensor)
    # battery_discharge_power / battery_charge_power: a split pair (both positive)
    battery_level: sensor.battery_level
    home_power: sensor.home_power         # default: solar + grid + battery
    devices: 12                           # how many devices under "Devices today"

  custom_pages: []                # see "Your own tiles, cards and pages"

  # layout and editing
  tile_size: 175                  # instead of the standard grid: as many columns as fit tiles this wide
  max_columns: 8
  swipe: true                     # swipe between pages (turns the swipe-navigation plugin off on this
                                  # dashboard so one swipe is one page; false = leave swiping to it)
  edit_button: true               # double-tap a page title for edit mode (admins only)
  kiosk: true                     # full screen: hide HA's header and sidebar
  kiosk_chip: true                # the Menu / Full screen chip
  update_notice: true             # an update icon for admins when HACS has a newer HomeView
  font: geist                     # the whole dashboard in a font of your own (see "Fonts")
```

### Fonts

HomeView uses each screen's own system font: SF Pro on an iPad, iPhone or Mac, Roboto on an Android
tablet. So the same page looks a little different on each. To make every screen look the same, give
HomeView a font of its own. It's served from your Home Assistant, so nothing is fetched from the
internet and it works offline.

Two free fonts (SIL Open Font License) are built in:

| Option | Font | Put this file in place |
|---|---|---|
| `font: geist` | **Geist**: its numbers are the closest to SF Pro's (the 6, 9 and the round bowls) | `Geist[wght].ttf` from [Google Fonts' repository](https://github.com/google/fonts/tree/main/ofl/geist) → `/config/www/fonts/geist/Geist.ttf` |
| `font: inter` | **Inter**: very close to SF Pro overall, with rounder, curlier numbers | `web/InterVariable.woff2` from the zip on [rsms.me/inter](https://rsms.me/inter/) → `/config/www/fonts/inter/InterVariable.woff2` |

Then set `font: geist` (the whole dashboard) or `widgets: { font: geist }` (the Widgets page only).

Any other font: `font: { family: My Font, url: /local/fonts/myfont.woff2, weight: 100 900 }`, or just
`font: Georgia` for a font the screens already have. The clock always keeps the system font.

### What goes where

- **Who sees what:** each person page belongs to the login linked to that person (Settings →
  People → the person → *Allow person to login*). Admins see every page; everyone else sees the
  shared pages and only their own person page. `access` sets it per person or login — e.g. a
  wall tablet's login with `all`, or a child who is an admin limited to their own page. Pages
  someone may not see aren't built for them at all (not in their page bar or swipe order).
- **Family members** get their own page when a room (area) is named after them — "Bedroom
  Zoe", "Alex's room" — or when you list them under `members`. A calendar with their name in
  it ("Zoe School") is used for their next event.
- **Comfort words** (*Comfy*, *Cold*, *Warm*, plus *Dry* < 30 % / *Humid* > 55 %) follow your
  thermostat: a room is *Comfy* within a degree of what the thermostat is set to right now, so a
  cooler night setting reads *Comfy* at night. A room with its own thermostat uses that one. With
  the thermostat off, or none, the fixed 66–77 °F (19–25 °C) applies.
- **Avatars:** a person's own picture (Settings → People) is always used. Everyone else gets an
  anime-style sample avatar (DiceBear "Adventurer") — the same one every time, from a hash of
  the person's entity id (no names are sent). Say who's a man or a woman for short / long
  hair: `avatars: { person.alex: man, person.zoe: woman }` (also `boy`, `girl`), or give a
  picture URL. `avatars: initials` shows the first letter instead, with no internet request.
- **Photos** for the slideshow come from Home Assistant's media: put them in **Media → My
  media** (the `media` folder in your config), or add a network share as media. Album
  subfolders are included and shuffled, nothing repeats until every photo has been shown, and
  each photo cross-fades in once it has fully loaded. Portrait photos are shown whole over a
  blurred fill. Tap the slideshow for the next photo. Until you have a photo folder it shows
  a dozen **sample photos**, loaded from picsum.photos on the internet (`slideshow: false` or a
  folder of your own stops that).
- **Rooms** are your Home Assistant **areas**. An entity belongs to a room through its own
  area or its device's area. Floors (if you use them) set the room order.
- An entity is **left out** when it is hidden, disabled, or a configuration / diagnostic entity
  (battery sensors are still counted for the Batteries pill). Hide anything else in
  edit mode or with `exclude_entities`.
- A room's **temperature / humidity** is the area's own setting (Settings → Areas), else the
  first temperature / humidity sensor in it.
- **Energy** uses Settings → Dashboards → Energy: grid, solar, battery and individual devices.
  Live power comes from the power sensors you set there, or from `energy:` above; otherwise
  HomeView finds them itself — a net sensor (grid + import / − export, battery + discharge /
  − charge) on the meter's own device first, an import / export or charge / discharge pair
  if that's all there is, never an average. The battery % is the one on the battery's device
  (or named like it). If the flow looks wrong, set `grid_power`, `battery_power` … by hand.

## Power outages

The Energy page lists every device from Home Assistant's Energy settings (Settings →
Dashboards → Energy → *Individual devices*) with its switch, power, current and energy today,
most used first. Admins tick <kbd>⏻̸</kbd> the ones to turn off when the grid goes down — the
tick adds the HA label **"Outage: turn off"** to the device's switch. **Turn off ticked** /
**Turn back on** act on them right away.

To do it **automatically**, import the blueprint and pick your grid-status entity and that label:

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fnexhenry%2Fhomeview%2Fblob%2Fmain%2Fblueprints%2Fhomeview_outage.yaml)

It turns the labelled devices off 30 s after the grid goes down and on again 2 min after it is
back (both adjustable).

**Live numbers:** energy meters usually report every few minutes, so between two readings
HomeView adds an estimate from the matching power sensor (power × time since the last
reading, at most 15 minutes) — the totals move every minute and snap to the real number at the
next reading. *Right now* shows **Live** with the time of the latest reading, or a warning when
the power sensors stop updating. Solar self-sufficiency and the window percentages are worked
out hour by hour (the current hour from 5-minute statistics), so they are close estimates.

## Colours

One colour code on every page — chips, status pills, tiles and their sheets:

| Colour | Means | For example |
|---|---|---|
| 🟢 Green | Secured, safe, fine | Locked, garage closed, water on, all doors closed, no leaks, batteries OK, sending power to the grid |
| 🟠 Amber | Needs a look | A sensor or lock **offline** (never shown as fine), arming, opening / closing, batteries getting low, heating |
| 🔴 Red, filled | Act now | Unlocked, open, a leak, water shut off, alarm triggered, a battery low |
| 🔴 Red icon | The alarm is armed | Armed home / away / night |
| 🟧 Orange | On, in use | Lights on, power being drawn, media playing |
| 🔵 Blue | Climate | Cooling, fans |

A chip for a switch (auto-lights, a security automation) is grey while off and coloured while on.
It's green by default, or `color: light` / `climate` / any CSS colour. `off_warn: true` makes it
amber while it's off.

## Taps

**Control chips** (Home): icon only until something needs attention — garage open, door
unlocked, water shut off, alarm triggered turn red with a word; arming, opening and closing
pulse; `off_warn` makes a chip amber while it's off. Tap acts (with `confirm`, asks first; the
alarm opens its panel), hold opens the details.

| Tile | Tap | Hold |
|---|---|---|
| Light, switch, fan, input boolean | Toggle | Details |
| Lock, garage door, gate | Asks, then lock / unlock, open / close | Details |
| Cover, valve | Open / close | Details |
| Media player | Play / pause | Details |
| Vacuum, mower | Start / dock | Details |
| Scene, script, button | Run | Details |
| Thermostat (wide) | − / + change the target, tile opens details | Details |
| Room (tile, phone bar, a person's room summary, title) | Toggles the room's lights: its "all lights" group, else its main light (no such light: opens the room) | Opens the room's details page |
| Lights (a room's) | All on / off | The room's details page |
| Sensor, person, camera, weather | Details | Details |
| Status pill | Its sheet / details (Energy: the Energy page) | Its `hold:` page, else the same as a tap |
| Page title | — | Its `hold:` page (`pages_config.<page>.hold`), if set |

Any tile's tap or hold can open a page instead: `hold: <page path>` on the tile, or for every tile
of an entity, `customize.<entity>.hold`. See [`custom_pages/`](custom_pages/README.md#taps-and-holds).

## Using a single page as a card

Every page is also a card, `custom:homeview-page`, for use in your own dashboards:

```yaml
type: custom:homeview-page
page: living           # widgets | home | living | rooms | room | energy | cameras
area: kitchen          # for page: room
options:               # the same options as the strategy
  theme: dark
```

Use it in a **panel** view so it gets the full width.

## Report a problem

Found a bug, or something looks wrong on your device? Please
[open an issue](https://github.com/nexhenry/homeview/issues/new/choose). The form asks for
your Home Assistant and HomeView versions, the device and browser, and what you expected —
that makes it much faster to fix. Every new issue gets an automatic reply, and the maintainer
is notified straight away.

Ideas and pull requests are welcome too — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Inspired by **Shane Whatley** ([@ShaneCreates](https://www.youtube.com/@ShaneCreates)) and his video
  [*I Built My Own Apple HomeView… Using an iPad!*](https://www.youtube.com/watch?v=hcNzvX3JZbo).
  Thank you, Shane!
- Written with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding tool, and
  maintained by [@nexhenry](https://github.com/nexhenry).
- Sample avatars: "Adventurer" by Lisa Wischofsky, licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), via [DiceBear](https://www.dicebear.com).
- Sample photos: [Unsplash](https://unsplash.com) photographers, served by
  [Lorem Picsum](https://picsum.photos).
- Icons: [Material Design Icons](https://pictogrammers.com/library/mdi/), as shipped with
  Home Assistant.

## Disclaimer

HomeView is a free community project, provided **as is, without warranty of any kind**
(see the [MIT License](LICENSE)). **You use it at your own risk.** It controls real devices in
your home — locks, garage doors, alarms, heating — exactly as Home Assistant lets it, so check
that the tiles do what you expect before relying on them, and keep your security devices'
own apps and safeguards in place. HomeView is not affiliated with or endorsed by Apple,
Home Assistant / Nabu Casa or Anthropic.

## Development

There is no build step: `dist/homeview.js` is the source, a plain ES module.

```sh
./scripts/check.sh                 # syntax check (Node, or Docker's node image)
```

**Test next to the HACS release** without touching your everyday dashboard:

```sh
./scripts/dev-build.sh /config/www/homeview-dev/homeview.js   # a copy with its own element names
```

1. Add `/local/homeview-dev/homeview.js` as a dashboard resource (JavaScript module).
2. Make a test dashboard with `strategy: { type: custom:homeview-dev, from: <your dashboard> }`.

The test dashboard runs your copy with your real settings and pages, while every other dashboard
keeps running the HACS release. After each change, run the build again and reload the browser.

## License

MIT — see [LICENSE](LICENSE).
