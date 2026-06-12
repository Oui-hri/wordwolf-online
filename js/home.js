// =========================
// Home画面：雲の現在位置を固定
// =========================

(() => {
  const titleScreen = document.querySelector("#title-screen");

  if (!titleScreen) {
    return;
  }

  let lockedWidth = window.innerWidth;

  function waitForImages() {
    const images = titleScreen.querySelectorAll("img");

    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });

    return Promise.all(imagePromises);
  }

  function unlockHomeFogPosition() {
    const fogs = titleScreen.querySelectorAll(".home-fog");

    fogs.forEach((fog) => {
      fog.classList.remove("fog-position-locked");
      fog.style.removeProperty("--fog-lock-top");
    });
  }

  function lockHomeFogPosition() {
    const fogs = titleScreen.querySelectorAll(".home-fog");

    if (!fogs.length) {
      return;
    }

    // いったん元のCSS状態に戻す
    unlockHomeFogPosition();

    requestAnimationFrame(() => {
      const titleTop = titleScreen.getBoundingClientRect().top;

      fogs.forEach((fog) => {
        const fogTop = fog.getBoundingClientRect().top - titleTop;

        fog.style.setProperty("--fog-lock-top", `${fogTop}px`);
        fog.classList.add("fog-position-locked");
      });

      lockedWidth = window.innerWidth;
    });
  }

  window.addEventListener("load", async () => {
    await waitForImages();

    lockHomeFogPosition();

    // 画像・フォント読み込み後のズレ対策
    setTimeout(lockHomeFogPosition, 100);
    setTimeout(lockHomeFogPosition, 300);
  });

  window.addEventListener("resize", () => {
    const currentWidth = window.innerWidth;

    // 高さ変更では再計算しない
    // 幅が変わった時だけ、その幅のCSS状態で固定し直す
    if (currentWidth !== lockedWidth) {
      lockHomeFogPosition();
    }
  });
})();
