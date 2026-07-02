/* =============================================================================
 * TransitAI UTM — Chat Controller + Conversation Memory (chat.js)
 * -----------------------------------------------------------------------------
 * Orchestrates the report's pipeline for each user turn:
 *   user query → intent recognition → KB retrieval → response generation,
 * keeping short session memory so follow-up questions resolve (report 4.2).
 * Renders chat bubbles + result cards and mirrors the pipeline into the side
 * "What the AI just did" panel for transparency.
 * ========================================================================== */

const Chat = (() => {
  const DEMO_USER = "ali";                 // the subscribed user in the proof
  const memory = { lastStop: null, lastRoute: null, lastIntent: null };

  let thread, intentChip, explainLog;

  /* ---- DOM helpers ---------------------------------------------------- */
  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function addMsg(role, html) {
    const m = el(`<div class="msg ${role}">${html}</div>`);
    thread.appendChild(m); scroll(); return m;
  }
  function addCard(html) { const c = el(`<div class="card">${html}</div>`); thread.appendChild(c); scroll(); return c; }
  function scroll() { thread.scrollTop = thread.scrollHeight; }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

  /* ---- side "explain" panel ------------------------------------------ */
  function explain(cls, conf, chunks, note) {
    const conviction = Math.round(conf * 100);
    const chunkList = chunks.length
      ? chunks.map(c => `<code>${c.type}:${c.id}</code> <span class="muted">(${c.sim})</span>`).join(", ")
      : '<span class="muted">none</span>';
    explainLog.innerHTML = `
      <li><span class="k">1 · Intent recognition</span><br>
        ${Intent.LABELS[cls] || cls}
        <div class="bar"><i style="width:${conviction}%"></i></div>
        <span class="muted">confidence ${conf}</span></li>
      <li><span class="k">2 · Knowledge retrieval (RAG-style)</span><br>
        top chunks: ${chunkList}</li>
      <li><span class="k">3 · Response generation</span><br>
        grounded answer rendered in chat</li>
      <li><span class="k">4 · Data source</span><br>
        <span class="muted">${esc(note)}</span></li>`;
  }
  function setChip(cls, conf) {
    intentChip.classList.remove("hidden");
    intentChip.innerHTML = `${Intent.LABELS[cls] || cls}<small>conf ${conf}</small>`;
  }

  /* ---- per-intent handlers ------------------------------------------- */
  function srcLine(note) { return `<span class="src">📚 Source: ${esc(note)}</span>`; }
  const routeDataLine = r => `<div class="row"><span>Route data</span><span>${esc(r.source || "Prototype data")}</span></div>`;
  const timeBasisLine = nd => `<div class="row"><span>Time basis</span><span>${esc(nd.timeBasis)}</span></div>`;

  function handleSchedule(q, note) {
    const stop = KBUtil.findStop(q) || (memory.lastStop && KBUtil.stopById(memory.lastStop));
    if (!stop) return addMsg("bot", "Which stop or faculty do you mean? e.g. <em>“next bus to FKE”</em>.");
    memory.lastStop = stop.id;
    const routes = KBUtil.routesServing(stop.id);
    if (!routes.length) return addMsg("bot", `I don't have a route serving ${esc(stop.name)} yet.`);
    addMsg("bot", `Here is the schedule for <strong>${esc(stop.name)}</strong>:`);
    routes.forEach(r => {
      const nd = KBUtil.nextDeparture(r, stop.id);
      memory.lastRoute = r.id;
      addCard(`
        <h4>🕑 ${esc(r.name)} ${nd.operating ? '<span class="pill ok">running</span>' : '<span class="pill warn">closed now</span>'}</h4>
        <div class="row"><span>Next departure</span><span class="big">${nd.time}</span></div>
        <div class="row"><span>Operating hours</span><span>${r.operating.start}–${r.operating.end}</span></div>
        <div class="row"><span>Every</span><span>${r.headway} min</span></div>
        <div class="row"><span>This stop</span><span>${esc(stop.name)}</span></div>
        ${timeBasisLine(nd)}
        ${routeDataLine(r)}
        ${srcLine(note)}`);
    });
  }

  function handleRoute(q, note) {
    const stops = KBUtil.findStops(q);
    let origin = stops[0], dest = stops[1];
    if (!dest && memory.lastStop && origin && origin.id !== memory.lastStop)
      dest = KBUtil.stopById(memory.lastStop);
    if (!origin || !dest) {
      addMsg("bot", "Tell me both points, e.g. <em>“from KTDI to PSZ Library”</em>.");
      return;
    }
    memory.lastStop = dest.id;
    const direct = KBUtil.routesBetween(origin.id, dest.id);
    if (direct.length) {
      const r = direct[0];
      const i = r.stops.indexOf(origin.id), j = r.stops.indexOf(dest.id);
      const seq = r.stops.slice(Math.min(i, j), Math.max(i, j) + 1);
      const seqHtml = seq.map(id => `<span>${esc(KBUtil.stopById(id).name.split(" (")[0])}</span>`).join('<i>›</i>');
      memory.lastRoute = r.id;
      addMsg("bot", `You can take a direct route from <strong>${esc(origin.name)}</strong> to <strong>${esc(dest.name)}</strong>:`);
      addCard(`
        <h4>🧭 ${esc(r.name)} <span class="pill">direct</span></h4>
        <div class="seq">${seqHtml}</div>
        <div class="row" style="margin-top:8px"><span>Board at</span><span>${esc(origin.name.split(" (")[0])}</span></div>
        <div class="row"><span>Alight at</span><span>${esc(dest.name.split(" (")[0])}</span></div>
        ${routeDataLine(r)}
        <button class="link-btn" data-stop="${dest.id}">View ${esc(dest.name.split(" (")[0])} stop detail ›</button>
        ${srcLine(note)}`);
    } else {
      addMsg("bot", `No verified single-route link is stored for those points. I will not invent a route; please use CP / Centre Point as the likely interchange and verify on the official schedule. ${srcLine(note)}`);
    }
  }

  function handleArrival(q, note) {
    const stop = KBUtil.findStop(q) || (memory.lastStop && KBUtil.stopById(memory.lastStop));
    if (!stop) return addMsg("bot", "Arrival for which stop? e.g. <em>“arrival at PSZ”</em>.");
    memory.lastStop = stop.id;
    const r = KBUtil.routesServing(stop.id)[0];
    if (!r) return addMsg("bot", `No route data for ${esc(stop.name)}.`);
    const nd = KBUtil.nextDeparture(r, stop.id);
    const away = nd.minsAway == null ? "—" : (nd.minsAway <= 0 ? "now" : nd.minsAway + " min");
    addMsg("bot", `Estimated arrival at <strong>${esc(stop.name)}</strong>:`);
    addCard(`
      <h4>⏱️ ${esc(r.name)} <span class="sim-tag">simulated ETA</span></h4>
      <div class="row"><span>Arriving in</span><span class="big">${away}</span></div>
      <div class="row"><span>Scheduled time</span><span>${nd.time}</span></div>
      ${timeBasisLine(nd)}
      <div class="row"><span>Last updated</span><span>just now (sim)</span></div>
      <div class="row muted"><span colspan="2">Fallback to timetable if live feed is unavailable.</span></div>
      ${routeDataLine(r)}
      ${srcLine(note)}`);
  }

  function handleStop(q, note) {
    const stop = KBUtil.findStop(q) || (memory.lastStop && KBUtil.stopById(memory.lastStop));
    if (!stop) return addMsg("bot", "Which stop? e.g. <em>“where is the FC bus stop?”</em>.");
    memory.lastStop = stop.id;
    addMsg("bot", `Opening stop detail for <strong>${esc(stop.name)}</strong>. ${srcLine(note)}`);
    App.showStop(stop.id);
  }

  function handleAlerts(note) {
    const delayed = KB.delayedRoutes.length;
    addMsg("bot", delayed
      ? `There ${delayed === 1 ? "is" : "are"} ${delayed} active delay alert(s). Opening the Alerts screen. ${srcLine(note)}`
      : `No active delays right now. You can subscribe to a route on the Alerts screen. ${srcLine(note)}`);
    App.showScreen("screen-alerts");
  }

  function handleFaq(q, note) {
    const r = Retriever.retrieve(q, 1);
    const faqChunk = r.chunks.find(c => c.type === "faq");
    if (faqChunk) return addMsg("bot", `${esc(faqChunk.ref.a)} ${srcLine(note)}`);
    return handleFallback();
  }

  function handleFeedback(note) {
    addMsg("bot", `Sorry about that. Opening the Feedback screen so transport staff can follow up. ${srcLine(note)}`);
    App.showScreen("screen-feedback");
  }

  function handleFallback() {
    addMsg("bot", "I'm not sure I understood. I can help with <strong>schedules</strong>, <strong>routes</strong>, <strong>arrival times</strong>, <strong>bus stops</strong>, and <strong>alerts</strong>. Try “next bus to FKE”.");
  }

  /* ---- main entry: process one user turn ----------------------------- */
  function send(text) {
    text = (text || "").trim(); if (!text) return;
    addMsg("user", esc(text));

    const res = Intent.classify(text);                 // 1 · intent
    const rag = Retriever.retrieve(text);              // 2 · retrieval
    const note = rag.sourceNote;
    setChip(res.intent, res.confidence);
    explain(res.intent, res.confidence, rag.chunks, note);
    memory.lastIntent = res.intent;

    switch (res.intent) {                              // 3 · response
      case "schedule_inquiry":  handleSchedule(text, note); break;
      case "route_guidance":    handleRoute(text, note);    break;
      case "arrival":           handleArrival(text, note);  break;
      case "bus_stop_location": handleStop(text, note);     break;
      case "alerts":            handleAlerts(note);         break;
      case "feedback":          handleFeedback(note);       break;
      case "faq":               handleFaq(text, note);      break;
      default:                  handleFallback();
    }
  }

  function init() {
    thread = document.getElementById("thread");
    intentChip = document.getElementById("intentChip");
    explainLog = document.getElementById("explainLog");
    addMsg("bot", "👋 Hi! I'm <strong>TransitAI UTM</strong>, your campus shuttle assistant. Ask me about schedules, routes, arrival times, bus stops, or alerts — or tap a quick action below.");
  }

  return { init, send, memory, DEMO_USER };
})();

window.Chat = Chat;
