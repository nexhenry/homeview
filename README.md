# HomeView

An Apple-Home-style dashboard for Home Assistant that **builds itself from your home**.

HomeView reads your areas, floors, devices and entities and generates a complete dashboard —
Home, Widgets, Family, Rooms (plus a page for every room), Energy and Cameras — that works on
an iPhone, an iPad, a wall tablet and a desktop browser. Add a device to an area and it shows up;
no YAML per tile.

- **Zero setup:** one line of config. Rooms, people, calendars, weather, cameras and energy
  are found automatically.
- **Easy to make your own:** tap the pencil to rename, resize, hide or pin tiles right on the
  dashboard, use the settings editor for everything else, or YAML if you prefer.
- **No other cards needed:** HomeView draws its own tiles. You don't need button-card,
  card-mod, layout-card or anything else from HACS.
- **One dashboard for every screen:** 2 square tiles across on a phone; 5 across on an iPad,
  a tablet and a browser (6 on the room-list pages), square on an iPad and a little wider than
  tall (1.28 : 1, or 1.1 : 1 with 6 across) on screens wider than 3:2 — like the Pixel Tablet — so
  a page fits the screen. Very wide screens get more columns.
- **Light and dark:** follows your Home Assistant theme, each page and room with its own tint.
- **Full screen like an app:** HA's header and sidebar are always hidden when HomeView opens; a small Menu icon brings them back.
- **Touch-first:** tap toggles, hold opens the details. Swipe left / right between pages.

