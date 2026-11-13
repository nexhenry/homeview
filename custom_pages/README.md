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
| A HomeView widget | `{ type: clock }` · `weather` · `forecast` · `date` · `next_event` · `agenda` · `camera` · `person` · `chart` (a 24-hour graph of `entity`) · `air` · `energy_now` / `energy_flow` (the live power, from your Energy settings) |
| A filtered calendar | `{ type: agenda, calendars: [calendar.school], match: 'no school\|break', all_day: true, days: 300, layout: list }`: only the events whose title matches, one row each with its dates and length (`strip:` removes text from titles; `join_weekends: true` adds the weekend right before or after a day off and joins breaks that then touch, so a Monday off runs Sat–Mon; `long_icon` / `event_icon`). `next_event` takes the same `match` / `all_day` / `days`, plus `title` / `icon` |
| Any Lovelace card | `{ card: { type: history-graph, entities: [sensor.x] }, size: full x 2 }`. Includes HACS cards and the Energy cards (`energy-usage-graph`, `energy-date-selection` …) |
| A card with "Show all" | `{ card: { type: energy-devices-graph, max_devices: 10 }, more: { max_devices: null, modes: [bar] }, more_label: 'More ({energy_devices})', less_label: Top 10, legend_more: false }`: a button on the card switches to the `more:` settings (`null` removes one) and back. `{energy_devices}` in a label is how many devices your Energy settings track ("More (41)"). `legend_more: false` hides a chart's own "More (n)" legend chip, so there's one way to see more |

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
`all_off: [ids]` (every one off), `none_on: [ids]` (none of them is on: off, offline or missing all
count, e.g. "both pumps off"), `on: id`, `off: id`, or `not_on: id` (anything but on; `text_offline`
when it isn't reporting). Write `'on'` in quotes: a bare `on` is YAML for true. `level: critical`
gives a red, pulsing banner; `level: notice` an amber one. The page's own pill on Home follows them,
red or amber, like the other pills.

A rule is never quietly "fine" when it can't be checked: if an entity in `all_off`, `on` or `off` is
offline (and the others don't already settle it), the page shows "<name> not reporting" in amber;
an entity Home Assistant doesn't have at all shows "Can't check: <your text>" (or your
`text_offline`). Admins also get a note when the page's `pill:` or `alerts:` name an entity Home
Assistant doesn't have.

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

## Conditions, patterns, times, confirm and defaults

Five options that make a page react to the house and save typing. They work in page files, in
`pages_config.<page>.sections` and in `rooms.<area>.sections`. Each is off until you write it.

### `show_when:` — only while something is true

On a **tile**, a **section**, a pill in `pills:`, or a page's own `pill:`. It follows the state live:
the tile appears and disappears as things change, without reloading the page.

```yaml
show_when: binary_sensor.rain_expected                   # the entity is on (a lock: unlocked, a cover:
                                                         # open, a person: home, media: playing)
show_when: { entity: vacuum.robot, state: [cleaning, returning] }   # its state is one of these
show_when: { entity: vacuum.robot, state_not: docked }   # any other state
show_when: { entity: sensor.outdoor_temperature, below: 32 }        # a number (above:, below:, or both;
show_when: { entity: sensor.outdoor_temperature, above: input_number.heat_limit }   # an entity's value too)
show_when: { entity: vacuum.robot, attribute: battery_level, below: 20 }   # an attribute instead of the state
show_when: { user: [alex, mia] }                         # who's looking: login name, person entity or user id
show_when: { admin: true }                               # admins only (false: everyone else)
show_when: { or: [binary_sensor.front_door, binary_sensor.back_door] }   # any of them
show_when: [binary_sensor.rain_expected, { admin: false }]               # a list: all of them (and: the same)
show_when: { not: input_boolean.guest_mode }             # not this
```

Write `state: 'on'` in quotes, or `state: on` (HomeView reads YAML's `on` / `off` as the words). A
missing entity reads `unavailable`, as in Home Assistant. Home Assistant's own visibility conditions
work too (`condition: state | numeric_state | user | screen | and | or | not`), so you can paste
them from a card. A section whose tiles are all hidden by theirs hides too. In edit mode everything
shows, the hidden ones faded. Hiding isn't security: the entity can still be reached elsewhere.

### Patterns — many entities at once

In a section's `tiles:` and in `exclude_entities`, besides an entity id:

| Pattern | Matches |
|---|---|
| `light.kids_room_*` | a glob: `*` any text, `?` one character |
| `{ domain: light, area: kitchen }` | a filter: every key you give must match; a list = any of it |
| `{ label: outdoor }` | an HA label, by its id or its name (a label on the device counts too) |
| `{ device_class: [door, window] }`, `{ integration: zha }`, `{ entity_id: 'sensor.*_battery' }` | by device class, by integration, by id |
| `{ domain: switch, not: 'switch.*_led' }` | `not:` leaves these out (an id, a glob or a filter) |

In tiles, `{ match: <pattern>, …tile options }` makes one tile per entity, sorted by name, each with
those options (`size`, `tap`, `confirm`, `show_when` …). (On an agenda or next_event tile, `match:`
stays what it was: a filter for event titles.) With `state:` / `state_not:` in the filter,
each tile shows only while its entity is in that state, live: a "blocking sensors" list.

```yaml
tiles:
  - 'switch.robot_*_selected'                                       # one tile each
  - { match: { label: garden_valves }, size: 2x1, confirm: true }
  - { match: { domain: binary_sensor, device_class: [door, window], state: 'on' } }   # only the open ones
```

Entities hidden in Home Assistant never match. Diagnostic and settings entities (a plug's LED, a
sensor's battery) only come in when you name them by id (a glob or `entity_id:`) or add
`diagnostic: true`. In `exclude_entities`, a pattern hides what it matches everywhere, like an id;
in edit mode those tiles are faded without the eye (the pattern decides). A pattern that matches
nothing gets a note for admins.

### `format:` and `attribute:` — times and attributes

On an entity tile or pill. `format:` shows a time from an `input_datetime`, a date, time or
datetime entity, a timestamp sensor, or an attribute that holds one:

| `format:` | Shows |
|---|---|
| `time` | 6:30 AM |
| `date` | Thu, Nov 13 |
| `datetime` | 6:30 AM today, else Thu 6:30 AM (this week) or Nov 20 6:30 AM |
| `relative` | in 2 hours · 5 minutes ago · tomorrow (in your language) |
| `until` | 2 h 5 min: the time left ("now" once it's passed) |
| `since` | 3 h 20 min: the time gone by |

A time of day alone (`06:30`) counts as the next one for `until` and `relative`, and the last one
for `since`. `relative`, `until` and `since` update by themselves every 30 seconds.

`attribute: <name>` shows an attribute instead of the state: `{ entity: vacuum.robot, attribute:
battery_level, unit: '%' }` → "85%". `attribute: last_changed` (or `last_updated`) is when the state
last changed: "5 minutes ago", or `format: since` for "5 min".

In `layout: pills`, an `input_datetime` (and date / time entities) is a value pill now, like an
`input_number`: "Wake 06:30", or with `format: time` "Wake 6:30 AM". A pill of your own in `pills:`
takes `format:` and `attribute:` too: `{ entity: input_datetime.wake_up, name: Wake, format: until }`.

### `confirm:` — ask first

On an entity tile, a chip, a `type: button`, or for an entity everywhere in `customize`:

```yaml
confirm: true                                  # every time
confirm: turn_on                               # only before switching it on (a lock: unlocking, a cover:
confirm: turn_off                              #   opening); turn_off: only before switching it off
confirm: Sound the front siren for 60 s?       # every time, with your question
confirm: { text: Sound the front siren?, only: turn_on, action: Sound }   # question, when, the button's word
```

`customize: { switch.siren: { confirm: … } }` asks wherever that entity can be switched: its tiles on
every page, the pills' pop-ups, a chip, a button that toggles it. A tile's or chip's own `confirm:`
wins. Locks, garage doors and gates ask before every switch anyway (as always; `tap: toggle` turns
that off): a `confirm:` on them gives the question your words.

The question goes with the gesture that switches the entity: the tap, or the hold with
`hold: toggle`. So `{ entity: switch.siren, tap: more-info, hold: toggle, confirm: turn_on }` opens the
details on a tap and asks before a hold sounds it; turning it off is one hold, no question.

### `defaults:` — options every tile of a section gets

```yaml
- title: Remote
  layout: keypad
  columns: 3
  defaults: { type: button, action: remote.send_command, target: remote.living_room_tv }
  tiles:
    - { name: Up, icon: mdi:chevron-up, data: { command: KEY_UP } }
    - { name: OK, icon: mdi:checkbox-blank-circle-outline, data: { command: KEY_ENTER } }
    - { name: Power, icon: mdi:power, action: remote.turn_off }    # a tile's own keys win
```

An entity id in the list gets the defaults too (`defaults: { size: 2x1 }` makes every tile wide), and
so does each tile a pattern makes. `'.'` (an empty key) stays empty.

**Typos:** admins get a note on the page for a key HomeView doesn't know in a section, a
`customize` entry, a condition, a filter or `confirm:`, for a `format:` it doesn't have, for a
pattern that matches nothing, and for a `show_when` entity that isn't in Home Assistant.

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

## Every key

Every key of a page file, a section, a tile and an alert rule. The strategy's own options are in
the main README (All options).

<!-- BEGIN GENERATED page-keys: scripts/gen-docs.mjs writes this from schema/options.json. Edit the schema, not this block. -->

### A page file (custom_pages)

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `path` | string | page-&lt;n&gt; | 0.2.0 | The page's address, `/<dashboard>/<path>`, and the word a `hold:` or `tap:` names. Keep it the file's name. |
| `title` | string | `Page` | 0.2.0 | The big title at the top. |
| `icon` | icon | `mdi:view-grid-outline` | 0.2.0 | The icon in the page bar. |
| `color` | color | a blue-grey tint (hue 200) | 0.2.0 | The page's tint: a colour name or a hue 0–360. |
| `subview` | boolean | `false` | 0.8.8 | Not in the page bar or the swipe order: opened by a hold (or tap) that names it, with a ✕ that goes back. |
| `admin_only` | boolean | `false` | 0.8.8 | Only for viewers who see every page: admins (unless `access` gives them a list) and logins with `access: all`. |
| `pills` | boolean | `false` | 0.2.0 | The status pills at the top, as on Home. |
| `pill` | boolean, object | — | 0.8.9 | A pill on Home, for everyone who gets the page: tap = this page, hold = the entity's details. `true` = the page's title and icon. |
| `pill.entity` | entity | — | 0.8.9 | The entity whose state it shows. |
| `pill.name` | string | the page's title | 0.8.9 | Its name; `''` = the state alone. |
| `pill.icon` | icon | the page's icon | 0.8.9 | Its icon. |
| `pill.alert` | string, string list | — | 0.8.9 | States that turn it red. |
| `pill.unit` | `W`, `kW`, `MW` | — | 0.8.13 | A power sensor's value in this unit. |
| `pill.format` | `time`, `date`, `datetime`, `relative`, `until`, `since` | — | 0.9.0 | A time in this format (see the tile key `format`). |
| `pill.attribute` | string | — | 0.9.0 | Show this attribute instead of the state. |
| `pill.show_when` | entity, condition, list of conditions, boolean | — | 0.9.0 | Show the pill only while this condition holds. |
| `hold` | page | — | 0.8.8 | Hold this page's title to open another page. |
| `columns` | number | 5 on tablets (more on wide screens) | 0.8.13 | Columns on tablets and browsers. |
| `show_room` | boolean | `true` | 0.8.13 | `false` = tiles show their state, not their room. |
| `alerts` | list of rules | — | 0.8.13 | A banner while a rule is true (the rules of `warnings:`); the page's pill on Home warns too. |
| `vars` | map | — | 0.8.8 | The entities the page uses: `$name` anywhere below becomes its value; a list stays a list and is spread inside a `tiles:` list. |
| `sections` | list of sections | — | 0.2.0 | The page's sections. |

### A section

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `title` | string | — | 0.2.0 | A heading; leave it out for none. |
| `position` | `top`, `bottom` | `bottom` | 0.2.0 | On a built-in page or a room's page: `top` = above HomeView's own tiles. |
| `color` | color | — | 0.2.0 | The section's own tint. |
| `icon` | icon | — | 0.8.13 | An icon before the title. |
| `layout` | `pills`, `keypad`, `faders`, `rows` | tiles | 0.8.13 | `pills`: small pills in a row (sensors with their value); `keypad`: icon buttons in a grid (a remote); `faders`: sliders, two per row on tablets; `rows`: a list. |
| `width` | `half` | — | 0.8.13 | `half`: two sections side by side on tablets (stacked on phones). |
| `columns` | number | `4` | 0.8.13 | A keypad's columns. |
| `icons_only` | boolean | `false` | 0.8.13 | Pills without their names (a keypad always is). |
| `tiles` | list of tiles | — | 0.2.0 | The tiles: an entity id, a glob (`light.kids_room_*`: one tile per entity, by name), `{ … }` (the keys below; `match:` for a filter), or `.` for an empty key in a keypad. |
| `show_when` | entity, condition, list of conditions, boolean | — | 0.9.0 | Show the section only while this condition holds (keys: [A condition](#a-condition-show_when)). A section whose tiles are all hidden hides too. |
| `defaults` | tile keys | — | 0.9.0 | Tile keys every tile of the section gets (a tile's own keys win), e.g. a remote's `{ type: button, action: remote.send_command, target: remote.tv }` once. |

### A tile

| Key | Tiles | Type | Default | Since | What it does |
|---|---|---|---|---|---|
| `entity` | entity, camera, person, chart, fader, weather, forecast | entity | — | 0.2.0 | The entity (a tile that's only an entity can be written as its id). |
| `type` | any | `entity`, `room`, `clock`, `weather`, `forecast`, `date`, `next_event`, `agenda`, `camera`, `person`, `chart`, `button`, `fader`, `air`, `energy_now`, `energy_flow` | `entity` | 0.2.0 | The tile's kind. An unknown type is left out with a note for admins. |
| `card` | card | object | — | 0.2.0 | Any Lovelace card's config, HACS cards included: `{ card: { type: thermostat, entity: climate.hallway } }`. |
| `area` | room | area | — | 0.2.0 | The room's area id. |
| `size` | any | size | 1x1 (widgets and cards: their own) | 0.2.0 | `WxH` in grid cells (`2x1`, `4x2` …), or `full` / `half` the page's width with a height (`full x 3`); a height of `auto` fits a card's content. It shrinks on narrow screens. |
| `phone_size` | any | size | — | 0.8.9 | The size on phones (2 columns, 64 px rows), e.g. `2x5`. |
| `name` | entity, camera, button, fader | string | — | 0.2.0 | Its name. |
| `icon` | entity, button, fader, chart, agenda, next_event | icon | — | 0.2.0 | Its icon. |
| `icon_on` | entity | icon | — | 0.8.10 | The icon while on. |
| `icon_off` | entity, button | icon | — | 0.8.10 | The icon while off (a button: while it isn't lit). |
| `color_on` | entity | color | — | 0.8.10 | The icon's colour while on (the colour code or CSS). |
| `color_off` | entity | color | — | 0.8.10 | The icon's colour while off. |
| `color` | entity (pills), button, fader, chart | color | — | 0.8.13 | Its colour while lit (a chart: its line). |
| `name_off` | entity (pills), button | string | — | 0.8.13 | Its name while it isn't on. |
| `tap` | entity | string | — | 0.2.0 | `more-info`, `toggle`, `none`, or a page path. |
| `hold` | entity, button | string, action | — | 0.8.8 | `more-info`, `toggle` (switch it on a hold), `none`, a page path, or (a button) `{ action, data, target }`. `tap: more-info` + `hold: toggle`: a stray tap can't switch it. |
| `show_room` | entity | boolean | `true` | 0.8.13 | `false` = its state instead of its room, where tiles show rooms. |
| `power` | entity | entity | — | 0.8.13 | A power sensor: "On · 0.72 kW" while it draws. |
| `confirm` | entity, button | boolean, string, { text, only, action } | — | 0.8.13 | Ask first, in HomeView's own sheet: `true`, `turn_on` / `turn_off` (only before that), your question, or `{ text, only, action }`. It guards the gesture that switches (the tap, or the hold with `hold: toggle`). |
| `unit` | entity (pills) | `W`, `kW`, `MW` | — | 0.8.13 | A power sensor's value in this unit. |
| `more` | card | object | — | 0.8.17 | A "Show all" button on the card that switches it to these settings (`null` removes one) and back. |
| `more_label` | card | string | — | 0.8.17 | The button's words; `{energy_devices}` = how many devices your Energy settings track. |
| `less_label` | card | string | — | 0.8.17 | The words to switch back. |
| `legend_more` | card | boolean | `true` | 0.8.17 | `false` hides a chart's own "More (n)" legend chip. |
| `calendars` | agenda, next_event | entity list | every calendar | 0.2.0 | Its calendars. |
| `days` | agenda, next_event, forecast | number | agenda 7, next_event 14 | 0.2.0 | Days ahead. |
| `max` | agenda | number | 8 (a list: 30) | 0.2.0 | The most events. |
| `match` | entity (a pattern), agenda, next_event | string, filter | — | 0.8.12 | An entity tile: a glob or a filter (keys: [An entity filter](#an-entity-filter-exclude_entities-match)), one tile per entity with the other keys; `state:` in the filter shows each only while it's in that state. Agenda and next event: only events whose title matches (a regular expression, any case), e.g. `'no school\|break'`. |
| `all_day` | agenda, next_event | boolean | — | 0.8.12 | Only all-day events. |
| `strip` | agenda | string | — | 0.8.12 | Text removed from the titles. |
| `join_weekends` | agenda | boolean | — | 0.8.12 | Adds the weekend right before or after a day off and joins breaks that then touch. |
| `layout` | agenda | `list` | — | 0.8.12 | `list`: one row per event with its dates and length. |
| `weekday_word` | agenda (list) | string | `school` | 0.8.12 | The word in the list's total: "3 school days off". |
| `long_icon` | agenda (list) | icon | — | 0.8.12 | The icon of a break longer than a day. |
| `event_icon` | agenda (list) | icon | — | 0.8.12 | The icon of a one-day event. |
| `title` | agenda, next_event, chart | string | — | 0.2.0 | Its heading. |
| `decimals` | chart | number | `1` | 0.4.0 | Decimals of the value. |
| `stale_minutes` | energy_now | number | `10` | 0.8.1 | Minutes after which a reading counts as old. |
| `battery` | person | entity | the person's phone battery | 0.4.0 | The battery shown with the person. |
| `action` | button | string | — | 0.8.13 | What a tap runs: a script or any action (`script.tv_source`, `light.turn_on` …). |
| `data` | button | object | — | 0.8.13 | The action's data. |
| `target` | button | entity, entity list, object | — | 0.8.13 | The action's target: an entity id, a list of them, or `{ entity_id, area_id … }`. |
| `toggle` | button | entity | — | 0.8.13 | Instead of `action`: toggle this entity; lit while it's on. |
| `watch` | button | entity | — | 0.8.13 | Lit while this entity's state (or `attribute`) is `when`. |
| `when` | button | string, number, string list | — | 0.8.13 | The state (or a list of states) that lights it. |
| `attribute` | entity, button | string | — | 0.8.13 | An entity tile shows this attribute instead of the state (`battery_level`; `last_changed`: when it last changed); a button watches it instead of the state (a TV's `source`). |
| `format` | entity, entity (pills) | `time`, `date`, `datetime`, `relative`, `until`, `since` | — | 0.9.0 | Show a time (an `input_datetime`, a date / time entity, a timestamp sensor, or the `attribute` that holds one) as `time` "6:30 AM", `date` "Thu, Nov 13", `datetime`, `relative` "in 2 hours", `until` "2 h 5 min" or `since` "3 h 20 min" (the last three redraw every 30 s). |
| `dim` | button | entity | — | 0.8.13 | A lit button shows as an outline while this entity is off. |
| `mute` | fader | entity | — | 0.8.13 | An `input_boolean` that mutes it (tap the icon); muted faders are grey with MUTED. |
| `show_when` | any | entity, condition, list of conditions, boolean | — | 0.9.0 | Show the tile only while this condition holds, live: an entity (while it's on), `{ entity, state / state_not }`, `{ entity, above / below }`, `{ user: [...] }`, `{ admin: true }`, `and:` / `or:` / `not:` (a list = all of them), or Home Assistant's own `condition:` shapes (keys: [A condition](#a-condition-show_when)). Edit mode shows the hidden ones faded. |

### A condition (show_when)

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `entity` | entity | — | 0.9.0 | The entity it reads. Alone: while it's on (a lock: unlocked, a cover: open, a person: home, media: playing). |
| `attribute` | string | — | 0.9.0 | Read this attribute instead of the state (alone: while it's set). |
| `state` | string, number, boolean, string list | — | 0.9.0 | Its state is one of these. |
| `state_not` | string, number, boolean, string list | — | 0.9.0 | Its state is none of these. |
| `above` | number, entity | — | 0.9.0 | Its value is above this (a number or an entity's value). |
| `below` | number, entity | — | 0.9.0 | Its value is below this. |
| `user` | string, string list | — | 0.9.0 | Who's looking: a login name (or its first word), a user id or a person entity linked to the login. |
| `users` | string, string list | — | 0.9.0 | The same as `user` (Home Assistant's `condition: user` writes it this way). |
| `admin` | boolean | — | 0.9.0 | `true`: admins only; `false`: everyone else. |
| `and` | entity, condition, list of conditions | — | 0.9.0 | All of these conditions. |
| `or` | entity, condition, list of conditions | — | 0.9.0 | Any of these conditions. |
| `not` | entity, condition, list of conditions | — | 0.9.0 | None of these conditions. |
| `condition` | `state`, `numeric_state`, `user`, `screen`, `and`, `or`, `not` | — | 0.9.0 | Home Assistant's own visibility shape, with its keys (`entity`, `state`, `above`, `users`, `conditions`, `media_query`). |
| `conditions` | list of conditions | — | 0.9.0 | The conditions of Home Assistant's `and` / `or` / `not`. |
| `media_query` | string | — | 0.9.0 | `condition: screen`: a CSS media query, e.g. `'(min-width: 600px)'`. |

### An entity filter (exclude_entities, match:)

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `entity_id` | string, string list | — | 0.9.0 | Ids or globs (`light.kids_room_*`). Diagnostic entities match only when named this way (or with `diagnostic: true`). |
| `domain` | string, string list | — | 0.9.0 | Domains: `light`, `sensor` … |
| `area` | string, string list | — | 0.9.0 | Areas, by id or name. |
| `label` | string, string list | — | 0.9.0 | Labels, by id or name (a label on the device counts). |
| `device_class` | string, string list | — | 0.9.0 | Device classes: `door`, `battery` … |
| `integration` | string, string list | — | 0.9.0 | Integrations: `zha`, `mqtt` … |
| `not` | string, filter, list of ids, globs or filters | — | 0.9.0 | But not these (ids, globs or filters). |
| `diagnostic` | boolean | `false` | 0.9.0 | Match diagnostic and settings entities too. |
| `state` | string, number, boolean, string list | — | 0.9.0 | A tile's `match:` only: each tile shows only while its entity is in one of these states (live). |
| `state_not` | string, number, boolean, string list | — | 0.9.0 | A tile's `match:` only: each tile shows only while its entity is in none of these states. |

### A confirm (confirm: { … })

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `text` | string | — | 0.9.0 | The question. |
| `only` | `turn_on`, `turn_off` | — | 0.9.0 | Ask only before switching it on (a lock: unlocking, a cover: opening) or off. |
| `action` | string | — | 0.9.0 | The button's word, e.g. `Sound`. |

### A warning or alert rule (warnings:, a page's alerts:)

| Key | Type | Default | Since | What it does |
|---|---|---|---|---|
| `text` | string | `Check this` | 0.8.13 | What it says. |
| `level` | `critical`, `notice` | `critical` | 0.8.13 | `critical` = red, `notice` = amber. |
| `not_on` | entity, entity list | — | 0.8.13 | Rule: true while it isn't on (off, offline or missing). |
| `on` | entity, entity list | — | 0.8.13 | Rule: true while every one is on. |
| `off` | entity, entity list | — | 0.8.13 | Rule: true while every one is off. |
| `all_off` | entity, entity list | — | 0.8.13 | Rule: true while all of them are off. |
| `none_on` | entity, entity list | — | 0.9.0 | Rule: true while none is confirmed on (off, offline and missing all count), e.g. both pumps off. |
| `text_offline` | string | "&lt;name&gt; not reporting", or "Can't check: &lt;text&gt;" for a missing entity | 0.8.13 | What it says, in amber, while the rule can't be checked. |
| `entities` | entity list | the rule's entities | 0.8.17 | What the Warnings pop-up lists. |

<!-- END GENERATED page-keys -->
