/* =============================================================================
 * TransitAI UTM — App Router & Screen Controllers (app.js)
 * -----------------------------------------------------------------------------
 * Wires the navigation flow (report Figure 5.1), the Staff Demo panel that drives
 * the resolution-refutation proof, and the Alerts / Bus-Stop / Feedback
 * screens. Loaded last; binds everything on DOMContentLoaded.
 * ========================================================================== */

const App = (() => {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

  /* ---- screen routing ------------------------------------------------- */
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s =>
      s.classList.toggle("is-active", s.id === id));
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("is-active", t.dataset.screen === id));
    if (id === "screen-alerts")   renderAlerts();
    if (id === "screen-admin")    { renderDemoTimeControls(); renderAdmin(); }
    if (id === "screen-feedback") renderFeedbackLog();
  }

  function showStop(stopId) {
    const s = KBUtil.stopById(stopId); if (!s) return;
    const routes = KBUtil.routesServing(stopId).map(r => r.name).join(", ") || "—";
    document.getElementById("stopDetail").innerHTML = `
      <div class="hero">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.landmark)}</p>
      </div>
      <div class="row"><strong>Routes serving this stop</strong></div>
      <p style="font-size:13px;margin:4px 0 10px">${esc(routes)}</p>
      <div class="row"><strong>Data status</strong></div>
      <p style="font-size:13px;margin:4px 0 10px">${esc(s.status || "prototype data")}</p>
      <div class="row"><strong>Facilities nearby</strong></div>
      <div class="facil">${s.facilities.map(f => `<span>${esc(f)}</span>`).join("")}</div>
      <div class="row" style="margin-top:8px"><strong>Walking direction</strong></div>
      <p style="font-size:13px;margin:4px 0">${esc(s.walking)}</p>
      <span class="src" style="font-size:11px;color:#6b7280">📚 ${esc(KB.meta.sourceNote)}</span>`;
    showScreen("screen-stop");
  }

  /* ---- Alerts screen -------------------------------------------------- */
  function delaySummary(route) {
    const stop = KBUtil.stopById(route.stops[0]);
    const nd = KBUtil.nextDeparture(route, stop.id);
    return `
      <div class="alert-grid">
        <span>Next bus</span><strong>${esc(stop.name.split(" (")[0])}</strong>
        <span>Scheduled</span><strong>${nd.scheduledTime}</strong>
        <span>Estimated</span><strong>${nd.estimatedTime}</strong>
        <span>Delay</span><strong>+${nd.delayMins} min</strong>
        <span>Service</span><strong>${nd.serviceWindow}, ${esc(nd.frequency.toLowerCase())}</strong>
      </div>`;
  }

  function renderAlerts() {
    const list = document.getElementById("alertList");
    const subs = document.getElementById("subList");

    const delayed = KB.delayedRoutes.map(rid => KBUtil.routeById(rid));
    list.innerHTML = delayed.length
      ? delayed.map(r => `
          <div class="alert">
            <h4>⚠️ ${esc(r.name)} delayed</h4>
            <p>Service is running late. Subscribed users were notified by the resolution-logic engine.</p>
            ${delaySummary(r)}
            <time>just now · prototype simulation</time>
          </div>`).join("")
      : `<div class="alert info"><h4>✅ No active delays</h4>
           <p>All routes are running to the simulated schedule. Route cards show first/last bus and service frequency.</p></div>`;

    const mySubs = KB.subscriptions.filter(s => s.user === Chat.DEMO_USER);
    subs.innerHTML = KB.routes.map(r => {
      const on = mySubs.some(s => s.route === r.id);
      return `<div class="sub-row"><span>${esc(r.name)}</span>
        <button class="link-btn" data-sub="${r.id}">${on ? "Unsubscribe" : "Subscribe"}</button></div>`;
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
    box.innerHTML = KB.routes.map(r => {
      const on = KBUtil.isDelayed(r.id);
      const stops = r.stops.map(id => KBUtil.stopById(id).name.split(" (")[0]).join(" › ");
      const delay = KBUtil.delayMinutes(r.id);
      return `<div class="route-row">
        <div>
          <div class="rname">${esc(r.name)}</div>
          <div class="rstops">${esc(stops)}</div>
          <div class="rschedule">Service ${esc(r.operating.start)}–${esc(r.operating.end)} · every ${r.headway} min${delay ? ` · delayed +${delay} min` : ""}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-delay="${r.id}" ${on ? "checked" : ""}>
          <span class="slider"></span>
        </label></div>`;
    }).join("");
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
  }

  /* When a route is toggled delayed: run proof + notify subscribers. */
  function onDelayToggle(routeId, isDelayed) {
    KBUtil.setDelayed(routeId, isDelayed);
    renderAdmin();
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

      const subBtn = e.target.closest("[data-sub]");
      if (subBtn) {
        const rid = subBtn.dataset.sub;
        KBUtil.isSubscribed(Chat.DEMO_USER, rid)
          ? KBUtil.unsubscribe(Chat.DEMO_USER, rid)
          : KBUtil.subscribe(Chat.DEMO_USER, rid);
        renderAlerts();
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
        return;
      }

      const t = e.target.closest("[data-delay]");
      if (t) onDelayToggle(t.dataset.delay, t.checked);
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
      alert("✅ Report submitted. Logged for transport staff follow-up (prototype).");
    });
  }

  function init() {
    Chat.init();
    bind();
    updatePhoneClock();
    setInterval(updatePhoneClock, 15000);
  }

  return { init, showScreen, showStop };
})();

document.addEventListener("DOMContentLoaded", App.init);
window.App = App;
