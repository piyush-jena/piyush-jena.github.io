# piyush-jena.github.io

My personal site. Plain HTML/CSS/JS, no framework, no build step for the
frontend — deployed as-is from `site/` via GitHub Actions.

## Layout

- `site/` — the deployed site (Pages artifact root is this directory).
  One `index.html` shell, tabs switched client-side (`assets/js/router.js`).
  - **home** — profile + featured repos, stats fetched live from the
    GitHub REST API (`assets/js/github.js`). Also a floating mini-player
    (`assets/js/music.js`) that shuffles 30s previews of an Apple Music
    playlist — tracks are listed in `assets/js/config.js`, preview clips
    are resolved at runtime from Apple's public iTunes Search API (no
    auth), and a button mutes/unmutes.
  - **linux-vm** — *(currently commented out in `index.html`)* a real x86
    Linux boot in the browser via [v86](https://github.com/copy/v86)
    (WASM), rendered inside a CSS "TV in a room" (`assets/js/vm.js`,
    `assets/css/vm.css`). The boot image and BIOS blobs are self-hosted
    under `assets/vm/` (same-origin, so no CORS issues with v86's XHR
    loading).
  - **gym** — *(currently commented out in `index.html`)* split +
    attendance tracker. Talks to `backend/gym-server`, a small Rust
    service I run on my own machine and expose via Tailscale Funnel.
    Degrades to a read-only default split when that machine is offline, by
    design.
  - **bottlerocket** — renders a single pinned preview of
    [bottlerocket-project-website](https://github.com/piyush-jena/bottlerocket-project-website)
    inside a CSS "TV in a room". The fork + branch on screen are whatever
    `site/bottlerocket-preview.json` points at; editing that file and
    pushing triggers a rebuild (see below).
  - `site/previews/bottlerocket/current/` — built output for the pinned
    branch, committed by the workflow below, not written by hand.

- `backend/gym-server/` — the Rust (axum + SQLite) API behind the Gym
  tab. See its own README for how to run it and expose it.

- `.github/workflows/`
  - `deploy.yml` — deploys `site/` to GitHub Pages on every push to
    `main`.
  - `build-bottlerocket-branch.yml` — reads the fork + branch from
    `site/bottlerocket-preview.json`, builds it with Hugo, and commits the
    output into `site/previews/bottlerocket/current/`. Runs automatically
    on push to `main` whenever that pointer file changes (also
    `workflow_dispatch` for manual runs). No token lives in the public
    page — switching the preview is a commit, not a client-side action.

## Local dev

```
python3 -m http.server 8123 --directory site
```

Then open `http://localhost:8123`. For the Gym tab to do anything locally,
also run `backend/gym-server` (see its README) and point
`site/assets/js/config.js`'s `gymApiBase` at it.
