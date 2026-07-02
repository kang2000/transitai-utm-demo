/* =============================================================================
 * TransitAI UTM — RAG-style Retriever (retriever.js)
 * -----------------------------------------------------------------------------
 * Emulates the retrieval step of the report's RAG pipeline (section 4.2/4.4).
 * Instead of a real vector database, knowledge-base entries are flattened into
 * text "chunks" and scored against the query with token-overlap similarity
 * (a transparent stand-in for semantic search). Every answer surfaces a
 * data-source note, matching the storyboard requirement (Table 5.5).
 * ========================================================================== */

const Retriever = (() => {
  const STOP_WORDS = new Set(["the","a","an","is","to","of","for","and","or","in",
    "on","at","my","i","do","does","when","what","where","how","me","you","bus","next"]);

  function tokenize(text) {
    return (text || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w && !STOP_WORDS.has(w));
  }

  // Build the searchable corpus once from the live KB.
  function buildCorpus() {
    const docs = [];
    KB.routes.forEach(r => docs.push({
      type: "route", id: r.id,
      text: `${r.name} ${r.note} stops ${r.stops.join(" ")}`,
      ref: r
    }));
    KB.stops.forEach(s => docs.push({
      type: "stop", id: s.id,
      text: `${s.name} ${s.aliases.join(" ")} ${s.landmark} ${s.facilities.join(" ")}`,
      ref: s
    }));
    KB.faqs.forEach((f, i) => docs.push({
      type: "faq", id: "faq_" + i,
      text: `${f.q} ${f.keywords.join(" ")} ${f.a}`,
      ref: f
    }));
    return docs;
  }

  // Cosine-ish overlap: shared tokens / sqrt(len product). 0..1.
  function score(queryTokens, docTokens) {
    if (!queryTokens.length || !docTokens.length) return 0;
    const dset = new Set(docTokens);
    let shared = 0;
    for (const q of new Set(queryTokens)) if (dset.has(q)) shared++;
    return shared / Math.sqrt(queryTokens.length * dset.size);
  }

  // Return top-k chunks with similarity, plus a single source note.
  function retrieve(query, k = 3) {
    const corpus = buildCorpus();
    const qTokens = tokenize(query);
    const ranked = corpus
      .map(d => ({ ...d, sim: Number(score(qTokens, tokenize(d.text)).toFixed(3)) }))
      .filter(d => d.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, k);

    return {
      chunks: ranked,
      sourceNote: KB.meta.sourceNote + " · last updated: " + KB.meta.lastUpdated
    };
  }

  return { retrieve, tokenize };
})();

window.Retriever = Retriever;
