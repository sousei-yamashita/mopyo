export const scenes = [
  {
    eyebrow: "SCENE 1 / 待ち時間",
    title: "駅前で、あと10分。",
    text: "質問はまだない。気になるところを、ちょっと触っていく。",
    message: "ごめん、あと10分くらい！",
    nextLabel: "連絡を閉じて、歩き出す",
    minInteractions: 3,
    hotspots: [
      {
        id: "arcade",
        label: "小さいゲームセンター",
        x: 18,
        y: 34,
        reactions: [
          "入口からゲーム音だけ漏れてくる。",
          "1プレイだけ、やたら本気の人がいる。",
          "奥の古い筐体が、ちょっと気になる。"
        ],
        delta: { approach: 1, tempo: 1 },
        remembered: [{ count: 2, text: "ゲームセンターの奥まで気にしていた。", priority: 2 }]
      },
      {
        id: "gacha",
        label: "古いガチャ",
        x: 56,
        y: 66,
        reactions: [
          "知らないキャラだ。",
          "ちょっとかわいい。",
          "……300円か。"
        ],
        delta: { retention: 1, structure: -1 },
        remembered: [{ count: 2, text: "ガチャを二回見た。", priority: 4 }],
        artifact: [{ count: 1, label: "知らないキャラのカプセル", priority: 1 }]
      },
      {
        id: "convenience",
        label: "コンビニ",
        x: 79,
        y: 38,
        reactions: [
          "冷気が一瞬だけ外までくる。",
          "新作グミの棚だけ、やけに明るい。"
        ],
        delta: { structure: 1, tempo: 1 },
        remembered: [{ count: 1, text: "コンビニの明るさを見ていた。", priority: 1 }]
      },
      {
        id: "bench",
        label: "ベンチ",
        x: 33,
        y: 79,
        reactions: [
          "少し座る。まだ夕方の匂いがする。",
          "自転車のブレーキ音が二回、遠くで鳴る。"
        ],
        delta: { tempo: -1, social: 1 },
        remembered: [{ count: 1, text: "ベンチで駅前の音を聞いた。", priority: 1 }]
      },
      {
        id: "alley",
        label: "妙な貼り紙の路地",
        x: 76,
        y: 78,
        reactions: [
          "貼り紙の角だけ、雨でふやけている。",
          "『さわらないでください』だけ、字が強い。"
        ],
        delta: { approach: 1, retention: 1 },
        remembered: [{ count: 1, text: "妙な貼り紙の路地を覗いた。", priority: 2 }]
      },
      {
        id: "presence-1",
        label: "画面の端の気配",
        x: 94,
        y: 18,
        reactions: ["ｻｯ"],
        delta: { approach: 1 },
        remembered: [{ count: 1, text: "端の気配に気づいていた。", priority: 0 }],
        hidden: true
      }
    ]
  },
  {
    eyebrow: "SCENE 2 / 落とし物",
    title: "前の人が、何か落とした。",
    text: "立ち止まらせる質問は出さない。目に入ったものから触る。",
    message: "小さいマスコットが、ころっと転がる。",
    nextLabel: "もう少し先を見る",
    minInteractions: 3,
    hotspots: [
      {
        id: "mascot",
        label: "落ちたマスコット",
        x: 46,
        y: 70,
        reactions: [
          "なんか、もちもちしてる。",
          "顔がちょっと変。",
          "手ざわりだけ、変に覚える。"
        ],
        delta: { retention: 1, social: -1 },
        remembered: [{ count: 2, text: "あのマスコット、二回見てた。", priority: 4 }],
        artifact: [{ count: 1, label: "もちもちのマスコット", priority: 3 }]
      },
      {
        id: "owner",
        label: "歩いていく人",
        x: 73,
        y: 29,
        reactions: [
          "もう結構向こうまで行ってる。",
          "歩幅、思ったより速い。"
        ],
        delta: { tempo: 1, social: 1 },
        remembered: [{ count: 1, text: "持ち主の背中を目で追った。", priority: 2 }]
      },
      {
        id: "stain",
        label: "地面の汚れ",
        x: 24,
        y: 82,
        reactions: [
          "地面、少し濡れてる。",
          "底がちょっと汚れてる。"
        ],
        delta: { structure: 1, retention: 1 },
        remembered: [{ count: 1, text: "落とし物の汚れまで見ていた。", priority: 3 }]
      },
      {
        id: "run",
        label: "追いかける",
        x: 81,
        y: 64,
        reactions: [
          "小走りなら、まだ間に合うかも。",
          "名前は分からない。けど声は届きそう。"
        ],
        delta: { approach: 1, tempo: 1 },
        remembered: [{ count: 1, text: "少しだけ走った。", priority: 3 }]
      },
      {
        id: "crossing",
        label: "横断歩道の音",
        x: 19,
        y: 36,
        reactions: [
          "ピッ、ピッ、ピッ。急かすほどではない。",
          "青になっても、誰もすぐには渡らない。"
        ],
        delta: { tempo: -1, social: 1 },
        remembered: [{ count: 1, text: "横断歩道の音を聞いていた。", priority: 1 }]
      },
      {
        id: "presence-2",
        label: "足元をよぎる気配",
        x: 8,
        y: 18,
        reactions: ["ｻｯ"],
        delta: { approach: 1 },
        remembered: [{ count: 1, text: "また、端の気配に気づいた。", priority: 0 }],
        hidden: true
      }
    ]
  },
  {
    eyebrow: "SCENE 3 / 小さな予定外",
    title: "飲みたかったのに、落ちない。",
    text: "たかが一本ぶん、でも予定どおりじゃない。",
    message: "レモンソーダだけ、出口の手前で止まっている。",
    nextLabel: "あきらめて、帰る",
    minInteractions: 3,
    hotspots: [
      {
        id: "bottle",
        label: "ひっかかったボトル",
        x: 53,
        y: 46,
        reactions: [
          "あと少しで落ちそう。",
          "ラベルだけ、変にこっちを向いている。"
        ],
        delta: { structure: 1, retention: 1 },
        remembered: [{ count: 1, text: "落ちきらないボトルを見ていた。", priority: 2 }],
        artifact: [{ count: 1, label: "ぬるいレモンソーダ", priority: 2 }]
      },
      {
        id: "return-slot",
        label: "返却口",
        x: 23,
        y: 78,
        reactions: [
          "返却口は静か。",
          "指の先だけ冷たい。"
        ],
        delta: { retention: 1 },
        remembered: [{ count: 1, text: "返却口まで確かめた。", priority: 2 }]
      },
      {
        id: "below-machine",
        label: "自販機の下",
        x: 60,
        y: 85,
        reactions: [
          "暗い。ほこりっぽい。",
          "自販機の下に、丸いものが見える。"
        ],
        delta: { approach: 1, retention: 1 },
        remembered: [{ count: 1, text: "自販機の下まで覗いた。", priority: 4 }],
        artifact: [{ count: 2, label: "返ってきた100円", priority: 3 }]
      },
      {
        id: "side-tap",
        label: "横を軽く叩く",
        x: 82,
        y: 64,
        reactions: [
          "コン。軽すぎて、少し恥ずかしい。",
          "もう一回やるほどの理由はない。"
        ],
        delta: { tempo: 1, social: -1 },
        remembered: [{ count: 1, text: "自販機の横をそっと叩いた。", priority: 2 }]
      },
      {
        id: "poster",
        label: "横のポスター",
        x: 14,
        y: 28,
        reactions: [
          "期間限定、の文字だけ少し斜め。",
          "結局、欲しかったのはこれじゃない。"
        ],
        delta: { structure: -1, tempo: -1 },
        remembered: [{ count: 1, text: "関係ないポスターまで見ていた。", priority: 1 }]
      },
      {
        id: "presence-3",
        label: "背後をかすめる気配",
        x: 92,
        y: 16,
        reactions: ["ｻｯ"],
        delta: { approach: 1 },
        remembered: [{ count: 1, text: "帰る前にも、気配を見た。", priority: 0 }],
        hidden: true
      }
    ]
  }
];

export const encounterChoices = ["近づく", "手を出す", "しゃがんで待つ", "そのまま見る"];
