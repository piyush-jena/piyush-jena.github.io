(function () {
  const backdrop = document.getElementById("cmdk-backdrop");
  const body = document.getElementById("cmdk-body");
  const input = document.getElementById("cmdk-input");
  if (!backdrop) return;

  function println(text, cls) {
    const line = document.createElement("div");
    line.className = "line " + (cls || "");
    line.textContent = text;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  function open() {
    backdrop.classList.add("open");
    input.value = "";
    input.focus();
  }
  function close() {
    backdrop.classList.remove("open");
  }

  const commands = {
    help() {
      println("available: whoami, ls, cat about.txt, open github, open linkedin, neofetch, date, clear", "out");
    },
    whoami() {
      println("piyush-jena, SDE II @ AWS, working on Bottlerocket. New York, NY.", "out");
    },
    ls(args) {
      if (args[0] && args[0] !== "projects") {
        println(`ls: cannot access '${args[0]}': No such directory`, "out");
        return;
      }
      window.SITE.featuredRepos.forEach((r) => println(`${r.owner}/${r.repo}`, "out"));
    },
    "cat"(args) {
      if (args[0] !== "about.txt") {
        println(`cat: ${args[0] || ""}: No such file`, "out");
        return;
      }
      println("Software Development Engineer II at AWS, working on Bottlerocket.", "out");
      println("Runs Arch + Hyprland. Keeps this site's Linux VM tab honest.", "out");
    },
    open(args) {
      const target = args[0];
      if (target === "github") window.open(`https://github.com/${window.SITE.githubUser}`, "_blank");
      else if (target === "linkedin") window.open(window.SITE.linkedin, "_blank");
      else println(`open: unknown target '${target}' (try 'github' or 'linkedin')`, "out");
    },
    neofetch() {
      println("os: Arch Linux    wm: Hyprland    role: SDE II @ AWS", "out");
      println("focus: Bottlerocket    location: New York, NY", "out");
    },
    date() {
      println(new Date().toString(), "out");
    },
    sudo() {
      println("nice try, this isn't that kind of shell.", "out");
    },
    clear() {
      body.innerHTML = "";
    },
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Enter") return;
    const raw = input.value.trim();
    input.value = "";
    if (!raw) return;
    println("$ " + raw, "prompt");
    const [cmd, ...args] = raw.split(/\s+/);
    if (commands[cmd]) commands[cmd](args);
    else println(`command not found: ${cmd} (try 'help')`, "out");
  });

  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
    if (e.key === "/" && !typing) {
      e.preventDefault();
      open();
    }
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.getElementById("cmdk-hint")?.addEventListener("click", open);
})();
