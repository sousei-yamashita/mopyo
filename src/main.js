import { scenes, encounterChoices } from "./story.js";
import { initialState, makeResult, artifactFor } from "./engine.js";
import { creatureSvg } from "./creature.js";

const STORAGE_KEY = "mopyo-v01-journey";
const app = document.querySelector("#app");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let state = loadState();

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return normalizeState();
  }
}

function normalizeState(saved = {}) {
  const source = saved && typeof saved === "object" ? saved : {};
  const base = initialState();
  const phases = new Set(["intro", "story", "pause", "reveal", "encounter", "card"]);
  const sceneStates = Array.from({ length: scenes.length }, (_, index) => ({
    counts: typeof source?.sceneStates?.[index]?.counts === "object" && source.sceneStates[index].counts
      ? source.sceneStates[index].counts
      : {},
    note: typeof source?.sceneStates?.[index]?.note === "string" ? source.sceneStates[index].note : "",
    active: typeof source?.sceneStates?.[index]?.active === "string" ? source.sceneStates[index].active : ""
  }));
  return {
    ...base,
    ...source,
    phase: phases.has(source?.phase) ? source.phase : base.phase,
    scene: Number.isInteger(source?.scene) ? Math.max(0, Math.min(source.scene, scenes.length - 1)) : base.scene,
    answers: Array.isArray(source?.answers) ? source.answers : [],
    artifact: typeof source?.artifact === "string" ? source.artifact : null,
    encounter: typeof source?.encounter === "string" ? source.encounter : null,
    result: source?.result || null,
    sceneStates
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(next) {
  state = normalizeState({ ...state, ...next });
  save();
  render();
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
}

function sceneProgress(sceneState) {
  return Object.values(sceneState.counts || {}).reduce((sum, value) => sum + value, 0);
}

function render() {
  document.body.dataset.phase = state.phase;
  if (state.phase === "intro") renderIntro();
  else if (state.phase === "story") renderStory();
  else if (state.phase === "pause") renderPause();
  else if (state.phase === "reveal") renderReveal();
  else if (state.phase === "encounter") renderEncounter();
  else renderCard();
}

function renderIntro() {
  app.innerHTML = `<section class="screen intro">
    <div class="weather" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="intro-copy"><p class="kicker">ZUIPON / FIRST ENCOUNTER</p><h1>駅前で、あと10分。</h1><p>説明はまだない。少しだけ、触って歩く。</p></div>
    <button class="primary start" type="button">さわってみる <span>→</span></button>
  </section>`;
  app.querySelector("button").addEventListener("click", () => setState({ phase: "story" }));
}

function renderStory() {
  const scene = scenes[state.scene];
  const sceneState = state.sceneStates[state.scene];
  const touches = sceneProgress(sceneState);
  app.innerHTML = `<section class="screen story scene-${state.scene}">
    <header class="story-head"><button class="back" aria-label="ひとつ前へ">←</button><div class="progress" aria-label="${state.scene + 1} / ${scenes.length}"><span style="width:${((state.scene + 1) / scenes.length) * 100}%"></span></div><b>${String(state.scene + 1).padStart(2, "0")}</b></header>
    <article class="scene-copy"><p class="eyebrow">${scene.eyebrow}</p><h2>${scene.title}</h2><p>${scene.text}</p></article>
    <div class="message-bubble" aria-live="polite">${scene.message}</div>
    <div class="scene-map art-${state.scene}" aria-label="${scene.title}">
      <div class="sky-orb" aria-hidden="true"></div>
      <div class="city city-back" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="city city-front" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="street" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="scene-prop prop-a" aria-hidden="true"></div>
      <div class="scene-prop prop-b" aria-hidden="true"></div>
      <div class="scene-prop prop-c" aria-hidden="true"></div>
      <div class="scene-shadow" aria-hidden="true"></div>
      ${scene.hotspots.map(hotspot => `
        <button class="hotspot${hotspot.hidden ? " hotspot-hidden" : ""}${sceneState.counts[hotspot.id] ? " is-seen" : ""}${sceneState.active === hotspot.id ? " is-active" : ""}" type="button" data-hotspot="${hotspot.id}" style="--x:${hotspot.x}%;--y:${hotspot.y}%">
          <span aria-hidden="true">${hotspot.hidden ? "✦" : hotspot.label}</span>
          ${hotspot.hidden ? `<span class="sr-only">${hotspot.label}</span>` : ""}
        </button>`).join("")}
    </div>
    <div class="scene-response" aria-live="polite">
      <p>${sceneState.note || "気になるところを押すと、街が短く返してくる。"}</p>
      <small>${touches}/${scene.minInteractions} くらい触ると、次へ進める。</small>
    </div>
    <button class="primary next" type="button" ${touches < scene.minInteractions ? "disabled" : ""}>${scene.nextLabel} <span>→</span></button>
  </section>`;
  app.querySelector(".back").addEventListener("click", goBack);
  app.querySelectorAll("[data-hotspot]").forEach(button => button.addEventListener("click", () => inspectHotspot(button.dataset.hotspot)));
  app.querySelector(".next").addEventListener("click", advanceScene);
}

function goBack() {
  if (state.scene === 0) return setState({ phase: "intro" });
  const scene = state.scene - 1;
  const sceneStates = state.sceneStates.slice(0, scenes.length);
  setState({
    phase: "story",
    scene,
    result: null,
    artifact: artifactFor(scenes, sceneStates.slice(0, scene + 1), null)
  });
}

function inspectHotspot(id) {
  const scene = scenes[state.scene];
  const hotspot = scene.hotspots.find(entry => entry.id === id);
  if (!hotspot) return;
  const sceneStates = state.sceneStates.map((entry, index) => index === state.scene
    ? { ...entry, counts: { ...entry.counts }, note: entry.note, active: entry.active }
    : entry);
  const current = sceneStates[state.scene];
  const count = (current.counts[id] || 0) + 1;
  current.counts[id] = count;
  current.note = hotspot.reactions[Math.min(count - 1, hotspot.reactions.length - 1)];
  current.active = id;
  const answers = [...state.answers];
  answers[state.scene] = scene.hotspots.findIndex(entry => entry.id === id);
  setState({
    sceneStates,
    answers,
    artifact: artifactFor(scenes, sceneStates, state.artifact),
    result: null
  });
}

function advanceScene() {
  if (state.scene < scenes.length - 1) return setState({ scene: state.scene + 1, phase: "story" });
  state = normalizeState({ ...state, phase: "pause" });
  save();
  render();
}

function renderPause() {
  app.innerHTML = `<section class="screen darkness" aria-live="polite"><div><p>帰り道。</p><p>自分の足音。</p><p class="late">……一歩ぶん、多い。</p></div></section>`;
  window.setTimeout(() => {
    if (state.phase === "pause") setState({ phase: "reveal", result: makeResult(state, scenes) });
  }, reducedMotion.matches ? 120 : 1500);
}

function renderReveal() {
  if (!state.result) state.result = makeResult(state, scenes);
  app.innerHTML = `<section class="screen reveal"><p class="eyebrow">FIRST SIGHT</p><div class="glow">${creatureSvg(state.result)}</div><div class="reveal-copy"><h2>……なんか、ついてきた。</h2><p>さっきまで、いなかったはず。</p></div><button class="primary" type="button">目を合わせる <span>→</span></button></section>`;
  app.querySelector("button").addEventListener("click", () => setState({ phase: "encounter" }));
}

function renderEncounter() {
  app.innerHTML = `<section class="screen encounter"><header><p class="eyebrow">FIRST ENCOUNTER</p><h2>こちらを見ている。</h2><p>説明はない。先に、こっちがどうするかだけある。</p></header><div class="small-creature">${creatureSvg(state.result)}</div><div class="choices compact">${encounterChoices.map((label, index) => `<button type="button" data-encounter="${index}"><span>${label}</span><b>→</b></button>`).join("")}</div></section>`;
  app.querySelectorAll("[data-encounter]").forEach(button => button.addEventListener("click", () => setState({ phase: "card", encounter: encounterChoices[Number(button.dataset.encounter)] }))); 
}

function renderCard() {
  const result = state.result || makeResult(state, scenes);
  const artifact = result.artifact || artifactFor(scenes, state.sceneStates, "見ていたもの");
  app.innerHTML = `<section class="screen result"><header class="result-head"><p class="eyebrow">FIRST ENCOUNTER</p><h1>ついてきた。</h1><p>診断じゃない。ただ、向こうが勝手に覚えている。</p></header>
    <article class="card">
      <div class="card-top"><span>ZUIPON / INDIVIDUAL</span><span>${result.id}</span></div>
      <div class="portrait">${creatureSvg({ ...result, artifact })}</div>
      <div class="identity"><div><small>個体番号</small><strong>${result.id}</strong></div><div><small>遭遇日</small><strong>${result.date}</strong></div></div>
      <div class="artifact-row"><span class="artifact-icon">${artifact.includes("鍵") ? "⌑" : artifact.includes("鈴") ? "◌" : artifact.includes("100円") ? "◍" : "●"}</span><div><small>持っていたもの</small><strong>${artifact}</strong></div></div>
      <div class="quirks"><small>おぼえてること</small><ul>${result.memories.map(memory => `<li>${memory}</li>`).join("")}</ul></div>
      <div class="encounter-note">最初に「${state.encounter || "そのまま見た"}」をした。</div>
    </article>
    <button class="restart" type="button">もう一度、駅前へ戻る</button>
  </section>`;
  app.querySelector(".restart").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = initialState();
    render();
  });
}

render();
