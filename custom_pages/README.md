# Custom pages

HomeView builds most pages by itself. A **custom page** is one you write yourself: a YAML file
with your own tiles and cards. You can keep it, share it, or use someone else's. This folder
has a fully annotated starter and four ready-made pages:

| File | Page | Opened by | What to change |
|---|---|---|---|
| [`sample.yaml`](sample.yaml) | Sample | — (a starter: every option, explained) | everything |
| [`media.yaml`](media.yaml) | Media | **hold the TV tile** | `vars:` (TV, remote, soundbar, speakers) |
| [`energy-history.yaml`](energy-history.yaml) | Energy History | **hold the Energy pill** | nothing: it uses your Energy settings |
| [`pond.yaml`](pond.yaml) | Pond | **hold the Pond pill** | `vars:` (pumps, filter, UV, light, water) |
| [`admin.yaml`](admin.yaml) | Admin (admins only) | **hold the Home title** | `vars:` (modes, actions, automations) |
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
2. In HomeView, tap the **pencil** → **Reload pages**. Admins only; it shows on YAML dashboards.

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
admin_only: false            # true: only admins get the page
pills: false                 # true: the status pills, as on Home
hold: another-page           # hold this page's title to open another page (optional)

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
| Any Lovelace card | `{ card: { type: history-graph, entities: [sensor.x] }, size: full x 2 }`. Includes HACS cards and the Energy cards (`energy-usage-graph`, `energy-date-selection` …) |

`size` is *columns* x *rows*: `1x1`, `2x1`, `3x2`. `full` is the page's width and `half` is half
of it, so `full x 3` is the full width and 3 rows tall. Sizes shrink to fit on phones.

## Taps and holds

`tap:` and `hold:` take a **page path** (open that page), `more-info` (the details), `toggle`,
or `none`. Leave them out for HomeView's usual tap and hold (see *Taps* in the main README).

| Hold this… | Set in `dashboard.yaml` |
|---|---|
| An entity's tile, on every page where it appears (the TV) | `customize: { media_player.living_room_tv: { hold: media } }` |
| …a TV that's a switch (an IR or smart-plug TV) | `customize: { switch.living_room_tv: { hold: media } }`. Use whatever entity your TV tile shows |
| One tile on a custom page | `{ entity: media_player.living_room_tv, hold: media }` |
| A status pill (Energy) | `pills: [..., { pill: energy, hold: energy-history }, ...]` |
| A pill of your own (Pond) | `pills: [..., { entity: sensor.pond_water_temperature, name: Pond, icon: mdi:fish, hold: pond }]` |
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

Holds, `vars:` and everything else work the same. Only the files and **Reload pages** need the
YAML dashboard. Saving in the editor updates the dashboard right away.
