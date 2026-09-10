const species = [
  { code: "NEMU", body: "round", ears: "leaf", hue: 48 },
  { code: "TOPO", body: "tall", ears: "drop", hue: 164 },
  { code: "MUGU", body: "wide", ears: "sprout", hue: 272 }
];

export const PHASES = ["intro", "story", "pause", "reveal", "encounter", "card"];

export function initialState() {
  return { phase: "intro", scene: 0, answers: [], artifact: null, encounter: null, seed: randomSeed(), result: null };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffff);
}

/** Convert persisted, user-controlled data to a renderer-safe journey. */
export function restoreState(saved, scenes) {
  if (!saved || typeof saved !== "object" || !PHASES.includes(saved.phase)) return null;
  if (!Number.isInteger(saved.scene) || saved.scene < 0 || saved.scene >= scenes.length) return null;
  if (!Number.isInteger(saved.seed) || saved.seed < 0 || saved.seed > 0xffffff) return null;

  const requiredAnswers = saved.phase === "intro" ? 0 : Math.min(saved.scene, scenes.length - 1);
  if (!Array.isArray(saved.answers) || saved.answers.length < requiredAnswers) return null;
  const answers = saved.answers.slice(0, scenes.length).map((answer, index) =>
    Number.isInteger(answer) && scenes[index]?.choices[answer] ? answer : null
  );
  if (answers.slice(0, requiredAnswers).includes(null)) return null;

  const identityIndex = scenes.findIndex(scene => scene.identity);
  const artifact = answers[identityIndex] == null
    ? null
    : scenes[identityIndex].choices[answers[identityIndex]].artifact || null;
  const journeyComplete = ["pause", "reveal", "encounter", "card"].includes(saved.phase);
  if (journeyComplete && (answers.length !== scenes.length || answers.includes(null) || !artifact)) return null;
  if (saved.phase === "card" && typeof saved.encounter !== "string") return null;

  const state = { ...initialState(), ...saved, answers, artifact, seed: saved.seed };
  if (journeyComplete) state.result = makeResult(state, scenes, saved.result?.encounteredAt || new Date());
  return state;
}

export function scoresFor(scenes, answers) {
  const scores = { approach: 0, tempo: 0, social: 0, structure: 0, retention: 0 };
  answers.forEach((choiceIndex, sceneIndex) => {
    const choice = scenes[sceneIndex]?.choices[choiceIndex];
    if (!choice) return;
    Object.entries(choice.delta || {}).forEach(([key, value]) => { scores[key] += value; });
  });
  return scores;
}

export function makeResult(state, scenes, date = new Date()) {
  const encounterDate = date instanceof Date ? date : new Date(date);
  const scores = scoresFor(scenes, state.answers);
  const base = species[state.seed % species.length];
  const serial = state.seed.toString(36).toUpperCase().padStart(5, "0").slice(-5);
  const quirks = [
    scores.approach > 0
      ? "気になるものには、鼻先から近づく。"
      : "気になるものは、一度通り過ぎてから戻ってくる。",
    scores.tempo > 0
      ? "歩く速さを、ときどき理由なく変える。"
      : "曲がり角では、みんなが消えてから動く。",
    scores.retention > 0
      ? "拾ったものを、体の下に長くしまっている。"
      : scores.social > 0
        ? "誰かのそばでは、少しだけ輪郭がやわらかい。"
        : "知らない個体とは、影ひとつ分だけ離れる。"
  ];
  return {
    id: `${base.code}-${serial}`,
    species: base,
    artifact: state.artifact || "不明なもの",
    date: new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(encounterDate),
    encounteredAt: encounterDate.toISOString(),
    scores,
    quirks,
    phenotype: {
      eyes: scores.approach > 0 ? "open" : "narrow",
      posture: scores.tempo > 0 ? "forward" : "resting",
      markings: Math.abs(scores.structure) + 1
    }
  };
}
