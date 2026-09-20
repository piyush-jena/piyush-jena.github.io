(function () {
  const CACHE_TTL = 1000 * 60 * 30; // 30 min, keeps us under the anonymous rate limit

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { t, v } = JSON.parse(raw);
      if (Date.now() - t > CACHE_TTL) return null;
      return v;
    } catch {
      return null;
    }
  }
  function cacheSet(key, v) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
    } catch {
      /* storage full or blocked, fine to skip */
    }
  }

  async function fetchJSON(url) {
    const cached = cacheGet(url);
    if (cached) return cached;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("github api " + res.status);
    const json = await res.json();
    cacheSet(url, json);
    return json;
  }

  function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days < 1) return "today";
    if (days < 30) return days + "d ago";
    if (days < 365) return Math.floor(days / 30) + "mo ago";
    return Math.floor(days / 365) + "y ago";
  }

  function cardHTML(entry, live) {
    const stars = live ? live.stargazers_count : null;
    const lang = live ? live.language : null;
    const desc = entry.blurb;
    const pushed = live ? timeAgo(live.pushed_at) : null;
    const cls = entry.feature ? "work-card feature" : "work-card";
    return `
      <a class="${cls}" href="https://github.com/${entry.owner}/${entry.repo}" target="_blank" rel="noopener">
        <h3>${entry.repo}</h3>
        <p>${desc}</p>
        <div class="meta">
          ${lang ? `<span>${lang}</span>` : ""}
          ${stars != null ? `<span class="stars">${stars}</span>` : ""}
          ${pushed ? `<span>${pushed}</span>` : ""}
        </div>
      </a>`;
  }

  async function renderWork() {
    const grid = document.getElementById("work-grid");
    if (!grid) return;
    const entries = window.SITE.featuredRepos;
    grid.innerHTML = entries.map((e) => cardHTML(e, null)).join("");

    const cards = Array.from(grid.children);
    await Promise.all(
      entries.map(async (entry, i) => {
        try {
          const live = await fetchJSON(`https://api.github.com/repos/${entry.owner}/${entry.repo}`);
          cards[i].outerHTML = cardHTML(entry, live);
        } catch {
          // rate-limited or offline: the static fallback card already rendered
        }
      })
    );
  }

  async function renderNeofetch() {
    const el = document.getElementById("neofetch-repos");
    if (!el) return;
    try {
      const user = await fetchJSON(`https://api.github.com/users/${window.SITE.githubUser}`);
      el.textContent = user.public_repos;
    } catch {
      el.textContent = "68+";
    }
  }

  function renderContribGraph() {
    const img = document.getElementById("contrib-img");
    if (!img) return;
    img.src = `https://ghchart.rshah.org/ff8a3d/${window.SITE.githubUser}`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderWork();
    renderNeofetch();
    renderContribGraph();
  });
})();
