import { scenes, encounterChoices } from "./story.js";
import { initialState, makeResult, resultShareText } from "./engine.js";
import { creatureSvg } from "./creature.js";

const STORAGE_KEY = "mopyo-v02-journey";
const LEGACY_STORAGE_KEY = "mopyo-v01-journey";
const app = document.querySelector("#app");
let state = loadState();

function loadState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = JSON.parse(serialized);
    if (saved && saved.phase && Number.isInteger(saved.scene)) return saved;
  } catch { /* 壊れた保存データは静かに捨てる */ }
  return initialState();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function setState(next) {
  state = { ...state, ...next };
  save();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div class="intro-copy"><p class="kicker">きょうの帰り道</p><h1>少しだけ、<br>道を外れてみる。</h1><p>夕方。待ち合わせには、少し遅れた。</p></div>
    <button class="primary start" type="button">角を曲がる <span>→</span></button>
  </section>`;
  app.querySelector("button").addEventListener("click", () => setState({ phase: "story" }));
}

function renderStory() {
  const scene = scenes[state.scene];
  app.innerHTML = `<section class="screen story">
    <header class="story-head"><button class="back" aria-label="ひとつ前へ">←</button><div class="progress" aria-label="${state.scene + 1} / ${scenes.length}"><span style="width:${((state.scene + 1) / scenes.length) * 100}%"></span></div><b>${String(state.scene + 1).padStart(2, "0")}</b></header>
    <div class="scene-art art-${state.scene}" aria-hidden="true"><div class="moon"></div><div class="door"></div><div class="object"></div></div>
    <article class="scene-copy"><p class="eyebrow">${scene.eyebrow}</p><h2>${scene.title}</h2><p>${scene.text}</p></article>
    <div class="choices">${scene.choices.map((choice, index) => `<button type="button" data-choice="${index}"><span>${choice.label}</span><small>${choice.hint}</small></button>`).join("")}</div>
  </section>`;
  app.querySelector(".back").addEventListener("click", goBack);
  app.querySelectorAll("[data-choice]").forEach(button => button.addEventListener("click", () => choose(Number(button.dataset.choice))));
}

function goBack() {
  if (state.scene === 0) return setState({ phase: "intro" });
  const answers = state.answers.slice(0, -1);
  setState({ scene: state.scene - 1, answers, artifact: state.scene - 1 < 5 ? null : state.artifact });
}

function choose(index) {
  const scene = scenes[state.scene];
  const answers = [...state.answers.slice(0, state.scene), index];
  const artifact = scene.choices[index].artifact || state.artifact;
  if (state.scene < scenes.length - 1) setState({ answers, artifact, scene: state.scene + 1 });
  else {
    state = { ...state, answers, artifact, phase: "pause" };
    save(); render();
  }
}

function renderPause() {
  app.innerHTML = `<section class="screen darkness" aria-live="polite"><div><p>……</p><p class="late">何か、ついてきたようです。</p></div></section>`;
  window.setTimeout(() => { if (state.phase === "pause") setState({ phase: "reveal", result: makeResult(state, scenes) }); }, 2400);
}

function renderReveal() {
  if (!state.result) state.result = makeResult(state, scenes);
  app.innerHTML = `<section class="screen reveal"><p class="eyebrow">FIRST SIGHT</p><div class="glow">${creatureSvg(state.result)}</div><div class="reveal-copy"><h2>いた。</h2><p>こちらを見ています。</p></div><button class="primary" type="button">もう少し見る</button></section>`;
  app.querySelector("button").addEventListener("click", () => setState({ phase: "encounter" }));
}

function renderEncounter() {
  app.innerHTML = `<section class="screen encounter"><header><p class="eyebrow">FIRST ENCOUNTER</p><h2>どうする？</h2></header><div class="small-creature">${creatureSvg(state.result)}</div><div class="choices compact">${encounterChoices.map((label, index) => `<button type="button" data-encounter="${index}"><span>${label}</span><b>→</b></button>`).join("")}</div></section>`;
  app.querySelectorAll("[data-encounter]").forEach(button => button.addEventListener("click", () => setState({ phase: "card", encounter: encounterChoices[Number(button.dataset.encounter)] })));
}

function renderCard() {
  const result = state.result;
  app.innerHTML = `<section class="screen result"><header class="result-head"><p class="eyebrow">FIRST ENCOUNTER</p><h1>ついてきたもの</h1></header>
    <article class="card">
      <div class="card-top"><span>MOPYO / INDIVIDUAL</span><span>${result.id}</span></div>
      <div class="portrait">${creatureSvg(result)}</div>
      <div class="identity"><div><small>INDIVIDUAL ID</small><strong>${result.id}</strong></div><div><small>ENCOUNTER</small><strong>${result.date}</strong></div></div>
      <div class="artifact-row"><span class="artifact-icon">${state.artifact.includes("鍵") ? "⌑" : state.artifact.includes("鈴") ? "◌" : "●"}</span><div><small>ARTIFACT</small><strong>${result.artifact}</strong></div></div>
      <div class="quirks"><small>OBSERVED QUIRKS</small><ul>${result.quirks.map(q => `<li>${q}</li>`).join("")}</ul></div>
      <div class="encounter-note">最初に「${state.encounter}」を選んだ。</div>
    </article>
    <div class="result-actions">
      <button class="primary share" type="button"><span>この遭遇を共有する</span><span aria-hidden="true">↗</span></button>
      <p class="share-status" role="status" aria-live="polite"></p>
      <button class="restart" type="button">もう一度、道を歩く</button>
    </div>
  </section>`;
  app.querySelector(".share").addEventListener("click", shareResult);
  app.querySelector(".restart").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    state = initialState();
    render();
  });
}

async function shareResult() {
  const button = app.querySelector(".share");
  const status = app.querySelector(".share-status");
  const shareData = { title: `ついてきたもの ${state.result.id}`, text: resultShareText(state.result, state.encounter) };
  button.disabled = true;
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      status.textContent = "共有しました。";
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.text);
      status.textContent = "遭遇の記録をコピーしました。";
    } else {
      status.textContent = "このブラウザでは共有できませんでした。";
    }
  } catch (error) {
    if (error?.name !== "AbortError") status.textContent = "共有できませんでした。もう一度お試しください。";
  } finally {
    button.disabled = false;
  }
}

render();
