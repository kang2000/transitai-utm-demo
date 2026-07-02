/* =============================================================================
 * TransitAI UTM — Resolution-Refutation Engine (resolution.js)
 * -----------------------------------------------------------------------------
 * A real (but deliberately scoped) first-order resolution prover that
 * reproduces the delay-notification proof from report section 5.6 / Figure 5.2.
 *
 * It proves   NotifyUser(user, route, delay)
 * from the knowledge-base clauses:
 *   P1: WantsRouteAlert(user, route)                         [fact, from KB]
 *   P2: Delayed(route)                                       [fact, from KB]
 *   P3: ¬Delayed(r) ∨ NeedDelayNotification(r)               (KB rule 5)
 *   P4: ¬WantsRouteAlert(u,r) ∨ ¬NeedDelayNotification(r)
 *        ∨ NotifyUser(u,r,delay)                             (KB rule 6)
 *   ¬NotifyUser(user, route, delay)                          [negated goal]
 *
 * Unification and resolution are genuinely computed; the *order* of resolution
 * is fixed so the on-screen trace always matches the report and never misfires
 * on unexpected input (Codex-recommended controlled-deterministic design).
 *
 * Literal representation:  { neg:Bool, pred:String, args:[Term] }
 * Term:                    { v:"r" }  (variable)   |  { c:"route_a" } (constant)
 * Clause:                  [Literal, ...]   (disjunction)
 * ========================================================================== */

