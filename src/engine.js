const species = [
  { code: "NEMU", body: "round", ears: "leaf", hue: 48 },
  { code: "TOPO", body: "tall", ears: "drop", hue: 164 },
  { code: "MUGU", body: "wide", ears: "sprout", hue: 272 }
];

export function initialState() {
  return { phase: "intro", scene: 0, answers: [], artifact: null, encounter: null, seed: randomSeed(), result: null, sceneStates: [] };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffff);
}

export function scoresFor(scenes, selections) {
  const scores = { approach: 0, tempo: 0, social: 0, structure: 0, retention: 0 };
  selections.forEach((selection, sceneIndex) => {
    if (Number.isInteger(selection)) {
      const choice = scenes[sceneIndex]?.choices?.[selection];
      applyDelta(scores, choice?.delta, 1);
      return;
    }
    const counts = selection?.counts;
    if (!counts) return;
    scenes[sceneIndex]?.hotspots?.forEach(hotspot => {
      const seen = Math.min(counts[hotspot.id] || 0, hotspot.scoreCap || 2);
      if (!seen) return;
      applyDelta(scores, hotspot.delta, seen);
    });
  });
  return scores;
}

function applyDelta(scores, delta, weight) {
  Object.entries(delta || {}).forEach(([key, value]) => {
    scores[key] += value * weight;
  });
}

export function rememberedFor(scenes, sceneStates) {
  const remembered = [];
  sceneStates.forEach((sceneState, sceneIndex) => {
    const counts = sceneState?.counts || {};
    scenes[sceneIndex]?.hotspots?.forEach((hotspot, hotspotIndex) => {
      const seen = counts[hotspot.id] || 0;
      if (!seen || !hotspot.remembered) return;
      const selected = hotspot.remembered
        .filter(entry => seen >= entry.count)
        .sort((left, right) => (right.priority ?? right.count) - (left.priority ?? left.count) || right.count - left.count)[0];
      if (selected) remembered.push({
        text: selected.text,
        priority: selected.priority ?? selected.count,
        sceneIndex,
        hotspotIndex
      });
    });
  });
  return remembered
    .sort((left, right) => right.priority - left.priority || left.sceneIndex - right.sceneIndex || left.hotspotIndex - right.hotspotIndex)
    .slice(0, 3)
    .map(entry => entry.text);
}

export function artifactFor(scenes, sceneStates, fallback = "見ていたもの") {
  let chosen = null;
  sceneStates.forEach((sceneState, sceneIndex) => {
    const counts = sceneState?.counts || {};
    scenes[sceneIndex]?.hotspots?.forEach((hotspot, hotspotIndex) => {
      const seen = counts[hotspot.id] || 0;
      if (!seen || !hotspot.artifact) return;
      const options = Array.isArray(hotspot.artifact) ? hotspot.artifact : [{ count: 1, label: hotspot.artifact }];
      const selected = options
        .filter(entry => seen >= entry.count)
        .sort((left, right) => (right.priority ?? right.count) - (left.priority ?? left.count) || right.count - left.count)[0];
      if (!selected) return;
      const candidate = {
        label: selected.label,
        priority: selected.priority ?? selected.count,
        sceneIndex,
        hotspotIndex
      };
      if (!chosen || candidate.priority > chosen.priority || (candidate.priority === chosen.priority && candidate.sceneIndex >= chosen.sceneIndex)) {
        chosen = candidate;
      }
    });
  });
  return chosen?.label || fallback;
}

export function makeResult(state, scenes, date = new Date()) {
  const sceneStates = Array.isArray(state.sceneStates) ? state.sceneStates : [];
  const scores = scoresFor(scenes, sceneStates.length ? sceneStates : state.answers);
  const base = species[state.seed % species.length];
  const serial = state.seed.toString(36).toUpperCase().padStart(5, "0").slice(-5);
  const memories = rememberedFor(scenes, sceneStates);
  return {
    id: `${base.code}-${serial}`,
    species: base,
    artifact: state.artifact || artifactFor(scenes, sceneStates),
    date: new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
    scores,
    quirks: memories,
    memories: memories.length ? memories : [
      "駅前で、少し長く立ち止まっていた。",
      "落ちたものを、そのまま通り過ぎなかった。",
      "帰る前に、もう一度だけ振り返った。"
    ],
    phenotype: {
      eyes: scores.approach > 1 ? "open" : "narrow",
      posture: scores.tempo > 0 ? "forward" : "resting",
      markings: Math.max(1, Math.min(4, Math.abs(scores.structure) + 1))
    }
  };
}
