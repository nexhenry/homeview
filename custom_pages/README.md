# Custom pages

HomeView builds most pages by itself. A **custom page** is one you write yourself: a YAML file
with your own tiles and cards. You can keep it, share it, or use someone else's. This folder
has a fully annotated starter and four ready-made pages:

| File | Page | Opened by | What to change |
|---|---|---|---|
| [`sample.yaml`](sample.yaml) | Sample | — (a starter: every option, explained) | everything |
| [`media.yaml`](media.yaml) | Media | **hold the TV tile** | `vars:` (TV, remote, soundbar, speakers) |
| [`energy-history.yaml`](energy-history.yaml) | Energy History | **hold the Energy pill** | nothing: it uses your Energy settings |
| [`pond.yaml`](pond.yaml) | Pond | **tap its own Pond pill** (`pill:` in the file) | `vars:` (pumps, filter, UV, light, water) |
| [`admin.yaml`](admin.yaml) | Admin (admins only) | **hold the Home title** | `vars:` (modes, actions, automations) |
| [`days-off.yaml`](days-off.yaml) | Days off (a popup) | **tap a tile** with `tap: days-off` | `vars:` (calendar, the words that mean a day off) |
| [`dashboard.yaml`](dashboard.yaml) | — | — | the dashboard that loads them, with those holds |

## One name per page

Each page uses **one word everywhere**. It's the file name, the `path:`, and the word a `hold:`
uses to open the page:

```
custom_pages/media.yaml   →   path: media   →   customize: { media_player.tv: { hold: media } }
```

So you always know which file a hold opens. Paths are lower case, with `-` between words
(`energy-history`), and must not clash with HomeView's own pages (`home`, `widgets`, `living`,
`rooms`, `energy`, `cameras`, `people`, `room-…`, `member-…`).

## Set up Home Assistant (once)

Page files live in a folder. That needs a dashboard **in YAML mode**: a dashboard made in the UI
can't read files. You keep your UI dashboard as it is, and add the YAML one next to it.

**1. The folder.** Create `/config/homeview/` with a `custom_pages/` folder inside it. Use the
*File editor* or *Studio Code Server* add-on, Samba, or SSH:

```
/config/
├── configuration.yaml
└── homeview/
    ├── dashboard.yaml          ← the dashboard
    └── custom_pages/           ← one file per page
        ├── energy-history.yaml
        ├── media.yaml
        ├── pond.yaml
        └── admin.yaml
```

**2. The dashboard.** Copy [`dashboard.yaml`](dashboard.yaml) to `/config/homeview/dashboard.yaml`.
Its key line is:

```yaml
custom_pages: !include_dir_list custom_pages   # every .yaml file in custom_pages/, in name order
```

Already have HomeView set up in the UI? Open that dashboard → ⋮ → **Edit dashboard** → ⋮ →
**Raw configuration editor**. Copy everything under `strategy:` into `dashboard.yaml`, and keep
the `custom_pages:` line above.

**3. Register it** in `configuration.yaml`, then restart Home Assistant once:

```yaml
lovelace:
  dashboards:
    home-view:                       # the address: /home-view (it needs a "-")
      mode: yaml
      filename: homeview/dashboard.yaml
      title: Home
      icon: mdi:home
      show_in_sidebar: true
```

HACS has already added `homeview.js` under **Settings → Dashboards → Resources**. Those
resources apply to YAML dashboards too, so there's nothing more to add.

**4. Make it yours.** Copy the pages you want into `custom_pages/`. Change each page's `vars:`
block to your own entity ids (**Developer tools → States** lists them). Then remove the holds in
`dashboard.yaml` for pages you didn't copy.

## Add, edit or share a page — no restart

1. Save the file in `/config/homeview/custom_pages/`.
2. In HomeView, **double-tap the page title** (edit mode, admins) → **Reload pages**, next to Settings.

Home Assistant reads the dashboard's files again. Every screen showing this dashboard, such as a
wall tablet or a phone, updates by itself within a second or two.

Why the button: Home Assistant keeps a YAML dashboard in memory. It reads the files again only
when the dashboard file itself changes, so a new or edited page file isn't noticed until that
happens. HACS isn't involved either: it only installs and updates `homeview.js`, and your page
files are your own config. **Reload pages** is Home Assistant's own ⋮ → *Refresh*, which
HomeView's full screen hides. Editing `dashboard.yaml`, then reloading the browser, works too.

