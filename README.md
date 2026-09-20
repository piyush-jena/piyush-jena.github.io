# piyush-jena.github.io

My personal site. Plain HTML/CSS/JS, no framework, no build step for the
frontend — deployed as-is from `site/` via GitHub Actions.

## Layout

- `site/` — the deployed site (Pages artifact root is this directory).
  One `index.html` shell, tabs switched client-side (`assets/js/router.js`).
  - **home** — profile + featured repos, stats fetched live from the
    GitHub REST API (`assets/js/github.js`).
  - **linux-vm** — a real x86 Linux boot in the browser via
    [v86](https://github.com/copy/v86) (WASM), rendered inside a CSS "TV in
    a room" (`assets/js/vm.js`, `assets/css/vm.css`). The boot image and
    BIOS blobs are self-hosted under `assets/vm/` (same-origin, so no CORS
    issues with v86's XHR loading).
  - **gym** — split + attendance tracker. Talks to `backend/gym-server`,
    a small Rust service I run on my own machine and expose via Tailscale
    Funnel. Degrades to a read-only default split when that machine is
    offline, by design.
  - **bottlerocket** — lists branches of
    [bottlerocket-project-website](https://github.com/piyush-jena/bottlerocket-project-website)
    and renders any that have been built into `site/previews/bottlerocket/`.
    Building one is manual, via the Actions tab, on purpose (see below).
  - `site/previews/bottlerocket/<branch>/` — built output, committed by
    the workflow below, not written by hand.

- `backend/gym-server/` — the Rust (axum + SQLite) API behind the Gym
  tab. See its own README for how to run it and expose it.

- `.github/workflows/`
  - `deploy.yml` — deploys `site/` to GitHub Pages on every push to
    `main`.
  - `build-bottlerocket-branch.yml` — manual (`workflow_dispatch`):
    builds one branch of `bottlerocket-project-website` with Hugo and
    commits the output into `site/previews/bottlerocket/<branch>/`, which
    then deploys via `deploy.yml` like anything else. Triggered from the
    Actions tab or the "not built, run workflow" links on the Bottlerocket
    tab — deliberately not automatic, so no token has to live in the
    public page.

## Local dev

```
python3 -m http.server 8123 --directory site
```

Then open `http://localhost:8123`. For the Gym tab to do anything locally,
also run `backend/gym-server` (see its README) and point
`site/assets/js/config.js`'s `gymApiBase` at it.
