# gym-server

Tiny axum + SQLite backend for the Gym tab on piyush-jena.github.io. Runs on
this machine, not on GitHub Pages — the static site calls it over the
internet via a Tailscale Funnel URL.

Two tables, seeded with a default Push/Pull/Legs split on first run:

- `splits(day, focus, exercises, rest)`, `day` 0-6 (Sun-Sat)
- `attendance(date)`, one row per day trained

## Run it

```
cargo build --release
GYM_TOKEN=$(openssl rand -hex 24) \
GYM_ALLOWED_ORIGIN=https://piyush-jena.github.io \
GYM_DB_PATH=$HOME/.local/share/gym-server/gym.sqlite3 \
PORT=8787 \
./target/release/gym-server
```

Reads (`GET /api/splits`, `GET /api/attendance`) are open — that's the
point, the Gym tab is public. Writes (`PUT /api/splits/:day`,
`POST /api/attendance`) need `Authorization: Bearer <GYM_TOKEN>`. Put that
same token into the site's Gym tab via the "key" button (stored in
`localStorage` on your own browser only) to unlock editing there.

## Run it for real (systemd)

```
mkdir -p ~/.local/share/gym-server
echo "GYM_TOKEN=$(openssl rand -hex 24)" | sudo tee /etc/gym-server.env
sudo chmod 600 /etc/gym-server.env
cargo build --release
systemctl --user link "$(pwd)/gym-server.service"   # or system-wide, see below
systemctl --user enable --now gym-server
```

`gym-server.service` in this directory targets a user service pointed at
this repo checkout; adjust paths if you move it, or install it as a system
unit under `/etc/systemd/system/` instead (then use `sudo systemctl` and
drop `--user`).

## Expose it: Tailscale Funnel

```
sudo systemctl enable --now tailscaled
tailscale up
tailscale funnel 8787
```

That prints a stable `https://<machine>.<tailnet>.ts.net` URL. Put it in
`site/assets/js/config.js` as `gymApiBase`, commit, push. The Gym tab shows
an honest "backend not reachable" state (with the default split still
visible) whenever this machine or the funnel is down — that's expected,
not a bug to chase.