**Sharing:** send the file. The person who gets it changes only the `vars:` block and drops the
file into their own `custom_pages/`. If an entity in a page doesn't exist on their Home
Assistant, the page shows admins a note naming it, for example *Page “media”: this entity isn't in
Home Assistant — remote.living_room_tv*.

**A YAML mistake** (a bad indent, a missing `:`) is the one thing HomeView can't catch. Home
Assistant shows an error in place of the whole dashboard until the file is fixed. Your UI
dashboard is unaffected. Check a file with a YAML checker, or **Developer tools → YAML → Check
configuration**, before you reload.

## Writing a page

```yaml
path: media                  # address and name: the same as the file name
title: Media                 # the title at the top
icon: mdi:television         # its icon in the page bar
color: indigo                # a colour name (orange, green, blue, teal, purple, pink, amber …) or a hue 0–360
subview: true                # not in the page bar: opened by a hold, with a back arrow
admin_only: false            # true: only viewers who see every page (admins, or access: all)
pills: false                 # true: the status pills, as on Home
pill: { entity: media_player.living_room_tv, name: TV }   # optional: this page's own pill on Home
hold: another-page           # hold this page's title to open another page (optional)
columns: 6                   # optional: tiles per row on tablets (5 by default)
show_room: false             # optional: tiles show their state ("On · 0.72 kW"), not their room
alerts:                      # optional: warnings at the top of the page, and on its pill
  - { text: Pump off, level: critical, not_on: switch.pump }

vars:                        # the entities the page uses: the only part to change
  tv: media_player.living_room_tv
  speakers: [media_player.kitchen, media_player.bedroom]

sections:
  - title: TV                # optional heading
    color: blue              # optional colour for this section
    tiles:
      - $tv                                          # an entity
      - { entity: $tv, name: TV, size: 2x1 }         # with a name / icon / size
      - $speakers                                    # a list: one tile each
      - { card: { type: media-control, entity: $tv }, size: 3x2 }   # any Lovelace card
```

**`vars:`.** Write `$name` anywhere in the page and it's replaced by that var. A var that's a
list stays a list, so `entities: $speakers` works, and a list inside `tiles:` adds one tile per
entity. That makes a page easy to share: everything house-specific is at the top.

**Tiles**:

| Tile | Example |
|---|---|
| An entity | `light.kitchen` or `{ entity: light.kitchen, name: Island, icon: mdi:x, size: 2x1 }` |
| A room | `{ type: room, area: kitchen }` |
| A HomeView widget | `{ type: clock }` · `weather` · `forecast` · `date` · `next_event` · `agenda` · `camera` · `person` · `chart` (a 24-hour graph of `entity`) |
| A filtered calendar | `{ type: agenda, calendars: [calendar.school], match: 'no school\|break', all_day: true, days: 300, layout: list }`: only the events whose title matches, one row each with its dates and length (`strip:` removes text from titles; `join_weekends: true` adds the weekend right before or after a day off and joins breaks that then touch, so a Monday off runs Sat–Mon; `long_icon` / `event_icon`). `next_event` takes the same `match` / `all_day` / `days`, plus `title` / `icon` |
| Any Lovelace card | `{ card: { type: history-graph, entities: [sensor.x] }, size: full x 2 }`. Includes HACS cards and the Energy cards (`energy-usage-graph`, `energy-date-selection` …) |

`size` is *columns* x *rows*: `1x1`, `2x1`, `3x2`. `full` is the page's width and `half` is half
of it, so `full x 3` is the full width and 3 rows tall. Sizes shrink to fit on phones.

`phone_size` sets a tile's size on phones yourself: 2 columns, rows of 64 px. For example,
`phone_size: 2x5` gives a graph the full width and 320 px. Without it, HomeView works the size
out from `size`, which can leave a short card with a lot of empty space.

## Sections and tiles for control pages

For pages like a pond, a mixer or a TV remote (see [`pond.yaml`](pond.yaml) and
[`media.yaml`](media.yaml)):

| Section option | What it does |
|---|---|
| `layout: pills` | The tiles as small pills in a row: an entity's icon and name (sensors: and their value), lit while on |
| `layout: keypad` + `columns: 4` | Icon buttons in a grid, e.g. a TV remote. `.` in `tiles:` leaves a key empty |
| `layout: faders` | Sliders, two per row on tablets |
| `layout: rows` | A list, one row per tile |
| `width: half` | Two sections side by side on tablets (stacked on phones) |
| `icon: mdi:x` | An icon before the section's title |

