# TransitAI UTM — Administrator Manual

**Product:** TransitAI UTM — Web-Based Campus Transport Chatbot (Prototype)
**Course:** MECS0033-52 Artificial Intelligence · Group 5
**Audience:** Transport administrators / maintainers of the prototype
**Scope:** This manual documents the prototype's components, configuration, and
operating procedures, as required by the project rubric (Admin Manual criterion).

---

## 1. Overview

TransitAI UTM is a browser-based chatbot that answers UTM campus shuttle
questions. It reproduces the AI pipeline from the design report —
**intent recognition → knowledge retrieval (RAG-style) → response generation**,
plus a **resolution-refutation** logic engine for delay notifications.

The prototype is fully client-side: HTML + CSS + vanilla JavaScript, with the
knowledge base embedded in `js/kb.js`. There is **no server, database, API key,
or build step**.

**Data truth policy:** route names and route sequences are aligned to public
UTM/DVC/KDOJ route listings where available. Current operation, schedule times,
headway values, live arrival ETA, walking notes, and some faculty aliases are
prototype simulations because no fully verified, machine-readable live feed was
connected to this POC.

---

## 2. Component (library/function) map

No third-party libraries are used — only the browser's native APIs (DOM,
`Date`). The system is organised into six JavaScript modules, each a self-
contained unit with a clear responsibility.

| Module | Global | Key functions | Responsibility |
|--------|--------|---------------|----------------|
| `js/kb.js` | `KB`, `KBUtil` | `findStop`, `findStops`, `routesServing`, `routesBetween`, `nextDeparture`, `subscribe`, `setDelayed`, `logFeedback` | Knowledge repository (data layer) + data helpers |
| `js/intent.js` | `Intent` | `classify(query)` → `{intent, confidence, scores, entities}` | Intent recognition over 6 intents (report rules 7–9) |
| `js/retriever.js` | `Retriever` | `retrieve(query, k)` → `{chunks, sourceNote}` | RAG-style token-overlap retrieval + source note |
| `js/resolution.js` | `Resolution` | `prove(user, route)` → `{proved, steps, message}` | First-order resolution-refutation engine (Figure 5.2) |
| `js/chat.js` | `Chat` | `send(text)`, `init()` | Conversation controller + session memory + rendering |
| `js/app.js` | `App` | `showScreen`, `showStop`, `renderAlerts`, `renderAdmin`, `runProof` | Screen routing + Staff Demo/Alerts/Feedback/Stop controllers |

**Load order matters** (declared at the bottom of `index.html`):
`kb.js → intent.js → retriever.js → resolution.js → chat.js → app.js`.
Engines depend on `KB`/`KBUtil`; controllers depend on the engines.

### Data-flow per user turn (`Chat.send`)
```
user text
  → Intent.classify()      (1) detect intent + confidence
  → Retriever.retrieve()   (2) fetch top KB chunks + source note
  → per-intent handler     (3) build grounded response (card/message)
  → memory + explain panel  (   update session context + transparency panel)
```
Delay alerts use a separate path: **Staff Demo toggle → `KBUtil.setDelayed` →
`Resolution.prove` → Alerts screen**. Demo-time controls use
`KBUtil.setClock()` so the same presentation can show morning, lunch, evening
or night behavior without depending on the real device clock.

---

## 3. Data source and accuracy policy

| Data shown in prototype | Status | How to explain it |
|---|---|---|
| BAS A/B/C/D/E/F/G/H route labels and public stop sequences | Public route listing aligned | Used from public UTM/DVC/KDOJ route pages where available. Some public effective-date fields are historical, so use these only as route/sequence references, not proof of current live operation. |
| CP, KP, K9/K10, KTC, KDOJ, KLG/KL6, KDSE, PKU, KTR, KTHO, KTDI, N24, SKT, P19, T02, T08, V01 | Public route stop labels | Used as route-stop codes because they appear in public route listings. |
| FKE query support | Partially verified mapping | Mapped to P19 / FKE area. Public bus-stop pages list FKE-area stops near Lingkaran Ilmu, while the UTM route list uses P19. |
| FC query support | Prototype mapping | Mapped to N24 / Cluster Area for demo because N24 appears in public route listings and FC is commonly discussed near N24, but an official FC shuttle stop mapping was not found. |
| PSZ Library | Verified campus landmark, not verified route stop | The app can describe it as a landmark, but it does not invent a direct route to PSZ. |
| Next departure, operating hours, headway, ETA | Prototype simulation | Used only to demonstrate AI response flow and demo-time behavior. Not official timetable data. |
| Delay alerts | Prototype simulation | Staff Demo toggle simulates transport staff publishing a disruption. |

Sources checked:
- UTM DVC Development shuttle bus schedule page:
  `https://dvcdev.utm.my/announcement/shuttle-bus-schedule/`
- KDOJ UTM Bus Schedule route list:
  `https://www.kdoj.com.my/insight/utm-bus-schedule/`
- UTM JB 2025 shuttle timetable PDF:
  `https://studentppi.utmspace.edu.my/wp-content/uploads/2024/12/Jadual-Bas-Shuttle-Kampus-UTM-JB-2025-01012025.pdf`

---

## 4. Configuration notes

All configuration is plain data in `js/kb.js`. After editing, **save and reload
the browser** — no rebuild needed.

