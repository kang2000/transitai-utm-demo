# TransitAI UTM Interactive Prototype

Hosted static demo for **TransitAI UTM**, a campus transport chatbot proof of
concept for MECS0033-52 Group 5.

## Live Demo

Open `index.html` through GitHub Pages. The chatbot runs fully in the browser:
there is no Firebase, no backend server, no API key, and no install step.

## What To Try

1. Ask: `When is the next bus to FKE?`
2. Ask: `How do I get from KTDI to P19 FKE?`
3. Ask: `When will the next bus arrive at CP?`
4. Open **Staff Demo**, set the demo time to `10:00`, and toggle
   **BAS A1/A2** delayed.
5. Open **Alerts** to show the proof-triggered notification.

## Prototype Boundary

Public route names and stop sequences were aligned to available UTM/KDOJ route
listings where possible. Timetable, ETA, headway, delay status, and missing
landmark mappings are prototype simulations because this proof of concept is
not connected to an official live shuttle feed.

## Included Files

| File | Purpose |
| --- | --- |
| `index.html` | Browser-based chatbot prototype |
| `css/styles.css` | App styling |
| `js/*.js` | Knowledge base, intent classifier, retriever, chat, and proof logic |
| `admin_manual.html` | Browser-readable administrator manual |
| `ADMIN_MANUAL.docx` | Word administrator manual for submission |
| `TransitAI_UTM_Prototype_Demo.pptx` | Teacher-facing demo deck |
| `DEMO_SCRIPT.md` | Presentation script and rubric mapping |
