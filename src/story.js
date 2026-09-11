export const scenes = [
  {
    eyebrow: "駅前",
    title: "駅を出た。",
    text: "まず、どこへ行く？",
    choices: [
      { label: "コンビニへ行く", delta: { approach: 1, tempo: 1 } },
      { label: "本屋へ行く", delta: { tempo: -1, structure: -1 } },
      { label: "公園へ行く", delta: { structure: 1, social: -1 } },
      { label: "まっすぐ歩く", delta: { social: 1, retention: 1 } }
    ]
  },
  {
    eyebrow: "歩道",
    title: "猫が道をふさいでいる。",
    text: "こちらを見ている。",
    choices: [
      { label: "撫でる", delta: { social: 1, approach: 1 } },
      { label: "道をあけるまで待つ", delta: { social: 1, tempo: -1 } },
      { label: "写真を撮る", delta: { social: -1, approach: -1 } },
      { label: "よけて歩く", delta: { tempo: 1, structure: 1 } }
    ]
  },
  {
    eyebrow: "角を曲がった先",
    title: "知らない路地がある。",
    text: "地図には載っていない。",
    choices: [
      { label: "入る", delta: { structure: 1, social: 1 } },
      { label: "入口から覗く", delta: { tempo: 1, approach: 1 } },
      { label: "写真を撮る", delta: { tempo: -1, social: -1 } },
      { label: "地図を確認する", delta: { structure: 1, retention: 1 } },
      { label: "通り過ぎる", delta: { approach: 1, tempo: 1 } }
    ]
  },
  {
    eyebrow: "路地の奥",
    title: "ドアだけが立っている。",
    text: "向こう側は見えない。",
    choices: [
      { label: "耳を当てる", delta: { approach: 1, tempo: -1 } },
      { label: "ドアを開ける", delta: { approach: 1, tempo: 1 } },
      { label: "写真を撮る", delta: { approach: -1, retention: 1 } },
      { label: "来た道を戻る", delta: { tempo: 1, structure: 1 } },
      { label: "ノックする", delta: { social: 1, approach: 1 } }
    ]
  },
  {
    eyebrow: "ドアの前",
    title: "足元に三つ落ちている。",
    text: "ひとつだけ拾う。",
    identity: true,
    choices: [
      { label: "歯のない鍵を拾う", artifact: "歯のない鍵", icon: "⌑", delta: { retention: 1 } },
      { label: "鳴らない鈴を拾う", artifact: "鳴らない鈴", icon: "◌", delta: { social: 1 } },
      { label: "穴のあいた石を拾う", artifact: "穴のあいた石", icon: "●", delta: { approach: 1 } }
    ]
  },
  {
    eyebrow: "静かな道",
    title: "後ろから音がする。",
    text: "止まると、音も止まる。",
    choices: [
      { label: "振り返る", delta: { approach: 1, structure: 1 } },
      { label: "待つ", delta: { tempo: -1, social: 1 } },
      { label: "走る", delta: { approach: -1, tempo: 1 } },
      { label: "気にせず歩く", delta: { approach: -1, structure: 1 } },
      { label: "隠れる", delta: { approach: -1, social: -1 } }
    ]
  }
];

export const encounterChoices = ["近づく", "手を出す", "しゃがんで待つ", "そのまま見る"];
