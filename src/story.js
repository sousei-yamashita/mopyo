export const scenes = [
  {
    eyebrow: "いつもの帰り道 17:08",
    title: "パン屋の角に、夕方の匂いが残っている。",
    text: "家まではあと十分。信号が変わるまで、買い物袋が足もとでかすかに鳴る。",
    choices: [
      { label: "青になる前に細い角を曲がる", hint: "車の来ない道を抜ける", delta: { approach: 1, tempo: 1 } },
      { label: "店先で信号をひとつ待つ", hint: "焼きたての匂いを吸い込む", delta: { tempo: -1, structure: -1 } },
      { label: "横断歩道をいつもどおり渡る", hint: "白い線をたどって帰る", delta: { structure: 1, social: -1 } }
    ]
  },
  {
    eyebrow: "二つ目の電柱",
    title: "見慣れた掲示板が、少し低い。",
    text: "昨日までは目の高さだったはずなのに、今日は膝のあたりで町内地図が揺れている。",
    choices: [
      { label: "しゃがんで地図を読み直す", hint: "現在地の赤い印を探す", delta: { social: 1, approach: 1 } },
      { label: "揺れが止まるまで足を止める", hint: "紙の擦れる音を聞く", delta: { social: 1, tempo: -1 } },
      { label: "数歩進んでから見返す", hint: "高さを遠目に確かめる", delta: { social: -1, approach: -1 } }
    ]
  },
  {
    eyebrow: "住宅街の途中",
    title: "クリーニング店の前を、同じ自転車が三度通る。",
    text: "乗っている人の顔は毎回違う。それでも前かごの長ねぎだけは、同じ角度で揺れている。",
    choices: [
      { label: "店のガラス越しに見送る", hint: "映り込みと自転車を重ねる", delta: { structure: 1, social: 1 } },
      { label: "次の角まで後を追う", hint: "長ねぎの先を目印にする", delta: { tempo: 1, approach: 1 } },
      { label: "軒先のメニューを眺めて待つ", hint: "もう一度通るか数える", delta: { tempo: -1, social: -1 } }
    ]
  },
  {
    eyebrow: "薄暗い路地",
    title: "塀の向こうで、こちらと同じ歩数が止まる。",
    text: "足音はしない。ただ、歩くたびに生け垣の葉が一枚ずつ裏返ってついてくる。",
    choices: [
      { label: "塀に耳を寄せて一歩だけ進む", hint: "向こうの気配と歩調を合わせる", delta: { approach: 1, tempo: -1 } },
      { label: "生け垣の切れ目をのぞく", hint: "葉の裏側を目で追う", delta: { approach: 1, tempo: 1 } },
      { label: "裏返った葉を一枚だけ覚える", hint: "塀から離れて先へ進む", delta: { approach: -1, retention: 1 } }
    ]
  },
  {
    eyebrow: "路地の出口",
    title: "ポケットの中に、入れた覚えのないものがある。",
    text: "指先で探ると三つの感触がする。手を引き抜いたとき、残っていたのはひとつだけだった。",
    identity: true,
    choices: [
      { label: "歯のない鍵をつまみ出す", hint: "掌に冷たい重さが残る", artifact: "歯のない鍵", icon: "⌑", delta: { retention: 1 } },
      { label: "鳴らない鈴を握ってみる", hint: "音の代わりに微かな震えが残る", artifact: "鳴らない鈴", icon: "◌", delta: { social: 1 } },
      { label: "穴のあいた石を光にかざす", hint: "穴の向こうだけが薄青く見える", artifact: "穴のあいた石", icon: "●", delta: { approach: 1 } }
    ]
  },
  {
    eyebrow: "家まであと一つ角 17:19",
    title: "曲がり角の先で、誰かが息を整えている。",
    text: "影だけが道へ長く伸びている。手元の拾いものは、さっきより少しだけ温かい。",
    choices: [
      { label: "角の手前で立ち止まる", hint: "影が動き出すのを待つ", delta: { approach: 1, structure: 1 } },
      { label: "足音を立てて角へ近づく", hint: "こちらの居場所を先に知らせる", delta: { tempo: 1, structure: 1 } },
      { label: "拾いものを握って歩き続ける", hint: "影を見ないまま角を曲がる", delta: { approach: -1, retention: 1 } }
    ]
  }
];

export const encounterChoices = ["近づく", "手を出す", "しゃがんで待つ", "そのまま見る"];
