import { scenes, encounterChoices } from "./story.js";
import { initialState, makeResult } from "./engine.js";
import { creatureSvg } from "./creature.js";

const STORAGE_KEY = "mopyo-v01-journey";
const app = document.querySelector("#app");
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.phase && Number.isInteger(saved.scene)) return saved;
  } catch { /* 壊れた保存データは静かに捨てる */ }
  return initialState();
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function setState(patch) { state = { ...state, ...patch }; persist(); render(); }

function render() {
  if (state.phase === "intro") return intro();
  if (state.phase === "journey") return journey();
  if (state.phase === "darkness") return darkness();
  if (state.phase === "reveal") return reveal();
  if (state.phase === "encounter") return encounter();
  return result();
}

function intro() {
  app.innerHTML = `<section class="screen intro">
    <div class="intro-mark">FIRST ENCOUNTER / 00</div>
    <div><p class="eyebrow">MOPYO PROTOTYPE</p><h1>少しだけ<br>出かけます。</h1><p>いつもの帰り道です。たぶん。</p></div>
    <button class="primary" id="start">出かける <span>→</span></button>
  </section>`;
  app.querySelector("#start").onclick = () => setState({ phase:"journey", scene:0 });
}

function journey() {
  const scene = scenes[state.scene];
  app.innerHTML = `<section class="screen journey">
    <header><span>0${state.scene + 1}</span><div class="progress">${scenes.map((_,i)=>`<i class="${i <= state.scene ? "on" : ""}"></i>`).join("")}</div><span>0${scenes.length}</span></header>
    <div class="scene-copy"><p class="eyebrow">${scene.label}</p><h2>${scene.text}</h2></div>
    <div class="choices">${scene.choices.map((c,i)=>`<button data-choice="${i}"><b>${String.fromCharCode(65+i)}</b><span>${c.text}</span><em>→</em></button>`).join("")}</div>
    ${state.scene > 0 ? '<button class="back" id="back">← ひとつ前へ</button>' : ""}
  </section>`;
  app.querySelectorAll("[data-choice]").forEach(btn => btn.onclick = () => choose(Number(btn.dataset.choice)));
  if (state.scene > 0) app.querySelector("#back").onclick = () => {
    const answers = state.answers.slice(0,-1);
    setState({ scene:state.scene-1, answers, artifact: state.scene-1 < 4 ? null : state.artifact });
  };
}

function choose(index) {
  const answers = [...state.answers, index];
  let artifact = state.artifact;
  if (state.scene === 4) artifact = scenes[4].choices[index].artifact;
  if (state.scene === scenes.length - 1) setState({ answers, artifact, phase:"darkness" });
  else setState({ answers, artifact, scene:state.scene+1 });
}

function darkness() {
  app.innerHTML = `<section class="screen darkness"><div><p>帰り道は、いつもと同じです。</p><p class="late">……たぶん。</p></div></section>`;
  window.setTimeout(() => { if (state.phase === "darkness") setState({ phase:"reveal" }); }, 1900);
}

function getResult() { return makeResult(state, scenes); }

function reveal() {
  const r = getResult();
  app.innerHTML = `<section class="screen reveal">
    <p class="eyebrow">UNKNOWN INDIVIDUAL / ${r.id}</p>
    <div class="glow">${creatureSvg(r)}</div>
    <div class="reveal-copy"><h2>何か、ついてきたようです。</h2><p>こちらを見ています。</p></div>
    <button class="primary light" id="next">もう少し見る <span>→</span></button>
  </section>`;
  app.querySelector("#next").onclick = () => setState({ phase:"encounter" });
}

function encounter() {
  const r = getResult();
  app.innerHTML = `<section class="screen encounter">
    <header><p class="eyebrow">FIRST ENCOUNTER</p><h2>こちらを見ています。<br>どうする？</h2></header>
    <div class="small-creature">${creatureSvg(r, "creature small")}</div>
    <div class="choices compact">${encounterChoices.map((c,i)=>`<button data-enc="${i}"><b>${c.short}</b><em>→</em></button>`).join("")}</div>
  </section>`;
  app.querySelectorAll("[data-enc]").forEach(btn => btn.onclick = () => setState({ encounter:Number(btn.dataset.enc), phase:"result" }));
}

function result() {
  const r = getResult();
  const enc = encounterChoices[state.encounter] || encounterChoices[3];
  app.innerHTML = `<section class="screen result">
    <header class="result-head"><p class="eyebrow">FIRST ENCOUNTER RECORD</p><h1>出会ったもの。</h1></header>
    <article class="card">
      <div class="card-top"><span>MOPYO / FIELD RECORD</span><span>${r.id}</span></div>
      <div class="portrait">${creatureSvg(r)}</div>
      <div class="identity"><div><small>INDIVIDUAL ID</small><strong>${r.id}</strong></div><div><small>ENCOUNTERED</small><strong>${r.date}</strong></div></div>
      <div class="artifact-row"><div class="artifact-icon">◇</div><div><small>持っているもの</small><strong>${r.artifact}</strong></div></div>
      <div class="quirks"><small>観察されたこと</small><ul>${r.quirks.map(q=>`<li>${q}</li>`).join("")}</ul></div>
      <div class="encounter-note">最初にあなたは「${enc.record}」</div>
    </article>
    <button class="restart" id="restart">最初からやり直す</button>
  </section>`;
  app.querySelector("#restart").onclick = () => { localStorage.removeItem(STORAGE_KEY); state = initialState(); render(); };
}

render();
