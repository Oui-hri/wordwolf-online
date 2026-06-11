// =========================
// audio.js
// BGM・効果音管理
// =========================

let currentBgm = null;

// =========================
// BGM再生
// =========================
export function playBgm(filePath) {

  console.log("再生する曲:", filePath);

  stopBgm();

  // 討論・投票・結果画面で遠吠え
  if (
    filePath.includes("討論中.mp3") ||
    filePath.includes("投票結果.mp3") ||
    filePath.includes("ウルフ勝利.mp3") ||
    filePath.includes("市民勝利.mp3")
  ) {
    playSe("./js/audio/se/オオカミの遠吠え.mp3");
  }

  currentBgm = new Audio(filePath);
  currentBgm.loop = true;
  currentBgm.volume = 0.5;

  currentBgm.play().catch((error) => {
    console.log("BGM再生失敗", error);
  });
}

// =========================
// BGM停止
// =========================
export function stopBgm() {
  if (!currentBgm) return;

  currentBgm.pause();
  currentBgm.currentTime = 0;
  currentBgm = null;
}

// =========================
// 効果音再生
// =========================
export function playSe(filePath) {

  console.log("SE再生開始", filePath);

  const se = new Audio(filePath);

  se.volume = 0.8;

  se.play()
    .then(() => {
      console.log("SE再生成功");
    })
    .catch((error) => {
      console.log("SE再生失敗", error);
    });
}

// =========================
// 全ボタン共通SE
// =========================
document.addEventListener("click", (e) => {

  const button = e.target.closest("button");

  if (!button) return;

  console.log("ボタン押した");

  playSe("./js/audio/se/決定ボタンを押す7.mp3");

});

