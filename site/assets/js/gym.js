(function () {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let loaded = false;

  function apiBase() {
    return (window.SITE.gymApiBase || "").replace(/\/$/, "");
  }
  function token() {
    return localStorage.getItem("gym_token") || "";
  }
  function isUnlocked() {
    return !!token();
  }
  function authHeaders() {
    return token() ? { Authorization: "Bearer " + token() } : {};
  }
  function iso(d) {
    return d.toISOString().slice(0, 10);
  }

  async function api(path, opts) {
    const base = apiBase();
    if (!base) throw new Error("no backend configured");
    const res = await fetch(base + path, opts);
    if (!res.ok) throw new Error("api " + res.status);
    return res.status === 204 ? null : res.json();
  }

  function renderOffline() {
    document.getElementById("gym-offline").style.display = "block";
    document.getElementById("gym-content").style.display = "none";
  }

  function renderOnline() {
    document.getElementById("gym-offline").style.display = "none";
    document.getElementById("gym-content").style.display = "block";
  }

  function splitDayCard(day, unlocked) {
    const exercisesHTML = day.rest
      ? "<p style='margin:0;color:var(--text-faint);font-size:0.86rem;'>rest day</p>"
      : `<ul>${day.exercises.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    return `
      <div class="split-day ${day.rest ? "rest" : ""}" data-day="${day.day}">
        <div class="day-name">${DAY_NAMES[day.day]}</div>
        <div class="focus" ${unlocked ? 'contenteditable="true" data-field="focus"' : ""}>${day.focus}</div>
        ${exercisesHTML}
        ${
          unlocked && !day.rest
            ? `<textarea class="edit-exercises" data-field="exercises" placeholder="one exercise per line">${day.exercises.join("\n")}</textarea>
               <button class="btn" data-save="${day.day}" style="margin-top:8px;">save</button>`
            : ""
        }
      </div>`;
  }

  function renderSplit(days, unlocked) {
    const grid = document.getElementById("split-grid");
    grid.innerHTML = days
      .sort((a, b) => a.day - b.day)
      .map((d) => splitDayCard(d, unlocked))
      .join("");

    if (unlocked) {
      grid.querySelectorAll("[data-save]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const card = btn.closest(".split-day");
          const day = Number(btn.dataset.save);
          const focus = card.querySelector('[data-field="focus"]').textContent.trim();
          const exercises = card
            .querySelector('[data-field="exercises"]')
            .value.split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          btn.textContent = "saving…";
          try {
            await api(`/api/splits/${day}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ focus, exercises, rest: exercises.length === 0 }),
            });
            btn.textContent = "saved";
            setTimeout(() => (btn.textContent = "save"), 1200);
          } catch {
            btn.textContent = "failed, retry";
          }
        });
      });
    }
  }

  function renderHeatmap(dates) {
    const set = new Set(dates);
    const el = document.getElementById("heatmap");
    el.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = 140;
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    // align to a Sunday so the 7-row grid reads correctly
    start.setDate(start.getDate() - start.getDay());

    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (set.has(iso(d))) streak++;
      else break;
    }
    document.getElementById("stat-streak").textContent = streak;
    document.getElementById("stat-total").textContent = set.size;

    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > today) break;
      const cell = document.createElement("div");
      cell.className = "cell";
      const hit = set.has(iso(d));
      cell.dataset.level = hit ? "3" : "0";
      cell.title = iso(d) + (hit ? ": trained" : "");
      el.appendChild(cell);
    }
  }

  function defaultSplit() {
    return [
      { day: 0, focus: "Rest", exercises: [], rest: true },
      { day: 1, focus: "Push", exercises: ["Bench press", "Overhead press", "Incline dumbbell press", "Triceps pushdown"] },
      { day: 2, focus: "Pull", exercises: ["Deadlift", "Barbell row", "Lat pulldown", "Curls"] },
      { day: 3, focus: "Legs", exercises: ["Squat", "Romanian deadlift", "Leg press", "Calf raise"] },
      { day: 4, focus: "Push", exercises: ["Incline bench", "Dumbbell shoulder press", "Dips", "Lateral raise"] },
      { day: 5, focus: "Pull", exercises: ["Pull-ups", "Cable row", "Face pull", "Hammer curl"] },
      { day: 6, focus: "Legs / rest", exercises: [] , rest: true},
    ];
  }

  async function init() {
    if (loaded) return;
    loaded = true;

    const base = apiBase();
    const unlocked = isUnlocked();

    document.getElementById("gym-lock-label").textContent = unlocked
      ? "editing unlocked on this browser"
      : "view only: this is a live look at my own gym log";

    if (!base) {
      renderOffline();
      renderSplit(defaultSplit(), false);
      return;
    }

    try {
      const [split, attendance] = await Promise.all([
        api("/api/splits", {}),
        api("/api/attendance", {}),
      ]);
      renderOnline();
      renderSplit(split.length ? split : defaultSplit(), unlocked);
      renderHeatmap(attendance.map((a) => a.date));
    } catch {
      renderOffline();
      renderSplit(defaultSplit(), false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("gym-log-today").addEventListener("click", async (e) => {
      e.target.disabled = true;
      e.target.textContent = "logging…";
      try {
        await api("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ date: iso(new Date()) }),
        });
        loaded = false;
        init();
      } catch {
        e.target.textContent = "failed";
      } finally {
        e.target.disabled = false;
        setTimeout(() => (e.target.textContent = "log today"), 1000);
      }
    });

    document.getElementById("gym-unlock-toggle").addEventListener("click", () => {
      const row = document.getElementById("gym-unlock-row");
      row.style.display = row.style.display === "none" ? "flex" : "none";
    });

    document.getElementById("gym-unlock-save").addEventListener("click", () => {
      const input = document.getElementById("gym-unlock-input");
      if (input.value.trim()) {
        localStorage.setItem("gym_token", input.value.trim());
      } else {
        localStorage.removeItem("gym_token");
      }
      loaded = false;
      init();
    });
  });

  document.addEventListener("tab:first-activate", (e) => {
    if (e.detail.id === "gym") init();
  });
})();
