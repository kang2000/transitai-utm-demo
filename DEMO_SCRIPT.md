# TransitAI UTM — Demo Script & Rubric Mapping

A 2–3 minute scripted walkthrough for the prototype demo, plus a table mapping
each feature to the prototype rubric (slides 28–32).

---

## Demo script

**Setup:** open `index.html` (or run `python3 -m http.server` and open
`http://localhost:8000`). Keep the right-hand *“What the AI just did”* panel
visible — it exposes the AI pipeline live.

1. **Intro (10s).** “TransitAI UTM is a campus shuttle chatbot. It uses intent
   recognition, a knowledge base with RAG-style retrieval, conversation memory,
   and a logic engine for delay alerts. Everything runs offline. Route labels
   are aligned to public UTM/KDOJ route listings where available, while ETA and
   headway values are labelled as prototype simulation.”

2. **Schedule inquiry (20s).** Tap **🕑 Next bus** (or type
   *“When is the next bus to FKE?”*). Point out: the **intent chip** shows
   *Schedule inquiry* with a confidence; the answer card shows next departure +
   operating hours + **Demo time 10:00** + a **data-source note**; the side
   panel shows the pipeline.

3. **Route guidance + memory (25s).** Type *“How do I get from KTDI to P19
   FKE?”* → BAS G1/G2/G3 route guidance with a **stop sequence**. Then a
   follow-up: *“What about from KTHO?”* — note the chatbot reuses
   **conversation memory** for the destination.

4. **Real-time arrival (15s).** Type *“When will the next bus arrive at CP?”* →
   simulated ETA, clearly labelled **simulated** with a fallback note and demo
   time basis.

5. **Bus stop detail (10s).** Type *“Where is the FC bus stop?”* → opens the
   **Bus Stop Detail** screen. Explain that FC is mapped to the N24 / Cluster
   area as a prototype convenience because an exact official FC shuttle-stop
   mapping was not found.

6. **Demo-time control (15s).** Open **🛠️ Staff Demo**, change **Demo time** from
   10:00 to 20:30, then return to a schedule query to show the route becomes
   closed. Switch back to 10:00 for the rest of the demo.

7. **★ Delay alert + resolution proof (40s — the highlight).** In **🛠️ Staff Demo**,
   toggle **BAS A1/A2 — KP to Lingkaran Ilmu** to *delayed*. The **resolution-refutation
   proof** runs and prints P1–P4, the negated goal, and steps R1→R3→⊥, proving
   `NotifyUser(ali, route_a, delay)` — exactly the report's Figure 5.2. Open
   **🔔 Alerts** to show the resulting user notification. Explain it can’t
   misfire: the proof only runs when the facts actually hold.

8. **Feedback (10s).** Open **📝 Feedback**, submit a report → logged for staff.

9. **Close (10s).** “The Word Administrator Manual documents every component,
   how to edit routes/stops/intents, how data is sourced, and the operating
   procedure with screenshots.”

---

## Rubric mapping

| Rubric criterion | Where it is demonstrated | Evidence shown to the grader |
|------------------|--------------------------|------------------------------|
| **Originality / Interactive Screen** — original thought, creative & inventive, interactive UI that receives input and shows output | Whole app, phone-frame UI, free-text + quick actions | Live intent chip + confidence; *“What the AI just did”* transparency panel; **real resolution-refutation proof** tied to the report’s logic; RAG-style retrieval with source notes |
| **Problem Solving** — problem clearly addressed & well explained | All chatbot flows map to the report’s surveyed pain points | Schedule uncertainty → Schedule/Arrival screens; night presentation issue → Demo time control; route confusion → Route Guidance; missing delay alerts → Alerts + logic engine; wrong info → Feedback/Escalate |
| **Admin Manual** — well-presented, design described, clear, supported process | `ADMIN_MANUAL.docx` (+ `ADMIN_MANUAL.md` and `admin_manual.html`) | Component/function map; data-source truth table; configuration; screenshot-based steps; proof procedure; troubleshooting |
| Receives input from user | Chat composer + quick actions + forms | Typed queries, Staff Demo toggles, feedback form |
| Displays appropriate output | Result cards, proof trace, alerts, stop detail | Schedule/route/arrival cards, notifications |

---

## Screen ↔ report coverage

All eight storyboard screens (report Table 5.5) are present:
Home/Welcome · Chat Query · Schedule Result · Route Guidance ·
Real-Time Arrival · Alerts · Bus Stop Detail · Feedback/Escalate,
following the navigation flow in report Figure 5.1. The prototype also includes
Staff Demo and demo-time controls to make the proof and schedule behavior repeatable
during presentation.
