# HomeView

An Apple-Home-style dashboard for Home Assistant that **builds itself from your home**.

HomeView reads your areas, floors, devices and entities and generates a complete dashboard —
Home, Widgets, Family, Rooms (plus a page for every room), Energy and Cameras — that works on
an iPhone, an iPad, a wall tablet and a desktop browser. Add a device to an area and it shows up;
no YAML per tile.

- **Zero setup:** one line of config. Rooms, people, calendars, weather, cameras and energy
  are found automatically.
- **No other cards needed:** HomeView draws its own tiles. You don't need button-card,
  card-mod, layout-card or anything else from HACS.
- **One dashboard for every screen:** 2 columns on a phone, 4 on an iPad in portrait, 6 on a
  tablet in landscape, up to 8 on a desktop.
- **Light and dark:** follows your Home Assistant theme, each page and room with its own tint.
- **Touch-first:** tap toggles, hold opens the details. Swipe left / right between pages.

> Status: **0.1 (preview)**. The layout and config keys may still change before 1.0.

## Pages

| Page | What's on it |
|---|---|
| **Home** | Date and title, status pills (alarm, climate, lights on, locks, doors & windows, leaks / smoke, batteries, now playing), people, the weather, the next calendar event, a clock, your favourites (alarm, locks, garage doors, thermostat — or your own list), every room and your scenes |
| **Widgets** | Big date with sunrise / sunset, an analog clock, the forecast, the week's agenda, a camera — made for a wall tablet |
| **Family** | Each person: home or away, since when, their phone's battery. The family calendar for the next two weeks |
| **Rooms** | Every room in its own colour with its lights, climate, locks, covers, fans and media. Tap a room for its page |
| **Room pages** | Everything in the room, grouped: lights, climate, doors & security, media, devices, scenes, cameras, sensors |
| **Energy** | Right now (solar, home, grid, battery), today's totals and self-sufficiency, and the devices that used the most today — all from your Energy dashboard settings |
| **Cameras** | Every camera, refreshed every 10 s while on screen. Tap for the live stream |

Pages that have nothing to show (no cameras, no energy set up …) are left out.

The pills open a sheet with the matching devices, for example every light that's on or every
open door, and you can control them right there.

## Install

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/nexhenry/homeview`, type
   **Dashboard**.
2. Install **HomeView** and reload the browser.

### Manual

1. Copy `dist/homeview.js` to `<config>/www/homeview/homeview.js`.
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/homeview/homeview.js` as a
   *JavaScript module*. (With `lovelace: resource_mode: yaml`, add it under
   `lovelace: resources:` in `configuration.yaml` instead.)

## Create the dashboard

1. Settings → Dashboards → **Add dashboard** → *New dashboard from scratch*, name it, open it.
2. ⋮ → **Edit dashboard** → ⋮ → **Raw configuration editor**, replace everything with:

   ```yaml
   strategy:
     type: custom:homeview
   ```

3. Save. That's it.

HomeView generates the pages each time the dashboard opens, so it follows your home as it
changes. To change something, edit the strategy options below (not the generated views).

### Make it look like an app

HomeView works with HA's normal header. On a wall tablet or a phone's home-screen app you may
want the header and sidebar gone: [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) does
that, and HomeView's own swipe moves between pages.

## Configuration

Everything is optional.

```yaml
strategy:
  type: custom:homeview
  title: Our Home                 # Home page title (default: your location name)
  theme: auto                     # auto | light | dark
  pages: [home, widgets, family, rooms, energy, cameras]   # which pages, in this order
  pages_config:                   # per page: title, icon, color
    home: { color: orange }
    rooms: { title: House, icon: mdi:floor-plan }

  # rooms (areas)
  room_order: [living_room, kitchen, bedroom]   # area ids first, the rest after
  hide_rooms: [garage_attic]
  rooms:
    living_room:
      name: Lounge
      icon: mdi:sofa
      color: blue                 # a name (red orange amber yellow lime green teal cyan blue
                                  # indigo purple pink brown gray) or a hue 0-360
      temperature: sensor.living_room_temperature
      humidity: sensor.living_room_humidity
      entities: [light.lounge, media_player.tv]   # show these (in this order) first
    shed: { hidden: true }

  # what to show
  exclude_entities: [switch.child_lock, light.status_led]
  people: [person.anna, person.ben]              # default: everyone with a phone / tracker
  calendars: [calendar.family]                   # default: all calendars
  weather: weather.home                          # default: the first weather entity
  cameras: [camera.front_door, camera.garden]    # default: all cameras

  home:
    favorites: [alarm_control_panel.home, lock.front_door, cover.garage, climate.hallway]
    rooms: true                   # the room tiles on Home
    scenes: true
    max_scenes: 8

  pills: [alarm, climate, lights, locks, openings, safety, batteries, media]   # or false
  battery_low: 20                 # % under which a battery counts as low
  people_chips: true              # the avatars under the Home title

  energy:                         # live power, when the Energy settings don't say
    solar_power: sensor.solar_power
    grid_power: sensor.grid_power         # + import / − export
    battery_power: sensor.battery_power   # + discharge / − charge
    battery_level: sensor.battery_level
    home_power: sensor.home_power         # default: solar + grid + battery
    devices: 12                           # how many devices under "Devices today"

  # layout
  tile_size: 175                  # smallest tile width in px (default 150 on phones, 175 above)
  max_columns: 8
  swipe: true                     # swipe between pages
```

### What goes where

- **Rooms** are your Home Assistant **areas**. An entity belongs to a room through its own
  area or its device's area. Floors (if you use them) set the room order.
- An entity is **left out** when it is hidden, disabled, or a configuration / diagnostic entity
  (battery sensors are still counted for the Batteries pill). Add anything else you don't
  want to `exclude_entities`.
- A room's **temperature / humidity** is the area's own setting (Settings → Areas), else the
  first temperature / humidity sensor in it.
- **Energy** uses Settings → Dashboards → Energy: grid, solar, battery and individual devices.
  Live power comes from the power sensors you set there, or from `energy:` above.

### Taps

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

## Development

There is no build step: `dist/homeview.js` is the source, a plain ES module.

```sh
./scripts/check.sh                 # syntax check (Node, or Docker's node image)
```

Try a change on your own Home Assistant by copying `dist/homeview.js` over the installed file
and reloading the browser (bump `?v=` on the resource if it is cached).

Ideas and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
