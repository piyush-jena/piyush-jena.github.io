(function () {
  // Initial theme is set by the inline <head> script before first paint.
  // This just wires the toggle button and persists the choice.
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function current() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    btn.setAttribute("aria-pressed", String(theme === "light"));
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* storage blocked, fine */
    }
  }

  apply(current());
  btn.addEventListener("click", function () {
    apply(current() === "light" ? "dark" : "light");
  });
})();
