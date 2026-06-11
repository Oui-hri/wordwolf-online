let currentBgm = null;

export function playBgm(filePath) {
  stopBgm();

  // 画面切り替えSE：討論・投票・結果だけ遠吠え
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

export function stopBgm() {
  if (!currentBgm) return;

  currentBgm.pause();
  currentBgm.currentTime = 0;
  currentBgm = null;
}

export function playSe(filePath) {
  const se = new Audio(filePath);
  se.volume = 0.8;

  se.play().catch((error) => {
    console.log("SE再生失敗", error);
  });
}

// すべてのボタンに決定音を自動で付ける
document.addEventListener("click", (e) => {
  const button = e.target.closest("button");

  if (!button) return;

  playSe("./js/audio/se/決定ボタンを押す7.mp3");
});
