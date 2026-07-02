/* =============================================================================
 * TransitAI UTM — Knowledge Base (kb.js)
 * -----------------------------------------------------------------------------
 * The data layer of the prototype (report section 4.4 "Knowledge Repository").
 *
 *  Data boundary: route labels and stop sequences are aligned to public
 *  UTM/DVC/KDOJ listings where available. Current operation, timetable,
 *  headway, ETA and walking notes are prototype simulation and must not be
 *  presented as the official live UTM shuttle schedule.
 *
 *  Everything is held in a single global `KB` object so the app also runs by
 *  opening index.html directly from disk (file://), with no server and no
 *  fetch() of external JSON.
 * ========================================================================== */

const KB = {
  meta: {
    campus: "UTM Johor Bahru",
    dataKind: "PUBLIC ROUTE NAMES + PROTOTYPE TIMING",
    lastUpdated: "Public route sources checked 2 July 2026",
    sourceNote: "Route names and stop sequences use public UTM/DVC/KDOJ route listings where available. Timetable, walking notes and ETA values use configured campus shuttle estimates for this assistant.",
    sourceUrls: [
      "https://dvcdev.utm.my/announcement/shuttle-bus-schedule/",
      "https://www.kdoj.com.my/insight/utm-bus-schedule/",
      "https://studentppi.utmspace.edu.my/wp-content/uploads/2024/12/Jadual-Bas-Shuttle-Kampus-UTM-JB-2025-01012025.pdf"
    ]
  },

  /* Demo clock. Default to a morning class time so the presentation does not
     depend on the real current time. Staff Demo can switch to live time or another
     fixed time. */
  clock: {
    mode: "demo",
    demoTime: "10:00",
    label: "Morning class demo"
  },

  /* ---- Bus stops -------------------------------------------------------- */
  /* id, name, common aliases (used by intent + retrieval), landmark,
     facilities and a short walking direction (Bus Stop Detail screen).      */
  stops: [
    { id: "cp", name: "CP / Centre Point (FABU area)",
      aliases: ["cp", "center point", "centre point", "fabu"],
      status: "public route stop",
      landmark: "Public UTM route listings use CP / Centre Point as a major interchange.",
      facilities: ["Interchange", "Nearby faculty area"],
      walking: "Use CP as the interchange point for most campus shuttle routes." },

    { id: "jln_amal", name: "Jalan Amal / Lingkaran Ilmu",
      aliases: ["jln amal", "jalan amal", "lingkaran ilmu"],
      status: "public route corridor",
      landmark: "Repeated in public route listings as the Lingkaran Ilmu corridor.",
      facilities: ["Campus road corridor"],
      walking: "Check the nearest visible shuttle shelter along the corridor." },

    { id: "kp", name: "KP (Kolej Perdana)",
      aliases: ["kp", "kolej perdana", "perdana"],
      status: "public route stop",
      landmark: "Residential-college origin in BAS A/B public route listings.",
      facilities: ["Residential college"],
      walking: "Board from the Kolej Perdana shuttle pick-up area." },

    { id: "k9k10", name: "K9/K10 (Kolej 9/10)",
      aliases: ["k9", "k10", "k9/10", "kolej 9", "kolej 10"],
      status: "public route stop",
      landmark: "Residential-college stop in BAS B/C public route listings.",
      facilities: ["Residential college"],
      walking: "Use the Kolej 9/10 shuttle pick-up area." },

    { id: "ktc", name: "KTC (Kolej Tuanku Canselor)",
      aliases: ["ktc", "kolej tuanku canselor", "tuanku canselor"],
      status: "public route stop",
      landmark: "Appears in public BAS C/E route sequences.",
      facilities: ["Residential college"],
      walking: "Board from the KTC shuttle waiting area." },

    { id: "kdoj", name: "KDOJ (Kolej Dato' Onn Jaafar)",
      aliases: ["kdoj", "dato onn", "kolej dato onn", "kolej dato' onn jaafar"],
      status: "public route stop",
      landmark: "Origin in BAS D/E public route listings.",
      facilities: ["Residential college"],
      walking: "Use the KDOJ main shuttle pick-up point." },

    { id: "klg", name: "KLG / KL6 area",
      aliases: ["klg", "kl6", "kolej lg", "kolej l6"],
      status: "public route stop label",
      landmark: "Appears in KDOJ/KDSE public route listings.",
      facilities: ["Residential area"],
      walking: "Confirm the exact shelter on campus signage." },

    { id: "kdse", name: "KDSE",
      aliases: ["kdse", "kolej datin seri endon", "seri endon"],
      status: "public route stop",
      landmark: "Appears in BAS D/E public route listings.",
      facilities: ["Residential college"],
      walking: "Board from the KDSE shuttle waiting area." },

    { id: "pku", name: "PKU (University Health Centre)",
      aliases: ["pku", "health centre", "pusat kesihatan", "clinic"],
      status: "public route stop",
      landmark: "Appears in BAS D public route listings.",
      facilities: ["Health centre"],
      walking: "Wait at the shuttle shelter serving PKU." },

    { id: "ktr", name: "KTR (Kolej Tun Razak)",
      aliases: ["ktr", "kolej tun razak", "tun razak"],
      status: "public route stop",
      landmark: "Origin in BAS F/G public route listings.",
      facilities: ["Residential college"],
      walking: "Board from the KTR shuttle pick-up area." },

    { id: "ktho", name: "KTHO (Kolej Tun Hussein Onn)",
      aliases: ["ktho", "tun hussein onn", "kolej tun hussein onn"],
      status: "public route stop",
      landmark: "Appears in BAS F/G public route listings.",
      facilities: ["Residential college"],
      walking: "Use the KTHO shuttle shelter." },

    { id: "ktdi", name: "KTDI (Kolej Tun Dr Ismail)",
      aliases: ["ktdi", "tun dr ismail", "kolej tun dr ismail", "hostel"],
      status: "public route stop",
      landmark: "Appears in BAS F/G public route listings.",
      facilities: ["Residential college"],
      walking: "Use the KTDI shuttle waiting area." },

    { id: "n24", name: "N24 / Cluster Area",
      aliases: ["n24", "cluster", "fc", "faculty of computing", "computing", "fsksm", "komputer"],
      status: "public route stop with prototype faculty alias",
      landmark: "N24 appears in BAS E/G route listings; FC alias is a prototype convenience for the report demo.",
      facilities: ["Academic cluster", "Nearby Faculty of Computing area"],
      walking: "Use N24 as the prototype drop-off for Faculty of Computing queries; confirm the exact faculty shelter in a real deployment." },

    { id: "skt", name: "SKT",
      aliases: ["skt"],
      status: "public route stop",
      landmark: "Destination corridor in BAS G public route listings.",
      facilities: ["Academic area"],
      walking: "Prototype walking note; confirm exact shelter with campus signage." },

    { id: "p19", name: "P19 / FKE Area",
      aliases: ["p19", "p19a", "fke", "electrical", "faculty of electrical engineering", "elektrik"],
      status: "public stop/area label with faculty alias",
      landmark: "Public bus-stop listings include Block P07/P19A near Fakulti Kejuruteraan Elektrik; BAS G lists P19.",
      facilities: ["Faculty area", "Lecture halls"],
      walking: "Alight at P19 for the FKE-area prototype. Confirm the exact shelter in production." },

    { id: "t02", name: "T02 Cluster",
      aliases: ["t02", "to2"],
      status: "public route stop",
      landmark: "Cluster stop in BAS B/E public route listings.",
      facilities: ["Academic cluster"],
      walking: "Use the T02 cluster shuttle shelter." },

    { id: "t08", name: "T08 Cluster",
      aliases: ["t08", "to8"],
      status: "public route stop",
      landmark: "Cluster stop in BAS B/E public route listings.",
      facilities: ["Academic cluster"],
      walking: "Use the T08 cluster shuttle shelter." },

    { id: "v01", name: "V01 (Taman U)",
      aliases: ["v01", "taman u", "tmn u", "taman universiti"],
      status: "public route stop",
      landmark: "Destination in BAS H public route listings.",
      facilities: ["Off-campus connection"],
      walking: "Use V01 as the Taman Universiti prototype stop." },

    { id: "psz", name: "PSZ Library (campus landmark, not verified route stop)",
      aliases: ["psz", "library", "perpustakaan", "perpustakaan sultanah zanariah"],
      status: "verified campus landmark; route stop unverified",
      landmark: "UTM Library lists Perpustakaan Sultanah Zanariah at UTM Johor Bahru.",
      facilities: ["Study spaces", "Library services"],
      walking: "Landmark note: no verified public shuttle route stop was found for PSZ, so the app will not invent a direct route." }
  ],

  /* ---- Shuttle routes --------------------------------------------------- */
  /* Each route has an ordered stop sequence, operating window and a fixed
     headway (minutes between buses). "Next bus" times are derived from these
     in nextDeparture() below — a deterministic simulation, not live GPS.     */
  routes: [
    { id: "route_a", name: "BAS A1/A2 — KP to Lingkaran Ilmu", color: "#1f6fd6",
      stops: ["kp", "cp", "jln_amal", "kp"],
      operating: { start: "07:00", end: "18:30" }, headway: 20,
      note: "Public route sequence: KP → CP → JLN AMAL → KP. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_b", name: "BAS B1/B2/B3 — KP/K9/K10 to Cluster", color: "#c0392b",
      stops: ["kp", "k9k10", "t02", "t08", "k9k10", "kp"],
      operating: { start: "07:00", end: "18:30" }, headway: 20,
      note: "Public route sequence: KP → K9/K10 → T02 → T08 → K9/K10 → KP. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_c", name: "BAS C1/C2/C3 — K9/K10 to Lingkaran Ilmu", color: "#27a05a",
      stops: ["k9k10", "ktc", "cp", "jln_amal", "ktc", "k9k10"],
      operating: { start: "07:00", end: "18:30" }, headway: 20,
      note: "Public route sequence: K9/K10 → KTC → CP → JLN AMAL → KTC → K9/K10. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_d", name: "BAS D1/D2 — KDOJ to Lingkaran Ilmu", color: "#7a0c2e",
      stops: ["kdoj", "klg", "kdse", "pku", "cp", "jln_amal", "kdoj"],
      operating: { start: "07:00", end: "18:30" }, headway: 30,
      note: "Public route sequence: KDOJ → KLG → KDSE → PKU → CP → JLN AMAL → KDOJ. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_e", name: "BAS E1/E2 — KDOJ/KL6/KDSE to Cluster", color: "#8e44ad",
      stops: ["kdoj", "klg", "kdse", "cp", "n24", "ktc", "t02", "t08"],
      operating: { start: "07:00", end: "18:30" }, headway: 30,
      note: "Public route lists KDOJ/KL6/KDSE to Cluster T02/T08 via CP, N24 and KTC. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_f", name: "BAS F1/F2/F3 — KTR/KTHO/KTDI to Lingkaran Ilmu", color: "#e67e22",
      stops: ["ktr", "ktho", "ktdi", "jln_amal", "cp", "ktr"],
      operating: { start: "07:00", end: "18:30" }, headway: 20,
      note: "Public route sequence: KTR → KTHO → KTDI → JLN AMAL → CP → KTR. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_g", name: "BAS G1/G2/G3 — KTR/KTHO/KTDI to SKT", color: "#16a085",
      stops: ["ktr", "ktho", "ktdi", "n24", "skt", "p19", "cp"],
      operating: { start: "07:00", end: "18:30" }, headway: 20,
      note: "Public route sequence: KTR/KTHO/KTDI to SKT via N24, SKT, P19 and CP. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." },

    { id: "route_h", name: "BAS H — CP to V01 (Taman U)", color: "#2c3e50",
      stops: ["cp", "jln_amal", "v01", "cp"],
      operating: { start: "07:00", end: "18:30" }, headway: 30,
      note: "Public route sequence: CP → JLN AMAL → V01 → CP. Timetable estimate configured in app.",
      source: "Public UTM/DVC/KDOJ route listing; timetable estimate configured in app." }
  ],

  /* ---- Frequently asked questions -------------------------------------- */
  faqs: [
    { q: "Is the shuttle free for students?",
      keywords: ["free", "fare", "cost", "price", "bayar", "tambang", "ticket"],
      a: "Yes — UTM campus shuttle buses are free for all students and staff. No ticket is needed; just board at any stop." },
    { q: "Do shuttles run on weekends or public holidays?",
      keywords: ["weekend", "holiday", "public holiday", "sunday", "saturday", "cuti"],
      a: "Shuttles run on a reduced timetable on weekends and may be suspended on public holidays. Check the Alerts screen for the latest notice." },
    { q: "How often do the buses come?",
      keywords: ["how often", "frequency", "interval", "headway", "berapa kerap"],
      a: "Most configured shuttle groups use a 20-minute headway, while BAS D/E/H use 30 minutes. Check the Alerts screen for route-specific updates." },
    { q: "Where can I report a problem?",
      keywords: ["report", "complain", "feedback", "problem", "wrong", "lapor", "aduan"],
      a: "Use the Feedback / Escalate screen to report wrong information or a missed bus. The report is logged for transport staff follow-up." }
  ],

  /* ---- Subscriptions & alerts (mutable demo state) ---------------------- */
  /* WantsRouteAlert(u,r) facts. Seeded so the resolution proof has a subject. */
  subscriptions: [
    { user: "ali", route: "route_a" }
  ],
  /* Delayed(r) facts, toggled from the Staff Demo panel. */
  delayedRoutes: [],
  /* Delay duration used by the Staff Demo. This is deliberately a simulation,
     not a live GPS prediction. */
  delayPolicy: {
    defaultMins: 12,
    label: "staff delay report"
  },
  /* Logged feedback / escalations (Feedback screen). */
  feedbackLog: []
};

