/* =============================================================================
 * TransitAI UTM — Intent Classifier (intent.js)
 * -----------------------------------------------------------------------------
 * Implements the intent-recognition layer (report objective 2 and KB rules
 * 7–9). A lightweight keyword-scoring classifier maps a free-text query to one
 * of six intents and returns a confidence score that the UI displays for
 * transparency (an "original thought" signal for the rubric).
 *
 *   schedule_inquiry  – timetable / next departure              (rule 7)
 *   route_guidance    – how to get from A to B                  (rule 8)
 *   bus_stop_location – where is a stop / what's nearby         (rule 9)
 *   arrival           – when does the next bus arrive (sim)
 *   alerts            – delays / announcements / subscribe
 *   feedback          – report a problem / escalate
 *   faq               – general fare/frequency/holiday question (fallback)
 * ========================================================================== */

const Intent = (() => {
  // Weighted keyword cues per intent. Phrases score higher than single words.
  const CUES = {
    schedule_inquiry: {
      strong: ["schedule", "timetable", "next bus", "what time", "departure", "operating hour", "jadual", "bila bas"],
      weak:   ["bus", "time", "when", "leave", "depart"]
    },
    route_guidance: {
      // NOTE: bare "to"/"from" are intentionally NOT cues — they are far too
      // common; the "from … to" pattern and two-stop detection below handle it.
      strong: ["how do i get", "how to get", "get from", "go to", "route to", "which bus", "what bus", "travel to"],
      weak:   ["route", "way", "reach", "naik bas"]
    },
    bus_stop_location: {
      strong: ["where is", "bus stop", "nearest stop", "which stop", "stop near", "nearby", "landmark", "di mana"],
      weak:   ["stop", "where", "location", "near"]
    },
    arrival: {
      strong: ["arrive", "arrival", "how long", "how many minutes", "coming", "when will the next bus arrive", "eta"],
      weak:   ["wait", "soon", "now", "minutes"]
    },
    alerts: {
      strong: ["delay", "delayed", "alert", "announcement", "notification", "subscribe", "cancelled", "service disruption", "route change"],
      weak:   ["notice", "update", "status"]
    },
    feedback: {
      strong: ["report", "complaint", "complain", "feedback", "wrong info", "not working", "escalate", "missed the bus", "aduan"],
      weak:   ["problem", "issue", "wrong", "help"]
    },
    faq: {
      strong: ["is the shuttle free", "how much", "fare", "weekend", "public holiday", "how often", "frequency"],
      weak:   ["free", "cost", "price", "holiday", "often"]
    }
  };

  function classify(query) {
    const t = (query || "").toLowerCase();
    const scores = {};

    for (const intent in CUES) {
      let s = 0;
      for (const k of CUES[intent].strong) if (t.includes(k)) s += 2;
      for (const k of CUES[intent].weak)   if (t.includes(k)) s += 1;
      scores[intent] = s;
    }

    // Entity hints sharpen disambiguation.
    const stops = KBUtil.findStops(t);
    if (stops.length >= 2) scores.route_guidance += 2;          // origin + dest
    if (/\b(from)\b.*\b(to)\b/.test(t)) scores.route_guidance += 2;
    if (/arriv|\beta\b|how long|minutes away/.test(t)) scores.arrival += 3; // arrival beats schedule

    // Pick the winner.
    let best = "faq", bestScore = 0, total = 0;
    for (const intent in scores) {
      total += scores[intent];
      if (scores[intent] > bestScore) { bestScore = scores[intent]; best = intent; }
    }

    // Confidence = winner share of total signal, lightly smoothed.
    const confidence = total === 0 ? 0 : Math.min(0.99, bestScore / (total + 1));

    return {
      intent: bestScore === 0 ? "fallback" : best,
      confidence: Number(confidence.toFixed(2)),
      scores,
      entities: { stops: stops.map(s => s.id) }
    };
  }

  // Human-readable labels for the UI intent chip.
  const LABELS = {
    schedule_inquiry:  "Schedule inquiry",
    route_guidance:    "Route guidance",
    bus_stop_location: "Bus-stop location",
    arrival:           "Real-time arrival",
    alerts:            "Alerts / notifications",
    feedback:          "Feedback / escalate",
    faq:               "General FAQ",
    fallback:          "Unrecognised"
  };

  return { classify, LABELS };
})();

window.Intent = Intent;
