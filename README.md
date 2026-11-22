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
  Home Assistant cards on a page (charts, the energy cards, tables, buttons) follow HomeView's look
  too — light, dark or night, even when HA's own theme is the other one.
- **Full screen like an app:** HA's header and sidebar are always hidden when HomeView opens; a small Menu icon in front of the Home title brings them back (on phones and iPads it opens the sidebar too, so Settings is one tap away).
- **Touch-first:** tap toggles, hold opens the details — a room's tile toggles its lights and
  holding it opens the room's details page (✕ top right or Esc: back to where you were). Swipe left
  / right between pages, one page per swipe, from anywhere on the page (a slider or fader keeps its
  own drag).

> Status: **0.8 (preview)**. The layout and config keys may still change before 1.0.
> Use at your own risk — see [Disclaimer](#disclaimer).

## Contents

[Pages](#pages) · [A real home, fine-tuned](#a-real-home-fine-tuned) · [What you need](#what-you-need) · [Install](#install) · [Create the dashboard](#create-the-dashboard) · [Options at a glance](#options-at-a-glance) · [Report a problem](#report-a-problem) · [Credits](#credits) · [Disclaimer](#disclaimer) · [Development](#development) · [License](#license) · [Configuration reference](docs/configuration.md)

## Pages

| Page | What's on it |
|---|---|
| **Widgets** | One tinted panel that fills the screen: a big date with sunrise / sunset, a big analog clock, the forecast, the week's agenda and a **photo slideshow** from a media folder (sample photos until you add your own). On a phone: date and clock side by side, the photo, then up next |
| **Home** | One screen, like a hand-made dashboard: date, title, **control chips** (alarm, garage, locks, water valve — red with a word when something needs attention), people, and the **status pills** top right (alarm, climate, power now, lights on, locks, doors & windows, leaks / smoke, batteries, now playing, plus your pages' own pills); weather (2×2), air quality (2×1), two doors (front lock, garage), a camera (2×1), *Lights* for the two main rooms (tap = all on / off, hold = the room); your scenes; then a clock and the next event (2×1) |
| **Living** | The living spaces everyone shares — living room, kitchen, dining, family room, garage … — each in its own colour with its lights, climate, locks, covers, fans and media. Bedrooms, bathrooms and outdoor areas are left out (they have their own pages). Choose the rooms with `living_rooms` |
| **Rooms** — a page per person | One page for each family member (Alex, Zoe, Mia …), found from your `person` entities: their room's temperature, comfort, humidity, doors and windows, its devices, their next event and where they are. Automatic for everyone with a room named after them ("Bedroom Zoe"); `members` sets who and in what order. Each person sees only their own page unless `access` says otherwise (admins see all) |
| **Room pages** | A room's details — hold a room's tile or title: *Right now* (temperature, comfort, humidity, its doors and locks), quick tiles (all its lights on / off, presence, power now), 24-hour charts (temperature, humidity, light level), then everything in the room: lights, climate, doors & security, media, devices, scenes, cameras, sensors |
| **Energy** | Opened from the Energy pill (or in the page bar). A live flow diagram; *right now* (solar, home with amps · volts, grid importing / exporting, battery charging / discharging); **backup time** on battery; **off-grid share in your peak hours** (optional time windows); **solar self-sufficiency**; today's totals; and a **power-outage list** of every device with W · A · kWh today and an on / off button (admins; it asks first) — tick what to turn off when the grid goes down ([Power outages](docs/configuration.md#power-outages)). The flow is [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus) when it's installed (HomeView's own otherwise), with HomeView's number format ("3.0 kW") and the grid in red with "Grid down" in an outage; the numbers are live between meter readings |
| **Cameras** | Every camera, refreshed every 10 s while on screen. Up to nine fill one tablet or browser screen (up to 3 across, 16:9, no scrolling); more, or a phone: a grid that scrolls. An offline camera says so (amber badge, "Offline"). Tap for the live stream |
| **All rooms** *(optional)* | A directory of every room (by floor). Add `all_rooms` to `pages`. It's also what `rooms` shows in a home without member rooms |
| **People** *(optional)* | Everyone with home / away, since when and phone battery, plus the family calendar. Add `people` to `pages` to use it |
| **Your pages** | As many as you like, with your own tiles and any Home Assistant card |

The pages come in this order, and swiping past the last one wraps back to Widgets.
**On a phone** every page follows a hand-made iPhone HomeView: a big title (*Hi <your name>* on
Living and each person's page, with a strip of six favourites), compact one-line tiles two
across, each room starting with a slim bar (name, comfort, temperature · humidity), wide tiles
(weather, air, camera, next event) across the full width, no clock. Status pills are on Home only, under the chips
(top right on tablets and in a browser). On every screen anything that needs attention comes first (red,
then amber), and the pills **wrap onto as many lines as they need**; on a phone the chips and people
share one row. Nothing on Home scrolls sideways, so a sideways swipe anywhere there changes the page.
**Home on a phone puts the
controls first** — favourites and Lights, then the scenes two to a row, then the weather (one compact
line), camera, next event and air quality — and **phones open on Home** (tablets on the first page,
Widgets); `start:` changes that.
Favourites: `phone_favorites: [light.kitchen, …]` or per person
`{ alex: [...], zoe: [...] }` (default: the main rooms' lights, then the locks).

Pages that have nothing to show (no cameras, no energy set up …) are left out.

The pills open a sheet with the matching devices, for example every light that's on or every
open door, and you can control them right there. Locks, doors & windows, leaks and batteries list
what needs a look first, in groups (Open · Offline · Closed). Energy opens the Energy page; a page's
own pill (Pond, …) opens that page. A pill names the one thing that needs a look ("Back Door open",
"Side Door offline", "Kitchen Leak") and counts several ("2 open", "2 locks offline", "1 battery
low · 1 offline"); the thermostat's pill is the temperature, with what it's doing while it runs
("70° · Heating").

**Tile shapes fit the screen.** Phones get two columns of 64 px rows. On tablets and in a browser:
- **Columns:** a page's own count (5 or 6), but tiles stay between 110 and 300 px wide.
- **Row height:** 4 rows fit on one screen, keeping each tile between square and 1.35 : 1. A tall
  screen (a portrait iPad) gets square tiles and scrolls. A wide one (Pixel Tablet, landscape iPad,
  laptop) gets wider tiles, so the 4 rows fit. A row is never under 88 px, two touch targets.
- **Inside a tile,** text and icons scale with its size.
- **Energy** keeps rows of 176–210 px for its text-heavy tiles.
- **Widgets** fills the screen edge to edge.
- **A desktop browser window taller than wide** (no touch screen, at least 1000 px wide) lays out
  like a landscape tablet: the rows fit a height of width ÷ 1.6, so a 1280 px wide window gets the
  same columns and tile shape as a 1280 × 800 tablet, and Widgets keeps its landscape board at the
  top. `desktop_layout: fill` uses the whole window height instead. Touch screens (a portrait iPad)
  aren't affected.

`rows_on_screen: 5` (or `{ home: 4, living: 5 }`) changes how many rows should fit;
`tile_size` / `max_columns` still override the columns.

**Away from its room a tile says where it is.** Home's favourites, the pills' sheets and the
phone favourites show the state and the room: the front lock reads "Front Door" over "Locked ·
Entry", and two "Leak Battery" rows become "Leak Battery · Kitchen" and "Leak Battery · Bathroom".
In a room (its page, a Living row, a person's page) the room is left out, as before.

**A device that's offline keeps its place** (Home's favourites and chips, Living, a person's page,
the phone favourites), with an amber **!** on its icon and the word "Offline": the house never looks
fine just because something stopped answering. Tap it for its details. A scene or button that has
never run isn't offline.

**Who's home:** under Home's title someone who's home has a green ring; someone away is faded, with a
small location pin (not just a missing ring). A person's page says where they are by its title
("● Home", or "Away · 2 h") and, under it, when their tracker last reported a location ("located
2:12 AM"). Older than an hour (`location_stale_minutes`) it turns amber, "location from 2:12 AM": a
phone can sit on an old fix for hours, and "Home" alone wouldn't show it. Person tiles elsewhere
show it only then. Room summaries show the temperature once, big, and below it how the room
feels and its humidity. Home's weather tile names your home instead of repeating the time and date
(the header has the date, the clock the time). The next event reads "Up next · <calendar>"; tap it
(or the Widgets page's Up next) for the next 30 days of events, by day, and hold it for Home
Assistant's calendar dialog (`calendar_days`).

**Rooms:** a room's tile (and its bar on a phone) has a small **›** top right that opens the room's
details page; a tap anywhere else still switches its lights, and a hold still opens the page.

## A real home, fine-tuned

What HomeView builds for one real family home, from its own Home Assistant and its HomeView settings
(favourites, `customize`, a few sections and pages of its own): no hand-made dashboard, just the
strategy and its config. Use it as ideas for your own fine-tuning. Camera pictures, photos, calendar
and school details are blurred, family and place names are changed, and the security page is shown in
part, for privacy.

### Liquid Glass

Glass is HomeView's look since 0.10 (`style: classic` brings back the solid one): a soft wallpaper in
each page's colours, translucent tiles, lit tiles that glow, and on Widgets the photo's colours behind the
clock. On the family's wall tablet (a Pixel Tablet, 1280 × 800, full screen), light and dark:

| Light | Dark |
|---|---|
| ![Widgets in glass, light: big date, analog clock, the photo frame, Up next and the weather on clear panes over the photo's colours](docs/screenshots/glass-widgets-light.webp) | ![Widgets in glass, dark](docs/screenshots/glass-widgets-dark.webp) |
| ![Home in glass, light: control chips, status pills, weather, air quality, camera, doors, lights, clock and the next event](docs/screenshots/glass-home-light.webp) | ![Home in glass, dark](docs/screenshots/glass-home-dark.webp) |
| ![Living in glass, light: every shared room in its own colour, with its devices](docs/screenshots/glass-living-light.webp) | ![Living in glass, dark](docs/screenshots/glass-living-dark.webp) |
| ![Energy in glass, light: live flow, right-now cells, backup time and off-grid shares](docs/screenshots/glass-energy-light.webp) | ![Energy in glass, dark](docs/screenshots/glass-energy-dark.webp) |
| ![A pill's pop-up in glass, light: the Locks sheet over the blurred page](docs/screenshots/glass-locks-light.webp) | ![A pill's pop-up in glass, dark](docs/screenshots/glass-locks-dark.webp) |

### On a phone

The same home on an iPhone: Home first, then Living, a person's page and Energy.

| Home | Living | A person's page | Energy |
|---|---|---|---|
| ![Home on a phone: chips, status pills, favourites, weather and the camera](docs/screenshots/phone-home.webp) | ![Living on a phone: favourites, then each room with its devices](docs/screenshots/phone-living.webp) | ![A person's page on a phone: their location, their room and its devices](docs/screenshots/phone-person-mia.webp) | ![Energy on a phone: the live flow and the right-now cells](docs/screenshots/phone-energy.webp) |

### A room and your own pages

A room's page (hold its tile or title): right now, the last 24 hours and every device in the room. And
pages made with `custom_pages` and your own tiles: a security page (the alarm's modes, what's open, the
cameras), an admin page of the home's own settings (the dashboard's look and face, modes, climate control
and each room's comfort, each a tap on an HA helper or script) and a media room (karaoke controls, a TV
remote, effect presets and mixer levels).

| A room | Security |
|---|---|
| ![A room's page in glass, light: right now (temperature, its door and lock, comfort, humidity), its lights, presence and power, the last 24 hours, then the room's devices](docs/screenshots/glass-living-room-light.webp) | ![A security page in glass, light: the alarm's modes, open sensors and the door, and the cameras](docs/screenshots/glass-security-light.webp) |

| Admin | Media |
|---|---|
| ![Admin: the dashboard's look and face, modes, climate control and every room's temperature, humidity and comfort](docs/screenshots/glass-admin-light.webp) | ![Media: karaoke controls, TV remote, effect presets and mixer levels](docs/screenshots/glass-media-light.webp) |

## What you need

**Required:** Home Assistant, and its community store to install from: the built-in
**Marketplace** on Home Assistant 2026.11 and newer, [HACS](https://hacs.xyz) on older versions (or a
manual install, below). That's all: HomeView draws every tile itself, so there are **no other cards** to
install.

**Optional, from the Marketplace / HACS:**

| Card | Type | What it adds |
|---|---|---|
| [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus) | Dashboard | The animated energy flow on the Energy page. Without it HomeView draws its own (`energy.flow_card: homeview` keeps HomeView's even when it's installed) |

**Don't combine with** (HomeView already does these):

| Card | Why |
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
| Power-outage list | A **switch** for each device in *Individual devices*, and a grid-status sensor. Plus the optional [blueprint](docs/configuration.md#power-outages) | Settings → Dashboards → Energy |
| Alarm chip and pill | Any **alarm panel** (e.g. [Alarmo](https://github.com/nielsfaber/alarmo) from HACS, or your alarm's integration) | Settings → Devices & services |
| Air quality tile | An AQI / PM2.5 / CO₂ / VOC **sensor** | — |
| Photo slideshow | A folder of photos in **Media** (My media, or a network share) | Media → My media |
| Update icon | The update entity the Marketplace / HACS makes for HomeView (automatic once installed from there) | — |

**Internet:** until you add your own, the slideshow shows sample photos from
[picsum.photos](https://picsum.photos), and people without a picture get avatars from
[DiceBear](https://www.dicebear.com). `widgets: { slideshow: false }` and `avatars: initials`
turn those requests off. Nothing else leaves your network.

## Install

### Home Assistant 2026.11 and newer: the Marketplace

1. Settings → **Marketplace** → *Browse*, find **HomeView** (type *Dashboard*) and install it. Not listed?
   Add `https://github.com/nexhenry/homeview` as a custom repository (type *Dashboard*) from the
   Marketplace's ⋮ menu, then install it.
2. Reload the browser. The Marketplace registers the dashboard resource for you
   (`/hacsfiles/homeview/homeview.js`, JavaScript module); nothing to add by hand.

### Older Home Assistant: HACS

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/nexhenry/homeview`, type **Dashboard**.
2. Install **HomeView** and reload the browser (HACS registers the resource).

### Manual

1. Copy `dist/homeview.js` to `<config>/www/homeview/homeview.js`.
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/homeview/homeview.js?v=1.0.1` as a
   *JavaScript module*. (With `lovelace: resource_mode: yaml`, add it under `lovelace: resources:` in
   `configuration.yaml` and restart Home Assistant.)

### Updates

The Marketplace (or HACS) checks for new versions by itself. When one is out you'll see it in Home
Assistant's **Settings** (a badge, and the update under *Updates*), in the Marketplace / HACS, and, for
admins, as a small ⬆ icon in front of the Home page's title: tap it for what's new and the **Update**
button. Don't want it? `update_notice: false`.

**The resource and browsers' caches.** Use `/hacsfiles/homeview/homeview.js` (JavaScript module) — the
plain address, no version: Home Assistant serves it with revalidation, so after an update every screen gets
the new file on its next load. Avoid `/local/community/homeview/homeview.js` without a version: `/local/`
is cached by browsers for a month, so screens would keep the old version after an update. A manual install
under `/local/` needs the `?v=` and a bump with each update. If a screen still runs the old version, HomeView says so
(*"… is installed, but this screen still runs …"*) behind a ↻ icon: tap it to reload. Otherwise a hard
reload (Ctrl/Cmd+Shift+R), or in the Companion app Settings → Companion App → Debugging → **Reset frontend
cache**. **Behind Cloudflare or another caching proxy,** add a rule so it never caches card files (on
Cloudflare: Caching → Cache Rules → *URI Path starts with* `/hacsfiles/` **or** `/local/` → **Bypass
cache**), and purge the file once if the proxy already holds an old one.

## Create the dashboard

Settings → Dashboards → **Add dashboard** → pick **HomeView** → name it → **Create**. That's it —
HomeView builds the pages.

<details><summary>HomeView isn't in the list, or you prefer YAML</summary>

Add a dashboard *from scratch*, then ⋮ → **Edit dashboard** → ⋮ → **Raw configuration editor**, replace
everything with the lines below and save. (Not in the list usually means the browser hasn't loaded
HomeView yet: reload it.)

```yaml
strategy:
  type: custom:homeview
```
</details>

**"Error: Timeout waiting for strategy element ll-strategy-dashboard-homeview"** means the browser never
loaded `homeview.js`. Check, in order: Settings → Dashboards → ⋮ → **Resources** (turn on *Advanced
mode* in your profile if the menu is missing) lists `/hacsfiles/homeview/homeview.js` as a *JavaScript
module* — add it if not, or under `lovelace: resources:` with `resource_mode: yaml`; opening that address
in the browser shows the file (a 404: Marketplace → HomeView → ⋮ → **Redownload**); then a hard reload or,
in the app, **Reset frontend cache**. Still stuck? The browser console's red line about `homeview.js` says
why — put it in an issue.

HomeView generates the pages each time the dashboard opens, so it follows your home as it
changes: a new light in the kitchen appears on the Kitchen page by itself.

## Options at a glance

HomeView works with no options at all. The ones people change first (all of them, with defaults and
examples: [configuration reference → All options](docs/configuration.md#all-options); a commented file
with every option: [`examples/full.yaml`](examples/full.yaml)):

| Option | What it does |
|---|---|
| `pages` | Which pages, in swipe order (`widgets`, `home`, `living`, `rooms`, `energy`, `cameras` …) |
| `style` | `glass` (default since 0.10) or `classic`, or an entity that switches it ([Look](docs/configuration.md#look-glass-or-classic)) |
| `theme` | `auto` (follow Home Assistant), `light` or `dark` |
| `night` | The night face for a wall tablet in a dark room ([Night](docs/configuration.md#night)) |
| `kiosk` | Full screen: HA's header and sidebar hidden ([Full screen](docs/configuration.md#full-screen-kiosk-mode)) |
| `customize` | Per entity: name, icon, size, tap / hold, confirm, hidden |
| `exclude_entities` | Leave entities out (ids, globs, labels, integrations) |
| `home` / `pills` / `warnings` | What Home shows: favourites, the status pills and their rules |
| `energy` | The Energy page and the power-outage list ([Power outages](docs/configuration.md#power-outages)) |
| `custom_pages` | Your own pages and tiles ([Your own tiles, cards and pages](docs/configuration.md#your-own-tiles-cards-and-pages)) |
| `guest` | The guest view on a shared screen ([Guest view](docs/configuration.md#guest-view)) |
| `screensaver` | The clock after a while, or a page to open (`widgets`) |

Change them on the dashboard itself (double-tap the title: [Make it yours](docs/configuration.md#make-it-yours)),
in the settings editor, or in YAML.


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
./scripts/test.sh                  # headless tests: the code, and the option schema against the code and the docs
./scripts/gen-docs.sh              # the option tables and examples/full.yaml, from schema/options.json
node scripts/check-config.mjs .storage/lovelace.<dashboard>   # a config's unknown keys and odd values
```

**A new option** gets a row in [`schema/options.json`](schema/options.json): its type, default, the
version it came in, what it does and an example. `scripts/gen-docs.sh` writes the tables under
[All options](docs/configuration.md#all-options), the key tables in `custom_pages/README.md` and `examples/full.yaml` from
it. The tests fail when the code reads an option (or a key inside one) that has no row, or when the
docs weren't regenerated. At a release, `scripts/gen-docs.sh --stamp X.Y.Z` turns "next" into the
version.

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
