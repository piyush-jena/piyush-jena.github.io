(function () {
  const V86_VERSION = "0.5.461";
  const V86_JS = `https://cdn.jsdelivr.net/npm/v86@${V86_VERSION}/build/libv86.js`;
  const V86_WASM = `https://cdn.jsdelivr.net/npm/v86@${V86_VERSION}/build/v86.wasm`;

  let emulator = null;
  let scriptLoading = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function setOverlay(text, hide) {
    const overlay = document.getElementById("vm-boot-overlay");
    const label = document.getElementById("vm-boot-label");
    if (label && text) label.textContent = text;
    if (overlay) overlay.classList.toggle("hidden", !!hide);
  }

  function setLed(on) {
    const led = document.getElementById("vm-led");
    if (led) led.classList.toggle("on", on);
  }

  async function boot() {
    if (emulator) return;
    setOverlay("fetching v86 runtime…", false);

    if (!scriptLoading) scriptLoading = loadScript(V86_JS);
    try {
      await scriptLoading;
    } catch {
      setOverlay("couldn't load the v86 runtime from jsdelivr. might be offline, or the CDN is blocked here.", false);
      return;
    }

    setOverlay("booting a small Linux image…", false);

    emulator = new V86({
      wasm_path: V86_WASM,
      memory_size: 128 * 1024 * 1024,
      vga_memory_size: 4 * 1024 * 1024,
      screen_container: document.getElementById("screen_container"),
      bios: { url: "assets/vm/seabios.bin" },
      vga_bios: { url: "assets/vm/vgabios.bin" },
      cdrom: { url: "assets/vm/linux.iso" },
      autostart: true,
    });

    emulator.add_listener("download-progress", (e) => {
      if (e.file_name && e.file_name.includes("linux.iso") && e.total) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setOverlay(`booting a small Linux image… ${pct}%`, false);
      }
    });

    emulator.add_listener("download-error", () => {
      setOverlay("couldn't fetch the boot image. try reloading the page.", false);
    });

    emulator.add_listener("emulator-started", () => {
      setOverlay("", true);
      setLed(true);
    });
  }

  function reboot() {
    if (emulator) emulator.restart();
  }

  document.addEventListener("tab:first-activate", (e) => {
    if (e.detail.id === "vm") boot();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("vm-reboot");
    if (btn) btn.addEventListener("click", reboot);
  });
})();
