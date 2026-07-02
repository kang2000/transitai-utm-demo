/* =============================================================================
 * TransitAI UTM — App Router & Screen Controllers (app.js)
 * -----------------------------------------------------------------------------
 * Wires the navigation flow (report Figure 5.1), the Staff Demo panel that drives
 * the resolution-refutation proof, and the Alerts / Bus-Stop / Feedback
 * screens. Loaded last; binds everything on DOMContentLoaded.
 * ========================================================================== */

const App = (() => {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  let timetableQuery = "";

  /* ---- screen routing ------------------------------------------------- */
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s =>
      s.classList.toggle("is-active", s.id === id));
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("is-active", t.dataset.screen === id));
    if (id === "screen-home")     renderHome();
    if (id === "screen-timetable") renderTimetable();
    if (id === "screen-alerts")   renderAlerts();
    if (id === "screen-admin")    { renderDemoTimeControls(); renderAdmin(); renderStaffIssues(); }
    if (id === "screen-feedback") renderFeedbackLog();
  }

  function subscribedRouteIds() {
    return new Set(KB.subscriptions
      .filter(s => s.user === Chat.DEMO_USER)
      .map(s => s.route));
  }

  function subscribedDelayedRoutes() {
    const subs = subscribedRouteIds();
    return KB.delayedRoutes
      .map(rid => KBUtil.routeById(rid))
      .filter(r => r && subs.has(r.id));
  }

  /* ---- Home screen ---------------------------------------------------- */
  function renderHome() {
    const homeAlertText = document.getElementById("homeAlertText");
    if (!homeAlertText) return;
    const count = subscribedDelayedRoutes().length;
    homeAlertText.textContent = count
      ? `${count} subscribed route alert${count === 1 ? "" : "s"} active.`
      : "No subscribed route alerts.";
  }

  /* ---- Timetable screen ----------------------------------------------- */
  function routeSearchText(route) {
    return [
      route.name,
      route.note,
      route.stops.map(id => {
        const stop = KBUtil.stopById(id);
        return `${stop.name} ${stop.aliases?.join(" ") || ""}`;
      }).join(" ")
    ].join(" ").toLowerCase();
  }

  function routeDepartures(route) {
    const start = KBUtil.toMinutes(route.operating.start);
    const end = KBUtil.toMinutes(route.operating.end);
    const delay = KBUtil.delayMinutes(route.id);
    const now = KBUtil.nowMinutes();
    const departures = [];
    for (let t = start; t <= end; t += route.headway) {
      departures.push({
        scheduledMins: t,
        scheduled: KBUtil.fmt(t),
        estimatedMins: t + delay,
        estimated: KBUtil.fmt(t + delay),
        isNext: t >= now && t === Math.ceil(Math.max(now - start, 0) / route.headway) * route.headway + start
      });
    }
    return departures;
  }

  function departureGroups(route) {
    const groups = [
      { title: "Morning", range: "07:00–11:59", items: [] },
      { title: "Afternoon", range: "12:00–16:59", items: [] },
      { title: "Evening", range: "17:00–18:30", items: [] }
    ];
    routeDepartures(route).forEach(d => {
      const hour = Math.floor(d.scheduledMins / 60);
      const group = hour < 12 ? groups[0] : hour < 17 ? groups[1] : groups[2];
      group.items.push(d);
    });
    return groups.filter(g => g.items.length);
  }

  function renderTimetable() {
    const list = document.getElementById("timetableList");
    if (!list) return;
    const search = document.getElementById("timetableSearch");
    if (search && search.value !== timetableQuery) search.value = timetableQuery;
    const q = timetableQuery.trim().toLowerCase();
    const routes = q ? KB.routes.filter(r => routeSearchText(r).includes(q)) : KB.routes;
    list.innerHTML = routes.length ? routes.map(r => {
      const firstStop = KBUtil.stopById(r.stops[0]);
      const nd = KBUtil.nextDeparture(r, firstStop.id);
      const nextLabel = nd.delayed ? `ETA ${nd.estimatedTime}` : `Next ${nd.scheduledTime}`;
      const delayRow = nd.delayed
        ? `<span>Delay</span><strong>+${nd.delayMins} min</strong>`
        : `<span>Status</span><strong>${nd.operating ? "Running" : "Closed now"}</strong>`;
      const stops = r.stops.map(id => KBUtil.stopById(id).name.split(" (")[0]).join(" › ");
      return `<button class="timetable-card" data-route-timetable="${r.id}">
        <div class="timetable-head">
          <b>${esc(r.name)}</b>
          <span class="timetable-next">${esc(nextLabel)}</span>
        </div>
        <div class="timetable-grid">
          <span>First bus</span><strong>${nd.first}</strong>
          <span>Last bus</span><strong>${nd.last}</strong>
          <span>Service</span><strong>${nd.serviceWindow}</strong>
          <span>Frequency</span><strong>${esc(nd.frequency)}</strong>
          ${delayRow}
        </div>
        <div class="timetable-stops">${esc(stops)}</div>
      </button>`;
    }).join("") : `<div class="timetable-empty">No routes match "${esc(timetableQuery)}". Try KP, CP, KDOJ, FKE, or Route A.</div>`;
  }

  function showRouteTimetable(routeId) {
    const route = KBUtil.routeById(routeId);
    if (!route) return;
    const firstStop = KBUtil.stopById(route.stops[0]);
    const nd = KBUtil.nextDeparture(route, firstStop.id);
    const stopNames = route.stops.map(id => KBUtil.stopById(id).name.split(" (")[0]);
    const [routeCode, routePath = "Campus shuttle route"] = route.name.split("—").map(s => s.trim());
    const metric = (label, value, extra = "") => `
      <div class="metric-card ${extra}">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
      </div>`;
    const groups = departureGroups(route).map(group => `
      <section class="day-group">
        <h3><span>${esc(group.title)}</span><small>${esc(group.range)}</small></h3>
        <div class="departures">
          ${group.items.map(d => `<span class="${d.scheduled === nd.scheduledTime ? "is-next" : ""}">${esc(d.estimated)}</span>`).join("")}
        </div>
      </section>`).join("");
    const detail = document.getElementById("routeTimetableDetail");
    detail.innerHTML = `
      <div class="route-detail-card">
        <div class="card-eyebrow">
          <span>Full-day route timetable</span>
          <small>${esc(nd.timeBasis)}</small>
        </div>
        <h2>${esc(routeCode)}</h2>
        <p>${esc(routePath)}</p>
        <div class="metric-grid">
          ${metric(nd.delayed ? "Estimated" : "Next bus", nd.delayed ? nd.estimatedTime : nd.scheduledTime, "is-primary")}
          ${metric("Frequency", nd.frequency)}
          ${metric("First bus", nd.firstEstimated || nd.first)}
          ${metric("Last bus", nd.lastEstimated || nd.last)}
        </div>
      </div>
      <div class="route-line-card">
        <div class="card-title">
          <span>Route stops</span>
          <small>${stopNames.length} stops</small>
        </div>
        <div class="route-line">
          ${stopNames.map((name, i) => `
            <span class="route-stop ${i === 0 ? "is-first" : ""} ${i === stopNames.length - 1 ? "is-last" : ""}">
              <i></i><b>${esc(name)}</b>
            </span>`).join("")}
        </div>
      </div>
      ${groups}
      <p class="source-note">Source: configured campus shuttle timetable from ${esc(firstStop.name.split(" (")[0])}.${nd.delayed ? ` Delay +${nd.delayMins} min included.` : ""}</p>`;
    showScreen("screen-route-timetable");
  }

  function showStop(stopId) {
    const s = KBUtil.stopById(stopId); if (!s) return;
    const servingRoutes = KBUtil.routesServing(stopId);
    const routeCards = servingRoutes.length ? servingRoutes.map(r => {
      const [routeCode, routePath = "Campus shuttle route"] = r.name.split("—").map(part => part.trim());
      const nd = KBUtil.nextDeparture(r, stopId);
      return `<div class="stop-route-card">
        <div>
          <strong>${esc(routeCode)}</strong>
          <span>${esc(routePath)}</span>
        </div>
        <em>${esc(nd.delayed ? `ETA ${nd.estimatedTime}` : `Next ${nd.scheduledTime}`)}</em>
      </div>`;
    }).join("") : `<div class="empty-card">No stored route serves this stop yet.</div>`;
    document.getElementById("stopDetail").innerHTML = `
      <div class="stop-overview-card">
        <span class="card-kicker">Bus stop</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.landmark)}</p>
      </div>
      <section class="transit-card">
        <div class="card-title">
          <span>Routes serving this stop</span>
          <small>${servingRoutes.length || "No"} route${servingRoutes.length === 1 ? "" : "s"}</small>
        </div>
        ${routeCards}
      </section>
      <section class="status-grid">
        <div class="status-card">
          <span>Data status</span>
          <strong>${esc(s.status || "Campus data")}</strong>
        </div>
        <div class="status-card">
          <span>Facilities nearby</span>
          <div class="facil">${s.facilities.map(f => `<em>${esc(f)}</em>`).join("")}</div>
        </div>
      </section>
      <section class="walking-card">
        <div class="walk-icon">↗</div>
        <div>
          <span>Walking direction</span>
          <p>${esc(s.walking)}</p>
        </div>
      </section>
      <p class="source-note">📚 Source: public route/stop listings where available; walking and ETA values use configured campus estimates.</p>`;
    showScreen("screen-stop");
  }

  /* ---- Alerts screen -------------------------------------------------- */
  function routeParts(route) {
    const [code, path = "Campus shuttle route"] = route.name.split("—").map(s => s.trim());
    return { code, path };
  }

  function delaySummary(route) {
    const stop = KBUtil.stopById(route.stops[0]);
    const nd = KBUtil.nextDeparture(route, stop.id);
    return `
      <div class="alert-grid">
        <span>Boarding point</span><strong>${esc(stop.name.split(" (")[0])}</strong>
        <span>Scheduled</span><strong>${nd.scheduledTime}</strong>
        <span>Estimated ETA</span><strong>${nd.estimatedTime}</strong>
        <span>Service window</span><strong>${nd.serviceWindow}</strong>
        <span>Frequency</span><strong>${esc(nd.frequency)}</strong>
      </div>`;
  }

  function renderAlerts() {
    const list = document.getElementById("alertList");
    const subs = document.getElementById("subList");
    if (!list || !subs) return;

    const mySubs = KB.subscriptions.filter(s => s.user === Chat.DEMO_USER);
    const delayed = subscribedDelayedRoutes();
    const hiddenDelayedCount = KB.delayedRoutes.length - delayed.length;
    const statusText = delayed.length
      ? `${delayed.length} active alert${delayed.length === 1 ? "" : "s"}`
      : "Subscribed routes clear";
    const statusNote = hiddenDelayedCount
      ? `${hiddenDelayedCount} delayed route${hiddenDelayedCount === 1 ? "" : "s"} hidden by subscription settings`
      : `${mySubs.length} subscribed route${mySubs.length === 1 ? "" : "s"} monitored`;
    const cards = delayed.length
      ? delayed.map(r => {
          const nd = KBUtil.nextDeparture(r, r.stops[0]);
          const { code, path } = routeParts(r);
          return `
          <article class="alert alert-active">
            <div class="alert-head">
              <div>
                <span class="alert-label">Delayed route</span>
                <h4>${esc(code)}</h4>
                <p>${esc(path)}</p>
              </div>
              <strong>+${nd.delayMins} min</strong>
            </div>
            ${delaySummary(r)}
            <div class="alert-source">Source: ${esc(r.source)} ${esc(KB.meta.lastUpdated)}</div>
            <time>Updated just now by staff control</time>
          </article>`;
        }).join("")
      : `<article class="alert info"><h4>No active delay on subscribed routes</h4>
           <p>${hiddenDelayedCount
             ? "Other delayed routes are not shown because Ali is not subscribed to them."
             : "All subscribed routes are running within the configured timetable."}</p></article>`;

    list.innerHTML = `
      <section class="alert-summary-card">
        <div>
          <span>Subscribed route status</span>
          <strong>${esc(statusText)}</strong>
          <small>${esc(statusNote)}</small>
        </div>
        <em class="${delayed.length ? "is-alert" : "is-clear"}">${delayed.length ? "Action" : "Normal"}</em>
      </section>
      ${cards}`;

    subs.innerHTML = KB.routes.map(r => {
      const on = mySubs.some(s => s.route === r.id);
      const { code, path } = routeParts(r);
      return `<div class="sub-row ${on ? "is-on" : ""}">
        <span><b>${esc(code)}</b><small>${esc(path)}</small></span>
        <button class="link-btn sub-toggle ${on ? "is-on" : ""}" data-sub="${r.id}">${on ? "On" : "Off"}</button></div>`;
    }).join("");
  }

  /* ---- Demo clock controls ------------------------------------------- */
  function updatePhoneClock() {
    const phoneTime = document.getElementById("phoneTime");
    if (!phoneTime) return;
    if (KB.clock.mode === "demo") {
      phoneTime.textContent = KB.clock.demoTime;
    } else {
      const d = new Date();
      phoneTime.textContent = String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0");
    }
  }

  function renderDemoTimeControls() {
    const select = document.getElementById("demoTimeSelect");
    const note = document.getElementById("demoTimeNote");
    if (!select || !note) return;
    const current = `${KB.clock.mode}|${KB.clock.mode === "demo" ? KB.clock.demoTime : ""}|${KB.clock.label}`;
    [...select.options].forEach(o => { o.selected = o.value === current; });
    note.textContent = `${KBUtil.clockSummary()}. Schedule and ETA cards use this time.`;
    updatePhoneClock();
  }

  /* ---- Staff Demo screen + resolution proof --------------------------- */
  function renderAdmin() {
    const box = document.getElementById("routeAdmin");
    if (!box) return;
    box.innerHTML = KB.routes.map(r => {
      const on = KBUtil.isDelayed(r.id);
      const stops = r.stops.map(id => KBUtil.stopById(id).name.split(" (")[0]).join(" › ");
      const delay = KBUtil.delayMinutes(r.id);
      const nd = KBUtil.nextDeparture(r, r.stops[0]);
      const { code, path } = routeParts(r);
      const staffWindow = `${r.operating.start.slice(0, 2)}-${r.operating.end}`;
      return `<div class="route-row ${on ? "is-delayed" : ""}">
        <div class="route-admin-main">
          <div class="route-admin-head">
            <div>
              <span class="staff-kicker">Route control</span>
              <div class="rname">${esc(code)}</div>
            </div>
            <span class="route-status-pill ${on ? "delayed" : "running"}">${on ? `Delayed +${delay} min` : "Running"}</span>
          </div>
          <div class="rpath">${esc(path)}</div>
          <div class="admin-metrics">
            <span><em>${on ? "ETA" : "Next"}</em><b>${esc(on ? nd.estimatedTime : nd.scheduledTime)}</b></span>
            <span><em>Service</em><b>${esc(staffWindow)}</b></span>
            <span><em>Freq.</em><b>${r.headway} min</b></span>
          </div>
          <div class="rstops">${esc(stops)}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-delay="${r.id}" ${on ? "checked" : ""}>
          <span class="slider"></span>
        </label></div>`;
    }).join("");
  }

  function issuePriority(type) {
    const t = type.toLowerCase();
    if (t.includes("did not arrive") || t.includes("missed")) return "High";
    if (t.includes("wrong")) return "Review";
    return "Open";
  }

  function renderStaffIssues() {
    const list = document.getElementById("staffIssueList");
    const count = document.getElementById("staffIssueCount");
    if (!list || !count) return;
    count.textContent = KB.feedbackLog.length
      ? `${KB.feedbackLog.length} open report${KB.feedbackLog.length === 1 ? "" : "s"}`
      : "No open reports";
    list.innerHTML = KB.feedbackLog.length
      ? KB.feedbackLog.map((f, i) => {
          const priority = issuePriority(f.type);
          return `<article class="staff-issue">
            <div class="issue-top">
              <span>${esc(f.type)}</span>
              <em class="${priority.toLowerCase()}">${esc(priority)}</em>
            </div>
            <p>${esc(f.text || "(no details provided)")}</p>
            <small>Report #${String(KB.feedbackLog.length - i).padStart(3, "0")} · ${esc(f.at)}</small>
          </article>`;
        }).join("")
      : `<div class="empty-card">No passenger reports yet. New Feedback submissions appear here for staff follow-up.</div>`;
  }

  function runProof(routeId) {
    const user = Chat.DEMO_USER;
    const result = Resolution.prove(user, routeId);
    const box = document.getElementById("proofBox");

    if (!result.steps.length) {
      box.innerHTML = `<div class="proof-result no">⛔ ${esc(result.reason)}</div>`;
      return;
    }
    const steps = result.steps.map(s => `
      <div class="proof-step ${s.tag === "⊥" ? "final" : ""}">
        <span class="tag">${esc(s.tag)}</span>
        <span class="cl">${esc(s.clause)}</span>
        <span class="why">${esc(s.why)}</span>
      </div>`).join("");
    box.innerHTML = steps +
      `<div class="proof-result ${result.proved ? "ok" : "no"}">
         ${result.proved ? "✅ " : "⚠️ "}${esc(result.message)}</div>`;
    (box.previousElementSibling || box).scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* When a route is toggled delayed: run proof + notify subscribers. */
  function onDelayToggle(routeId, isDelayed) {
    KBUtil.setDelayed(routeId, isDelayed);
    renderAdmin();
    renderStaffIssues();
    renderHome();
    if (document.getElementById("screen-timetable")?.classList.contains("is-active")) {
      renderTimetable();
    }
    if (isDelayed) {
      runProof(routeId);
      // Notify every subscriber for whom the proof succeeds.
      KB.subscriptions.filter(s => s.route === routeId).forEach(s => {
        if (Resolution.prove(s.user, routeId).proved) {
          // (In a real system this is a push; here it surfaces on Alerts.)
        }
      });
    } else {
      document.getElementById("proofBox").innerHTML =
        `<em class="muted">Route ${esc(routeId)} delay cleared. Toggle a delay to run the proof…</em>`;
    }
  }

  /* ---- Feedback screen ------------------------------------------------ */
  function renderFeedbackLog() {
    const log = document.getElementById("fbLog");
    if (!log) return;
    log.innerHTML = KB.feedbackLog.length
      ? KB.feedbackLog.map(f => `<div class="fb-item"><b>${esc(f.type)}</b> · ${esc(f.at)}<br>${esc(f.text || "(no details)")}</div>`).join("")
      : `<div class="empty">No reports yet.</div>`;
  }

  /* ---- event binding -------------------------------------------------- */
  function bind() {
    // Bottom tabs + any [data-screen] button.
    document.body.addEventListener("click", e => {
      const navBtn = e.target.closest("[data-screen]");
      if (navBtn) { showScreen(navBtn.dataset.screen); return; }

      const qa = e.target.closest(".qa[data-q]");
      if (qa) { showScreen("screen-chat"); Chat.send(qa.dataset.q); return; }

      const stopBtn = e.target.closest("[data-stop]");
      if (stopBtn) { showStop(stopBtn.dataset.stop); return; }

      const timetableBtn = e.target.closest("[data-route-timetable]");
      if (timetableBtn) { showRouteTimetable(timetableBtn.dataset.routeTimetable); return; }

      const subBtn = e.target.closest("[data-sub]");
      if (subBtn) {
        const rid = subBtn.dataset.sub;
        KBUtil.isSubscribed(Chat.DEMO_USER, rid)
          ? KBUtil.unsubscribe(Chat.DEMO_USER, rid)
          : KBUtil.subscribe(Chat.DEMO_USER, rid);
        renderAlerts();
        renderHome();
        return;
      }
    });

    // Delay toggles + demo clock (change event).
    document.body.addEventListener("change", e => {
      const clock = e.target.closest("#demoTimeSelect");
      if (clock) {
        const [mode, time, label] = clock.value.split("|");
        KBUtil.setClock(mode, time, label);
        renderDemoTimeControls();
        renderHome();
        if (document.getElementById("screen-timetable")?.classList.contains("is-active")) {
          renderTimetable();
        }
        return;
      }

      const t = e.target.closest("[data-delay]");
      if (t) onDelayToggle(t.dataset.delay, t.checked);
    });

    document.body.addEventListener("input", e => {
      const search = e.target.closest("#timetableSearch");
      if (!search) return;
      timetableQuery = search.value;
      renderTimetable();
    });

    // Chat composer.
    document.getElementById("chatForm").addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("chatInput");
      Chat.send(input.value); input.value = "";
    });

    // Feedback form.
    document.getElementById("feedbackForm").addEventListener("submit", e => {
      e.preventDefault();
      KBUtil.logFeedback({
        type: document.getElementById("fbType").value,
        text: document.getElementById("fbText").value.trim()
      });
      document.getElementById("fbText").value = "";
      renderFeedbackLog();
      renderStaffIssues();
      alert("✅ Report submitted. Logged for transport staff follow-up.");
    });
  }

  function init() {
    Chat.init();
    bind();
    renderHome();
    updatePhoneClock();
    setInterval(updatePhoneClock, 15000);
  }

  return { init, showScreen, showStop, showRouteTimetable };
})();

document.addEventListener("DOMContentLoaded", App.init);
window.App = App;