### 4.1 Add or edit a bus stop
Edit the `KB.stops` array:
```js
{ id: "fkm", name: "FKM (Faculty of Mechanical Engineering)",
  aliases: ["fkm", "mechanical", "mekanikal"],   // words users may type
  status: "prototype mapping",
  landmark: "FKM main block.",
  facilities: ["Lecture halls", "Café"],
  walking: "Stop is at the FKM drop-off bay." }
```
- `id` must be unique (lowercase).
- `aliases` drive both intent entity-matching and retrieval — add common
  spellings, abbreviations and Malay terms.

### 4.2 Add or edit a route
Edit the `KB.routes` array:
```js
{ id: "route_g", name: "BAS G1/G2/G3 — KTR/KTHO/KTDI to SKT",
  color: "#16a085",
  stops: ["ktr", "ktho", "ktdi", "n24", "skt", "p19", "cp"],
  operating: { start: "07:00", end: "18:30" }, // simulated demo window
  headway: 20,                               // simulated interval
  note: "Public route sequence; timings are simulated.",
  source: "Public UTM/DVC/KDOJ route listing; current timing simulated/unverified." }
```
`nextDeparture()` derives demonstration timetable times from `operating` +
`headway`, so the app can show a repeatable POC without a live shuttle feed.

### 4.3 Add an FAQ
Edit `KB.faqs` — provide `q`, `keywords` (for retrieval), and `a` (answer).

### 4.4 Tune intent recognition
Edit the `CUES` table in `js/intent.js`. `strong` cues score 2, `weak` cues
score 1. Add phrases users actually type. Keep ultra-common words (e.g. bare
“to”, “from”) out of `strong` to avoid over-triggering route guidance.

### 4.5 Seed subscriptions / demo user
`KB.subscriptions` holds `WantsRouteAlert(user, route)` facts. The demo user is
`ali` (set as `Chat.DEMO_USER` in `js/chat.js`). The proof in §4 requires the
target user to be subscribed to the delayed route.

### 4.6 Demo time control
The default clock is `KB.clock.demoTime = "10:00"` so the app does not show
“closed now” during a night presentation. In the Staff Demo screen, choose:
`08:00`, `10:00`, `13:00`, `17:30`, `20:30`, or `Live device time`.

### 4.7 Branding
Colours live in `css/styles.css` under `:root` (`--maroon`, `--gold`).

---

## 5. Operating procedure — delay alert with logic proof

This is the prototype's signature feature and maps to report §5.6 / Figure 5.2.

1. Open the **🛠️ Staff Demo** tab.
2. Toggle a route (e.g. *BAS A1/A2 — KP to Lingkaran Ilmu*) to **delayed**.
3. The **Resolution proof trace** panel runs `Resolution.prove("ali","route_a")`
   and prints the derivation:
   - `P1 WantsRouteAlert(ali, route_a)` · `P2 Delayed(route_a)`
   - `P3 ¬Delayed(r) ∨ NeedDelayNotification(r)`
   - `P4 ¬WantsRouteAlert(u,r) ∨ ¬NeedDelayNotification(r) ∨ NotifyUser(u,r,delay)`
   - `¬Goal ¬NotifyUser(ali, route_a, delay)`
   - `R1, R2, R3 → ⊥ (empty clause)` ⇒ **NotifyUser(ali, route_a, delay) proven**.
4. Open the **🔔 Alerts** tab to see the resulting user notification.
5. Toggle the route back to clear the delay.

**Why it cannot misfire:** `prove()` only runs the derivation when the facts
actually hold (user subscribed **and** route delayed); otherwise it returns a
clear "nothing to prove" message. Proof inputs come from app state, never from
unparsed free text.

---

## 6. Usage guide (end-user features)

| Screen | How to reach it | What it does |
|--------|-----------------|--------------|
| Home / Chat | default | Free-text + quick-action buttons |
| Schedule Result | ask “next bus to …” | Next departure, hours, headway, source |
| Route Guidance | “from X to Y” | Direct route + stop sequence |
| Real-Time Arrival | “arrival at …” | Simulated ETA with fallback note |
| Bus Stop Detail | “where is … stop” | Landmark, facilities, walking direction |
| Alerts | 🔔 tab | Delay notices + route subscriptions |
| Feedback / Escalate | 📝 tab | Logs an issue for staff |
| Staff Demo | 🛠️ tab | Toggle delays, view proof |
| Staff Demo time | 🛠️ tab → Demo time | Change the simulated clock for presentation |

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank screen / nothing responds | Scripts blocked or wrong load order | Reload; check the browser console; ensure all `js/*.js` files are present |
| Quick actions show nothing | Opened a stale copy | Hard-refresh (Cmd/Ctrl+Shift+R) |
| Schedule shows “closed now” | Demo time or live time outside operating hours | Use Staff Demo → Demo time → 10:00 for presentation, or switch to 20:30 to intentionally demonstrate closed-service behavior |
| Proof says “not currently delayed” | Route not toggled / user not subscribed | Toggle the route in Staff Demo and ensure the user is in `KB.subscriptions` |
| Wrong intent detected | Missing cue word | Add the phrase to `CUES` in `js/intent.js` (§4.4) |
| Data edits not showing | Browser cache | Save `kb.js` and hard-refresh |

---

## 8. Limitations (prototype scope)

- Sample data only; no live GPS/timetable feed (arrival is simulated).
- Retrieval is token-overlap, not a real vector database.
- The resolution engine is scoped to the delay-notification clause set.
- Notifications appear in-app (Alerts screen); no real push delivery.

These are intentional for a 10% proof-of-concept; the production design
(LLM + RAG + vector DB + Notification API) is described in the report.
