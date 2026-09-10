const species = [
  { code: "NEMU", body: "round", ears: "leaf", hue: 48 },
  { code: "TOPO", body: "tall", ears: "drop", hue: 164 },
  { code: "MUGU", body: "wide", ears: "sprout", hue: 272 }
];

export function initialState() {
  return { phase: "intro", scene: 0, answers: [], artifact: null, encounter: null, seed: randomSeed(), result: null };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffff);
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
    date: new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
    scores,
    quirks,
    phenotype: {
      eyes: scores.approach > 0 ? "open" : "narrow",
      posture: scores.tempo > 0 ? "forward" : "resting",
      markings: Math.abs(scores.structure) + 1
    }
  };
}