> Status: **0.5 (preview)**. The layout and config keys may still change before 1.0.
> Use at your own risk — see [Disclaimer](#disclaimer).

## Contents

- [Pages](#pages) · [Install](#install) · [Create the dashboard](#create-the-dashboard) · [Full screen](#full-screen-kiosk-mode)
- [Make it yours](#make-it-yours): [on the dashboard](#1-on-the-dashboard-the-pencil) ·
  [settings editor](#2-the-settings-editor) · [YAML](#3-yaml)
- [Your own tiles, cards and pages](#your-own-tiles-cards-and-pages) · [All options](#all-options)
- [Taps](#taps) · [Report a problem](#report-a-problem) · [Credits](#credits) · [Disclaimer](#disclaimer)

## Pages

| Page | What's on it |
|---|---|
| **Widgets** | One tinted panel for a wall tablet: a big date with sunrise / sunset, a big analog clock, the forecast, the week's agenda and a **photo slideshow** from a media folder (sample photos until you add your own) |
| **Home** | One screen, like a hand-made dashboard: date, title, **control chips** (alarm, garage, locks, water valve — red with a word when something needs attention), people and status pills (alarm, climate, lights on, locks, doors & windows, leaks / smoke, batteries, now playing); weather (2×2), air quality (2×1), two doors (front lock, garage), a camera (2×1), *Lights* for the two main rooms (tap = all on / off), a clock and the next event (2×1); your scenes below |
| **Living** | The living spaces everyone shares — living room, kitchen, dining, family room, garage … — each in its own colour with its lights, climate, locks, covers, fans and media. Bedrooms, bathrooms and outdoor areas are left out (they have their own pages). Choose the rooms with `living_rooms` |
| **Rooms** — a page per person | One page for each family member's own room (Ben, Lucy, Hana …): the room's temperature, comfort, humidity, doors and windows, its devices, their next event and where they are. Found automatically from rooms named after people ("Bedroom Lucy"), or set with `members` |
| **Room pages** | 24-hour charts (temperature, humidity, light level), then everything in the room as compact tiles: lights, climate, doors & security, media, devices, scenes, cameras, sensors |
| **Cameras** | Every camera in a 16:9 grid, refreshed every 10 s while on screen. Tap for the live stream |
| **Energy** | A live flow diagram (solar, grid, battery, home), today's numbers and self-sufficiency, and the devices that used the most today — from your Energy dashboard settings |
| **All rooms** *(optional)* | A directory of every room (by floor). Add `all_rooms` to `pages`. It's also what `rooms` shows in a home without member rooms |
| **People** *(optional)* | Everyone with home / away, since when and phone battery, plus the family calendar. Add `people` to `pages` to use it |
| **Your pages** | As many as you like, with your own tiles and any Home Assistant card |

The pages come in this order, and swiping past the last one wraps back to Widgets.
Pages that have nothing to show (no cameras, no energy set up …) are left out.

The pills open a sheet with the matching devices, for example every light that's on or every
open door, and you can control them right there.

## Install

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/nexhenry/homeview`, type
   **Dashboard**.
2. Install **HomeView** and reload the browser.

### Updates

HACS checks for new versions by itself. When one is out you'll see it in three places:
Home Assistant's **Settings** (a badge, and the update under *Updates*), **HACS**, and — for
admins — a banner at the top of HomeView itself. Tap the banner for what's new and the
**Update** button. Don't want the banner? `update_notice: false`.

After updating, each screen has to load the new file. If a screen still runs the old version
(Home Assistant lets browsers cache it), HomeView shows *"… is installed, but this screen
still runs …"* — tap it to reload. Otherwise: hard reload (Ctrl/Cmd+Shift+R), or in the
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

HomeView opens **full screen**: Home Assistant's header and sidebar are hidden, and HomeView's
own bar at the top switches pages (on a phone it shows just the icons; you can also swipe).
Leave HomeView for another dashboard and the header and sidebar come back by themselves.

- The round **Menu** icon (top right) brings the sidebar and header back until the page is
  reloaded or the app reopened — HomeView always opens full screen. Tap it again (now a
  full-screen icon) to hide them.
- Add `?kiosk=off` to the URL to open with them shown.
- `kiosk_chip: false` hides the chip, so nobody leaves full screen by accident.
- `kiosk: false` turns full screen off for everyone (HA's normal header and tabs).

No other kiosk card is needed. (If you use [kiosk-mode](https://github.com/NemesisRE/kiosk-mode)
already, set `kiosk: false` so the two don't fight.)

## Make it yours

There are three ways to change HomeView. They all edit the same settings, so you can mix them.

### 1. On the dashboard (the pencil)

The quickest way, for the tiles you see. Admins see a **pencil** next to the page title.
Tap it and every tile shows its buttons:

| Button | What it does |
|---|---|
| ★ | Put the tile on the Home page (or take it off). Filled = it's on Home |
| ⤢ | Change the size: 1×1 → 2×1 → 2×2 |
| ✎ | Rename the tile (empty = the automatic name) |
| 👁 | Hide it everywhere. Hidden tiles wait at the bottom of the page, faded — tap the eye to bring one back |
| 🎨 | Rooms: change the room's colour |

Each change is saved straight away. **Settings** opens the settings editor, **Done** leaves
edit mode. Turn the pencil off with `edit_button: false`.

### 2. The settings editor

Everything else, without YAML: page order, theme, favourites, people, calendars, rooms
(order, names, icons, colours, what to show first), entities to hide, status pills, energy
sensors and the tile size. Open it from the pencil → **Settings**, or from Home Assistant's own
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

If the dashboard itself is a YAML dashboard (`mode: yaml` in `configuration.yaml`),
HomeView can't save changes from the pencil or the editor. It shows you the YAML to paste
into the file instead.

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

`size` is `WxH` in grid cells (`1x1`, `2x1`, `2x2`, `4x2` …); it shrinks on narrow screens.
`tap: more-info` makes a tap open the details instead of toggling.

Custom pages come after HomeView's pages unless you list their `path` in `pages:`.

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
  pages_config:                   # per page: title, icon, color, sections
    home: { color: orange }
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
  people: [person.anna, person.ben]              # default: everyone with a phone / tracker
  calendars: [calendar.family]                   # default: all calendars
  weather: weather.home                          # default: the first weather entity
  cameras: [camera.front_door, camera.garden]    # default: all cameras

  members:                        # a page per family member (default: everyone whose name is in a room's name)
    person.lucy: { area: bedroom_lucy, calendars: [calendar.lucy_school] }
                                  # members: false = no member pages
  widgets:
    slideshow: media-source://media_source/local/Photos   # photo folder, or samples (default: the
                                  # first media folder named Photos / Pictures / Slideshow …, else
                                  # sample photos; false = none)
    slideshow_interval: 60        # seconds per photo
    slideshow_thumbnail: '{dir}/.@__thumb/s800{name}'     # optional smaller copy to try first (QNAP NAS)
    camera: camera.front_door     # a camera here instead of the photos (the camera is on Home)
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
      - { entity: input_boolean.auto_lights, icon_on: mdi:lightbulb-auto, icon_off: mdi:lightbulb-auto-outline }
      - { entity: automation.night_alert, name: Night alert, off_warn: true, confirm: true }
    camera: camera.front_door     # the camera on Home (default: the first one; false = none)
    air: true                     # the air quality tile, when you have an AQI / PM2.5 / CO2 / VOC sensor
    rooms: false                  # the room tiles on Home (they're on the Rooms page)
    scenes: true
    max_scenes: 8

  pills: [alarm, climate, lights, locks, openings, safety, batteries, media]   # or false
  battery_low: 20                 # % under which a battery counts as low
  people_chips: true              # the avatars under the Home title
  avatars: samples                # people without a picture: samples (free illustrated avatars) | initials

  energy:                         # live power, when the Energy settings don't say
    solar_power: sensor.solar_power
    grid_power: sensor.grid_power         # + import / − export
    battery_power: sensor.battery_power   # + discharge / − charge
    battery_level: sensor.battery_level
    home_power: sensor.home_power         # default: solar + grid + battery
    devices: 12                           # how many devices under "Devices today"

  custom_pages: []                # see "Your own tiles, cards and pages"

  # layout and editing
  tile_size: 175                  # instead of the standard grid: as many columns as fit tiles this wide
  max_columns: 8
  swipe: true                     # swipe between pages
  edit_button: true               # the pencil (admins only)
  kiosk: true                     # full screen: hide HA's header and sidebar
  kiosk_chip: true                # the Menu / Full screen chip
  update_notice: true             # a banner for admins when HACS has a newer HomeView
```

### What goes where

- **Family members** get their own page when a room (area) is named after them — "Bedroom
  Lucy", "Ben's room" — or when you list them under `members`. A calendar with their name in
  it ("Lucy School") is used for their next event.
- **Avatars:** a person's own picture (Settings → People) is always used. Everyone else gets a
  free illustrated sample avatar from DiceBear — the same one every time. Only a hash of the
  person's entity id is sent to api.dicebear.com, never a name. `avatars: initials` shows the
  first letter instead, with no internet request.
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
  (battery sensors are still counted for the Batteries pill). Hide anything else with the
  pencil or `exclude_entities`.
- A room's **temperature / humidity** is the area's own setting (Settings → Areas), else the
  first temperature / humidity sensor in it.
- **Energy** uses Settings → Dashboards → Energy: grid, solar, battery and individual devices.
  Live power comes from the power sensors you set there, or from `energy:` above.

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
| Room | Opens the room's page | Temperature details |
| Sensor, person, camera, weather | Details | Details |

## Using a single page as a card

Every page is also a card, `custom:homeview-page`, for use in your own dashboards:

```yaml
type: custom:homeview-page
page: rooms            # home | widgets | family | rooms | room | energy | cameras
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
- Sample avatars: [DiceBear](https://www.dicebear.com) "Lorelei" by Lisa Wischofsky, CC0 1.0
  (public domain).
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

Try a change on your own Home Assistant by copying `dist/homeview.js` over the installed file
and reloading the browser (bump `?v=` on the resource if it is cached).

## License

MIT — see [LICENSE](LICENSE).
