let currentBgm = null;

export function playBgm(filePath) {
  stopBgm();

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