const Resolution = (() => {

  /* ---- term / literal constructors ----------------------------------- */
  const V = name => ({ v: name });
  const C = name => ({ c: name });
  const lit = (neg, pred, args) => ({ neg, pred, args });

  const isVar = t => Object.prototype.hasOwnProperty.call(t, "v");
  const termStr = t => isVar(t) ? t.v : t.c;
  const litStr = l =>
    (l.neg ? "¬" : "") + l.pred + "(" + l.args.map(termStr).join(", ") + ")";
  const clauseStr = c => c.length ? c.map(litStr).join(" ∨ ") : "□ (empty clause)";

  /* ---- unification (no function symbols, so this is simple) ----------- */
  function walk(t, sub) {
    while (isVar(t) && sub[t.v]) t = sub[t.v];
    return t;
  }
  function unifyTerm(a, b, sub) {
    a = walk(a, sub); b = walk(b, sub);
    if (isVar(a)) { sub[a.v] = b; return sub; }
    if (isVar(b)) { sub[b.v] = a; return sub; }
    return a.c === b.c ? sub : null;          // both constants
  }
  function unifyLit(a, b, sub) {
    if (a.pred !== b.pred || a.args.length !== b.args.length) return null;
    for (let i = 0; i < a.args.length; i++) {
      sub = unifyTerm(a.args[i], b.args[i], sub);
      if (sub === null) return null;
    }
    return sub;
  }
  function applyTerm(t, sub) { t = walk(t, sub); return isVar(t) ? t : C(t.c); }
  function applyLit(l, sub) {
    return lit(l.neg, l.pred, l.args.map(t => applyTerm(t, sub)));
  }

  /* ---- resolve two clauses on the first complementary, unifiable pair -- */
  function resolve(cA, cB) {
    for (let i = 0; i < cA.length; i++) {
      for (let j = 0; j < cB.length; j++) {
        const la = cA[i], lb = cB[j];
        if (la.neg === lb.neg || la.pred !== lb.pred) continue;
        const sub = unifyLit({ ...la, neg: false }, { ...lb, neg: false }, {});
        if (sub === null) continue;
        const resolvent = [];
        cA.forEach((l, k) => { if (k !== i) resolvent.push(applyLit(l, sub)); });
        cB.forEach((l, k) => { if (k !== j) resolvent.push(applyLit(l, sub)); });
        // de-duplicate identical literals
        const seen = new Set(), dedup = [];
        resolvent.forEach(l => { const s = litStr(l); if (!seen.has(s)) { seen.add(s); dedup.push(l); } });
        return { resolvent: dedup, on: la.pred, sub };
      }
    }
    return null;
  }

  /* ---- build the clause set for a given (user, route) ----------------- */
  function buildClauses(user, route) {
    return {
      P1: [ lit(false, "WantsRouteAlert", [C(user), C(route)]) ],
      P2: [ lit(false, "Delayed", [C(route)]) ],
      P3: [ lit(true,  "Delayed", [V("r")]),
            lit(false, "NeedDelayNotification", [V("r")]) ],
      P4: [ lit(true,  "WantsRouteAlert", [V("u"), V("r")]),
            lit(true,  "NeedDelayNotification", [V("r")]),
            lit(false, "NotifyUser", [V("u"), V("r"), C("delay")]) ],
      NG: [ lit(true,  "NotifyUser", [C(user), C(route), C("delay")]) ]
    };
  }

  /* ---- run the controlled-deterministic proof ------------------------- */
  /* Preconditions tie the proof to live app state: the facts P1 (subscription)
     and P2 (route delayed) must actually hold, else there is nothing to prove. */
  function prove(user, route) {
    const subscribed = KBUtil.isSubscribed(user, route);
    const delayed    = KBUtil.isDelayed(route);

    if (!subscribed || !delayed) {
      return {
        proved: false,
        reason: !delayed
          ? `Route ${route} is not currently marked as delayed, so no delay notification is required (P2 is absent).`
          : `User "${user}" is not subscribed to ${route}, so there is no alert request (P1 is absent).`,
        steps: []
      };
    }

    const c = buildClauses(user, route);
    const steps = [];

    // Premises (shown first, matching the report's clause table).
    steps.push({ tag: "P1", clause: clauseStr(c.P1), why: `Fact: ${user} subscribed to ${route}.` });
    steps.push({ tag: "P2", clause: clauseStr(c.P2), why: `Fact: ${route} is delayed.` });
    steps.push({ tag: "P3", clause: clauseStr(c.P3), why: "KB rule 5: Delayed(r) → NeedDelayNotification(r)." });
    steps.push({ tag: "P4", clause: clauseStr(c.P4), why: "KB rule 6: WantsRouteAlert ∧ NeedDelayNotification → NotifyUser." });
    steps.push({ tag: "¬Goal", clause: clauseStr(c.NG), why: "Negated goal (assume the opposite)." });

    // Fixed resolution order = Figure 5.2.
    const r1 = resolve(c.P2, c.P3);                 // → NeedDelayNotification(route)
    steps.push({ tag: "R1", clause: clauseStr(r1.resolvent),
                 why: "Resolve P2 with P3 on Delayed." });

    const r2 = resolve(c.P1, c.P4);                 // → ¬NeedDelayNotification(route) ∨ NotifyUser(...)
    steps.push({ tag: "R2", clause: clauseStr(r2.resolvent),
                 why: "Resolve P1 with P4 on WantsRouteAlert." });

    const r3 = resolve(r1.resolvent, r2.resolvent); // → NotifyUser(user, route, delay)
    steps.push({ tag: "R3", clause: clauseStr(r3.resolvent),
                 why: "Resolve R1 with R2 on NeedDelayNotification." });

    const empty = resolve(r3.resolvent, c.NG);      // → □
    steps.push({ tag: "⊥", clause: clauseStr(empty.resolvent),
                 why: "Resolve R3 with the negated goal → empty clause (contradiction)." });

    const proved = empty.resolvent.length === 0;
    return {
      proved,
      conclusion: `NotifyUser(${user}, ${route}, delay)`,
      message: proved
        ? `Proof complete: an empty clause was derived, so NotifyUser(${user}, ${route}, delay) holds.`
        : "No contradiction derived.",
      steps
    };
  }

  return { prove, clauseStr, litStr };
})();

window.Resolution = Resolution;