/* =============================================================================
 * Helper functions over the knowledge base.
 * Pure-ish data helpers; intent + retrieval scoring live in their own modules.
 * ========================================================================== */
const KBUtil = {
  stopById(id)  { return KB.stops.find(s => s.id === id) || null; },
  routeById(id) { return KB.routes.find(r => r.id === id) || null; },

  /* Resolve a free-text place mention to a stop via name/alias match. */
  findStop(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    for (const s of KB.stops) {
      if (s.aliases.some(a => t.includes(a))) return s;
    }
    return null;
  },

  /* All stops mentioned in a piece of text, in mention order. */
  findStops(text) {
    if (!text) return [];
    const t = text.toLowerCase();
    const hits = [];
    for (const s of KB.stops) {
      const idx = Math.min(...s.aliases
        .map(a => t.indexOf(a)).filter(i => i >= 0).concat([Infinity]));
      if (idx !== Infinity) hits.push({ stop: s, idx });
    }
    return hits.sort((a, b) => a.idx - b.idx).map(h => h.stop);
  },

  /* Routes that serve a given stop id  ->  Serves(r,s). */
  routesServing(stopId) {
    return KB.routes.filter(r => r.stops.includes(stopId));
  },

  /* CanTravel(r,s,d): a single route serving both, with the origin appearing
     BEFORE the destination in the route's ordered stop sequence (directional —
     a shuttle visits stops in order, so PSZ→KTDI is not the same as KTDI→PSZ). */
  routesBetween(originId, destId) {
    return KB.routes.filter(r => {
      const i = r.stops.indexOf(originId), j = r.stops.indexOf(destId);
      return i >= 0 && j >= 0 && i < j;
    });
  },

  /* ---- Deterministic schedule simulation ----------------------------- */
  toMinutes(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; },
  fmt(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  },

  /* Current simulated campus time (uses the device clock — browser only). */
  nowMinutes() {
    if (KB.clock.mode === "demo") return this.toMinutes(KB.clock.demoTime);
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  },
  clockSummary() {
    return KB.clock.mode === "demo"
      ? `Demo time ${KB.clock.demoTime} (${KB.clock.label})`
      : "Live device time";
  },
  setClock(mode, time, label) {
    KB.clock.mode = mode;
    if (time) KB.clock.demoTime = time;
    KB.clock.label = label || (mode === "live" ? "Live device time" : "Custom demo time");
  },

  /* Next departure for a route at a stop. Returns schedule + simulated delay.
     Buses leave the route origin every `headway` mins from start..end; the
     offset to a stop is its index position in the sequence (1 min/stop demo). */
  nextDeparture(route, stopId) {
    const start = this.toMinutes(route.operating.start);
    const end   = this.toMinutes(route.operating.end);
    const offset = Math.max(0, route.stops.indexOf(stopId));
    const now = this.nowMinutes();
    const delayMins = this.delayMinutes(route.id);

    // Build today's departure times at this stop.
    const times = [];
    for (let t = start; t <= end; t += route.headway) times.push(t + offset);

    const withTiming = (scheduled, minsAway, operating) => {
      const estimated = scheduled + delayMins;
      return {
        operating,
        delayed: delayMins > 0,
        delayMins,
        delayLabel: KB.delayPolicy.label,
        time: this.fmt(scheduled),
        scheduledTime: this.fmt(scheduled),
        estimatedTime: this.fmt(estimated),
        minsAway,
        estimatedMinsAway: minsAway == null ? null : Math.max(0, estimated - now),
        first: this.fmt(times[0]),
        last: this.fmt(times[times.length - 1]),
        firstEstimated: this.fmt(times[0] + delayMins),
        lastEstimated: this.fmt(times[times.length - 1] + delayMins),
        serviceWindow: `${route.operating.start}–${route.operating.end}`,
        frequency: `Every ${route.headway} min`,
        timeBasis: this.clockSummary()
      };
    };

    const upcoming = times.filter(t => t >= now);
    if (now > end + offset) {
      return withTiming(times[0], null, false);
    }
    const time = upcoming.length ? upcoming[0] : times[0];
    return withTiming(time, upcoming.length ? time - now : null, now >= start && now <= end + offset);
  },

  /* Subscription / delay / feedback mutators (used by app + resolution). */
  isSubscribed(user, routeId) {
    return KB.subscriptions.some(s => s.user === user && s.route === routeId);
  },
  subscribe(user, routeId) {
    if (!this.isSubscribed(user, routeId)) KB.subscriptions.push({ user, route: routeId });
  },
  unsubscribe(user, routeId) {
    KB.subscriptions = KB.subscriptions.filter(s => !(s.user === user && s.route === routeId));
  },
  isDelayed(routeId)  { return KB.delayedRoutes.includes(routeId); },
  delayMinutes(routeId) {
    return this.isDelayed(routeId) ? KB.delayPolicy.defaultMins : 0;
  },
  setDelayed(routeId, on) {
    if (on && !this.isDelayed(routeId)) KB.delayedRoutes.push(routeId);
    if (!on) KB.delayedRoutes = KB.delayedRoutes.filter(r => r !== routeId);
  },
  logFeedback(entry) {
    KB.feedbackLog.unshift({ ...entry, at: new Date().toLocaleString() });
  }
};

/* Expose for non-module scripts. */
window.KB = KB;
window.KBUtil = KBUtil;
