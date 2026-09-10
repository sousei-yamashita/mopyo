export const scenes = [
  {
    eyebrow: "夕方 16:42",
    title: "目当ての店は、閉まっていた。",
    text: "隣にいるひとは、まだ閉じたシャッターを見ている。雨も少し降りそうだ。",
    choices: [
      { label: "近くの別の店を探す", hint: "看板を見渡す", delta: { approach: 1, tempo: 1 } },
      { label: "軒下で少し待つ", hint: "雨の匂いを確かめる", delta: { tempo: -1, structure: -1 } },
      { label: "今日は帰ろうと言う", hint: "来た道へ向き直る", delta: { structure: 1, social: -1 } }
    ]
  },
  {
    eyebrow: "商店街の端",
    title: "同行者が、急に立ち止まる。",
    text: "理由は言わず、暗い路地の奥を気にしている。",
    choices: [
      { label: "何が見えたか聞く", hint: "同じ方向を見る", delta: { social: 1, approach: 1 } },
      { label: "黙って隣に立つ", hint: "相手が動くまで待つ", delta: { social: 1, tempo: -1 } },
      { label: "少し先から振り返る", hint: "距離を置いて様子を見る", delta: { social: -1, approach: -1 } }
    ]
  },
  {
    eyebrow: "知らない抜け道",
    title: "三人とも、次の道を決めない。",
    text: "左は明るい大通り。右は近道らしい。まっすぐは地図にない。",
    choices: [
      { label: "左へ行こうと提案する", hint: "確かな道を選ぶ", delta: { structure: 1, social: 1 } },
      { label: "右へ先に歩き出す", hint: "近道を試す", delta: { tempo: 1, approach: 1 } },
      { label: "誰かが決めるのを待つ", hint: "三つの道を眺める", delta: { tempo: -1, social: -1 } }
    ]
  },
  {
    eyebrow: "地図にない道",
    title: "塀の下に、小さな扉がある。",
    text: "猫には大きく、ひとには小さい。向こう側で、こつ、と音がした。",
    choices: [
      { label: "耳を近づける", hint: "もう一度の音を待つ", delta: { approach: 1, tempo: -1 } },
      { label: "隙間から中をのぞく", hint: "片目で暗がりを見る", delta: { approach: 1, tempo: 1 } },
      { label: "扉の形だけ覚えておく", hint: "触らずに先へ進む", delta: { approach: -1, retention: 1 } }
    ]
  },
  {
    eyebrow: "扉のそば",
    title: "足元に、三つ落ちている。",
    text: "どれも持ち主はいないらしい。なぜか、ひとつだけ持って帰る気がした。",
    identity: true,
    choices: [
      { label: "歯のない小さな鍵", hint: "冷たくて少し重い", artifact: "歯のない鍵", icon: "⌑", delta: { retention: 1 } },
      { label: "鳴らない銀色の鈴", hint: "振るとかすかに震える", artifact: "鳴らない鈴", icon: "◌", delta: { social: 1 } },
      { label: "穴のあいた青い石", hint: "向こう側が薄青く見える", artifact: "穴のあいた石", icon: "●", delta: { approach: 1 } }
    ]
  },
  {
    eyebrow: "帰り道 17:19",
    title: "後ろから、何かがついてくる。",
    text: "足音ではない。止まると止まり、歩くと、布を引きずるような音がする。",
    choices: [
      { label: "角を曲がって待つ", hint: "正体が来るのを待ち伏せる", delta: { approach: 1, structure: 1 } },
      { label: "歩幅を変えて確かめる", hint: "速く、遅く、また速く", delta: { tempo: 1, structure: 1 } },
      { label: "振り返らず歩き続ける", hint: "音との距離だけを測る", delta: { approach: -1, retention: 1 } }
    ]
  }
];

export const encounterChoices = ["近づく", "手を出す", "しゃがんで待つ", "そのまま見る"];
