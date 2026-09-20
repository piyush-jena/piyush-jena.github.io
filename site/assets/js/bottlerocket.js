(function () {
  let loaded = false;

  function slug(branch) {
    return branch.replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  async function branchIsBuilt(branch) {
    try {
      const res = await fetch(`previews/bottlerocket/${slug(branch)}/index.html`, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }

  function viewBranch(branch) {
    const viewer = document.getElementById("br-viewer");
    const frame = document.getElementById("br-frame");
    const label = document.getElementById("br-viewer-branch");
    label.textContent = branch;
    frame.src = `previews/bottlerocket/${slug(branch)}/`;
    viewer.style.display = "block";
    viewer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function rowHTML(branch, built) {
    const runUrl = `https://github.com/piyush-jena/piyush-jena.github.io/actions/workflows/build-bottlerocket-branch.yml`;
    return `
      <div class="br-row">
        <div class="br-name">${branch}<div class="path">previews/bottlerocket/${slug(branch)}/</div></div>
        ${
          built
            ? `<button class="btn primary" data-view="${branch}">view</button>`
            : `<a class="btn" href="${runUrl}" target="_blank" rel="noopener">not built, run workflow</a>`
        }
      </div>`;
  }

  async function init() {
    if (loaded) return;
    loaded = true;

    const { owner, repo } = window.SITE.bottlerocketPreview;
    const list = document.getElementById("br-list");
    list.innerHTML = `<div class="br-loading">fetching branches…</div>`;

    let branches;
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
      if (!res.ok) throw new Error();
      branches = (await res.json()).map((b) => b.name);
    } catch {
      list.innerHTML = `<div class="br-loading">couldn't reach the GitHub API right now.</div>`;
      return;
    }

    const built = await Promise.all(branches.map(branchIsBuilt));
    list.innerHTML = branches.map((b, i) => rowHTML(b, built[i])).join("");

    list.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => viewBranch(btn.dataset.view));
    });
  }

  document.addEventListener("tab:first-activate", (e) => {
    if (e.detail.id === "bottlerocket") init();
  });
})();
