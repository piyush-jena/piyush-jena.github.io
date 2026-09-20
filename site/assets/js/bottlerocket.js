(function () {
  let loaded = false;

  // The site is built into a single fixed directory by
  // .github/workflows/build-bottlerocket-branch.yml, from whatever fork +
  // branch is pinned in site/bottlerocket-preview.json.
  const PREVIEW_DIR = "previews/bottlerocket/current/";

  async function readPointer() {
    try {
      const res = await fetch("bottlerocket-preview.json", { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function previewIsBuilt() {
    try {
      const res = await fetch(`${PREVIEW_DIR}index.html`, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }

  function showEmpty(msg) {
    document.getElementById("br-frame").hidden = true;
    document.getElementById("br-led").classList.remove("on");
    const empty = document.getElementById("br-empty");
    empty.textContent = msg;
    empty.hidden = false;
  }

  async function init() {
    if (loaded) return;
    loaded = true;

    const source = document.getElementById("br-source");
    const pointer = await readPointer();

    if (pointer && pointer.fork && pointer.branch) {
      source.textContent = `${pointer.fork} @ ${pointer.branch}`;
    } else {
      source.textContent = "bottlerocket-preview.json";
    }

    if (await previewIsBuilt()) {
      document.getElementById("br-frame").src = PREVIEW_DIR;
    } else {
      showEmpty("Nothing built here yet — pin a fork/branch in bottlerocket-preview.json and push.");
    }
  }

  document.addEventListener("tab:first-activate", (e) => {
    if (e.detail.id === "bottlerocket") init();
  });
})();