| Tile | Example |
|---|---|
| A button | `{ type: button, name: Plex, icon: mdi:plex, color: orange, action: script.tv_source, data: { source: Plex }, watch: input_select.tv_source, when: Plex }`: tap runs `action` (a script or any service, with `data` and `target`), or toggles `toggle: <entity>`. It's lit in `color` while `watch` is `when` (`attribute:` watches an attribute instead, e.g. a TV's `source`), or while `toggle` is on. `name_off` / `icon_off` while it isn't lit; `dim: <entity>` shows a lit button as an outline while that entity is off; `confirm: true` asks first; `hold:` a page or `{ action, data, target }` |
| A fader | `{ type: fader, entity: input_number.music, mute: input_boolean.music_muted, name: Music, icon: mdi:music, color: green }`: slide to set the level (`input_number` or `number`); tap the icon to mute. Muted faders are grey with **MUTED** |
| An entity, with its power | `{ entity: switch.pump, power: sensor.pump_power, confirm: true }`: "On · 0.72 kW" while it draws power; `confirm` asks before switching |
| A value in kW | `{ entity: sensor.pond_power, unit: kW }` in a pill row (W, kW or MW) |

**`alerts:`** (page option). Each entry is a warning that shows while it's true:
`all_off: [ids]` (every one off), `on: id`, `off: id`, or `not_on: id` (anything but on; `text_offline`
when it isn't reporting). Write `'on'` in quotes: a bare `on` is YAML for true. `level: critical`
gives a red, pulsing banner; `level: notice` an amber one. The page's own pill on Home follows them,
red or amber, like the other pills.

**A page's pill:** `pill: { entity: sensor.pond_power, name: '', icon: mdi:fish, unit: kW }`
shows the icon and "1.02 kW". `name: ''` leaves out the name.

## Taps and holds

`tap:` and `hold:` take a **page path** (open that page), `more-info` (the details), `toggle`,
or `none`. Leave them out for HomeView's usual tap and hold (see *Taps* in the main README).

| Hold this… | Set in `dashboard.yaml` |
|---|---|
| An entity's tile, on every page where it appears (the TV) | `customize: { media_player.living_room_tv: { hold: media } }` |
| …a TV that's a switch (an IR or smart-plug TV) | `customize: { switch.living_room_tv: { hold: media } }`. Use whatever entity your TV tile shows |
| One tile on a custom page | `{ entity: media_player.living_room_tv, hold: media }` |
| A status pill (Energy) | `pills: [..., { pill: energy, hold: energy-history }, ...]` |
| A page's own pill (Pond) | In the page file: `pill: { entity: sensor.pond_water_temperature, name: Pond, icon: mdi:fish }`. It shows on Home for everyone who gets the page: tap = the page, hold = the entity's details. `pill: true` = a plain pill with the page's title and icon |
| A pill of your own | `pills: [..., { entity: sensor.x, name: X, icon: mdi:x, hold: some-page }]` |
| A page's title (Home) | `pages_config: { home: { hold: admin } }` (a custom page: `hold:` in its file) |

A pill of your own shows the entity's state, plus `name` in front if you set one. A tap opens
its details. `alert: [off]` turns the pill red in those states, for example a pump that should
always be running. When you list `pills:`, list every pill you want, because the list replaces
the default set: `alarm`, `climate`, `energy`, `lights`, `locks`, `openings`, `safety`,
`batteries`, `media`.

## A dashboard made in the UI

Without a YAML dashboard, a custom page goes straight into the dashboard's config. Open
⋮ → **Edit dashboard** → ⋮ → **Raw configuration editor**, and paste the page under
`custom_pages:`, indented as one list item:

```yaml
strategy:
  type: custom:homeview
  custom_pages:
    - path: media
      title: Media
      subview: true
      vars: { tv: media_player.living_room_tv }
      sections:
        - tiles: [$tv]
```

Holds, `vars:` and everything else work the same. Only the page files need the YAML dashboard.
On a YAML dashboard, edit mode and Settings still save: HomeView keeps those changes in a hidden
`<dashboard>-edits` dashboard and lays them over the YAML. The page files stay in charge of the
pages.
Saving in the editor updates the dashboard right away; **Reload pages** brings other open screens up
to date.
