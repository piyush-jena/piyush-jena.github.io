(function () {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".panel"));
  const seen = new Set();

  function activate(id, pushHash) {
    if (!panels.some((p) => p.id === "panel-" + id)) id = "home";

    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === id)));
    panels.forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));

    if (pushHash) history.replaceState(null, "", "#" + id);

    if (!seen.has(id)) {
      seen.add(id);
      document.dispatchEvent(new CustomEvent("tab:first-activate", { detail: { id } }));
    }
    document.dispatchEvent(new CustomEvent("tab:activate", { detail: { id } }));
  }

  tabs.forEach((t) => {
    t.addEventListener("click", () => activate(t.dataset.tab, true));
  });

  window.addEventListener("hashchange", () => {
    activate(location.hash.replace("#", "") || "home", false);
  });

  // Deferred to DOMContentLoaded so every tab script below this one in the
  // HTML (vm.js, gym.js, bottlerocket.js) has registered its
  // tab:first-activate listener before this fires — otherwise a direct
  // link/reload straight to e.g. #vm dispatches the event before anyone's
  // listening and the VM never boots.
  document.addEventListener("DOMContentLoaded", () => {
    activate(location.hash.replace("#", "") || "home", false);
  });
})();
