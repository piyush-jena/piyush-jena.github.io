(function () {
  const cfg = (window.SITE && window.SITE.music) || {};
  const tracks = Array.isArray(cfg.tracks) ? cfg.tracks.filter((t) => t && t.title) : [];
  if (!tracks.length) return; // nothing configured, keep the dock hidden

  const dock = document.getElementById("music-dock");
  const toggle = document.getElementById("music-toggle");
  const nowEl = document.getElementById("music-now");
  const linkEl = document.getElementById("music-link");
  if (!dock || !toggle) return;

  const audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.7;
  // When a 30s preview ends, roll on to another random track.
  audio.addEventListener("ended", () => playRandom());

  let started = false; // becomes true once the browser lets us make sound

  if (cfg.playlistUrl) {
    linkEl.href = cfg.playlistUrl;
    linkEl.hidden = false;
  }

  // Resolve a 30s preview clip + tidy title from Apple's public iTunes
  // Search API. No auth, CORS-enabled, no subscription needed to hear it.
  async function resolvePreview(track) {
    const term = encodeURIComponent(`${track.artist || ""} ${track.title}`.trim());
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("itunes " + res.status);
    const data = await res.json();
    const hit = data.results && data.results[0];
    if (!hit || !hit.previewUrl) throw new Error("no preview");
    return {
      previewUrl: hit.previewUrl,
      label: `${hit.trackName} — ${hit.artistName}`,
    };
  }

  function setMuted(muted) {
    audio.muted = muted;
    dock.classList.toggle("muted", muted);
    toggle.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  async function playRandom() {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    nowEl.textContent = "picking a song…";
    let info;
    try {
      info = await resolvePreview(track);
    } catch {
      nowEl.textContent = `${track.title} — ${track.artist || ""}`.replace(/ — $/, "");
      return;
    }
    nowEl.textContent = info.label;
    audio.src = info.previewUrl;
    try {
      await audio.play();
      started = true;
    } catch {
      // Autoplay-with-sound blocked until the visitor interacts. Start on
      // their first gesture anywhere on the page.
      if (!started) armFirstGesture();
    }
  }

  function armFirstGesture() {
    const kick = () => {
      document.removeEventListener("pointerdown", kick);
      document.removeEventListener("keydown", kick);
      audio.play().then(() => { started = true; }).catch(() => {});
    };
    document.addEventListener("pointerdown", kick, { once: true });
    document.addEventListener("keydown", kick, { once: true });
  }

  toggle.addEventListener("click", () => {
    // First tap counts as the gesture that unblocks audio, so also start
    // playback if autoplay never got going.
    if (audio.paused && started === false) {
      setMuted(false);
      audio.play().then(() => { started = true; }).catch(() => {});
      return;
    }
    setMuted(!audio.muted);
  });

  dock.hidden = false;
  playRandom();
})();
