export const scenes = [
  {
    eyebrow: "いつもの帰り道",
    title: "帰り道の分かれ道。",
    text: "家まではあと十分。商店街、川沿い、住宅街のどこからでも帰れる。",
    choices: [
      { label: "商店街を通る", hint: "明るい道", delta: { approach: 1, tempo: 1 } },
      { label: "川沿いを歩く", hint: "静かな道", delta: { tempo: -1, structure: -1 } },
      { label: "住宅街を歩く", hint: "慣れた道", delta: { structure: 1, social: -1 } },
      { label: "コンビニに寄る", hint: "少し寄り道", delta: { social: 1, retention: 1 } }
    ]
  },
  {
    eyebrow: "商店街のはずれ",
    title: "知らない猫がついてくる。",
    text: "立ち止まると、猫も少し後ろで止まった。",
    choices: [
      { label: "撫でる", hint: "手を出す", delta: { social: 1, approach: 1 } },
      { label: "立ち止まる", hint: "猫を待つ", delta: { social: 1, tempo: -1 } },
      { label: "振り返る", hint: "顔を見る", delta: { social: -1, approach: -1 } },
      { label: "そのまま歩く", hint: "気にしない", delta: { tempo: 1, structure: 1 } }
    ]
  },
  {
    eyebrow: "道ばたの自販機",
    title: "お茶が二本出てきた。",
    text: "一本しか買っていない。取り出し口には、同じお茶が二本ある。",
    choices: [
      { label: "一本だけ取る", hint: "買った分", delta: { structure: 1, social: 1 } },
      { label: "二本とも取る", hint: "両手で持つ", delta: { tempo: 1, approach: 1 } },
      { label: "少し待つ", hint: "自販機を見る", delta: { tempo: -1, social: -1 } },
      { label: "返却口を見る", hint: "下を確かめる", delta: { structure: 1, retention: 1 } },
      { label: "もう一度押す", hint: "ボタンを押す", delta: { approach: 1, tempo: 1 } }
    ]
  },
  {
    eyebrow: "空き地の前",
    title: "自分の家の玄関がある。",
    text: "空き地に、玄関だけが立っている。ドアの向こうから、家のテレビの音がする。",
    choices: [
      { label: "音を聞く", hint: "ドアに近づく", delta: { approach: 1, tempo: -1 } },
      { label: "ドアを開ける", hint: "取っ手を回す", delta: { approach: 1, tempo: 1 } },
      { label: "写真を撮る", hint: "形を残す", delta: { approach: -1, retention: 1 } },
      { label: "家へ急ぐ", hint: "空き地を離れる", delta: { tempo: 1, structure: 1 } },
      { label: "声をかける", hint: "返事を待つ", delta: { social: 1, approach: 1 } }
    ]
  },
  {
    eyebrow: "玄関の前",
    title: "足元に三つ落ちている。",
    text: "どれも見たことがない。拾えるのは、ひとつだけだ。",
    identity: true,
    choices: [
      { label: "歯のない鍵を拾う", hint: "冷たい鍵", artifact: "歯のない鍵", icon: "⌑", delta: { retention: 1 } },
      { label: "鳴らない鈴を拾う", hint: "銀色の鈴", artifact: "鳴らない鈴", icon: "◌", delta: { social: 1 } },
      { label: "穴のあいた石を拾う", hint: "青い石", artifact: "穴のあいた石", icon: "●", delta: { approach: 1 } }
    ]
  },
  {
    eyebrow: "家まであと一つ角",
    title: "後ろから音がついてくる。",
    text: "止まると音も止まる。振り返ると、電柱の陰から丸い耳だけが見えた。",
    choices: [
      { label: "その場で待つ", hint: "耳を見る", delta: { approach: 1, structure: 1 } },
      { label: "ゆっくり近づく", hint: "足音を立てる", delta: { tempo: 1, structure: 1 } },
      { label: "前を向いて歩く", hint: "家へ向かう", delta: { approach: -1, retention: 1 } },
      { label: "物陰に隠れる", hint: "向こうを待つ", delta: { tempo: -1, approach: 1 } }
    ]
  }
];

export const encounterChoices = ["近づく", "手を出す", "しゃがんで待つ", "そのまま見る"];
