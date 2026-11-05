# Contributing

Thanks for helping! HomeView aims to give **any** Home Assistant home a good dashboard with no
setup, so changes should work from what HA already knows (areas, device classes, the Energy
settings) and keep config optional.

- `dist/homeview.js` is the source — plain JavaScript, no build step, no dependencies.
  Sections: constants, the home model (`buildModel`), state helpers, data fetching (cached),
  tile renderers (`R.*`), `<homeview-tile>`, status pills, page builders (`PAGES.*`),
  `<homeview-page>` and the strategy.
- A new tile type = a renderer in `R` (`key`, `html`, optional `tick`, `update`, `action`).
  A new page = a builder in `PAGES` and an entry in `PAGE_DEFS`.
- Run `./scripts/check.sh` before opening a pull request, and try it on phone, tablet and
  desktop widths, in light and dark.
- Describe what you changed in `CHANGELOG.md` under the unreleased version.

## Issues

- Every new issue gets the `triage` label and is assigned to the maintainer. The flow from
  there:
  - `needs-info`: waiting for the reporter. It goes back to `triage` by itself when they reply.
  - `confirmed`: reproduced.
  - `fixed`: on `main`, out with the next release.
  - Also `question`, `enhancement`, `device: phone` / `device: tablet` and `energy`.
- Commits that fix an issue say `Fixes #N` (and the CHANGELOG line ends with `(#N)`). GitHub then
  closes the issue, and the release workflow comments on it with the version that has the fix.
